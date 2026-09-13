/**
 * Unified calculation source for Invoices (Normal, Combined, PDF, Preview, and Public View).
 * 
 * Rules:
 * gross = qty * rate
 * lineDiscount = saved line-item discount
 * net = gross - lineDiscount
 * vat = net * applicable VAT rate
 * No VAT: vat = 0
 * 
 * Subtotal = sum(gross)
 * Discount = sum(lineDiscount)
 * Taxable/Net Amount = sum(net)
 * VAT = sum(line VAT)
 * Total = sum(net) + sum(VAT) + explicit other charges/round-off
 * Balance Due = Total - Payments Received
 * 
 * VAT Summary groups POST-DISCOUNT net values by exact VAT rate.
 * Reconciliation equation:
 * Subtotal - Discount + VAT + Other Charges + Round Off = Total
 */

/**
 * Validate discount value against discount type.
 * Returns { valid: boolean, error?: string }
 */
export const validateDiscount = (discount, discountType = 'percentage') => {
    const val = parseFloat(discount);
    if (isNaN(val)) return { valid: true };
    const isPct = discountType === 'percentage' || !discountType;
    if (isPct && val > 100) {
        return { valid: false, error: 'Discount percentage cannot exceed 100%' };
    }
    if (val < 0) {
        return { valid: false, error: 'Discount cannot be negative' };
    }
    return { valid: true };
};

export const computeInvoiceLine = (item, meta = null) => {
    const qty = parseFloat(
        item.quantity !== undefined && item.quantity !== null
            ? item.quantity
            : (item.qty !== undefined && item.qty !== null ? item.qty : 1)
    ) || 0;

    const rate = parseFloat(
        item.rate !== undefined && item.rate !== null
            ? item.rate
            : (item.price !== undefined && item.price !== null ? item.price : 0)
    ) || 0;

    const gross = qty * rate;

    const discType = meta?.discountType
        || item.discountType
        || (item.discount > 0 && item.discount <= 100 && item.discountAmount !== undefined && (Math.abs((gross * item.discount) / 100 - item.discountAmount) < 0.01) ? 'percentage' : 'fixed');

    const rawDiscVal = meta?.discount !== undefined && meta?.discount !== null
        ? parseFloat(meta.discount)
        : (item.discountValue !== undefined && item.discountValue !== null
            ? parseFloat(item.discountValue)
            : (item.discount !== undefined && item.discount !== null ? parseFloat(item.discount) : 0));
    const discVal = isNaN(rawDiscVal) ? 0 : rawDiscVal;

    const isDiscountOver100 = (discType === 'percentage' || !discType) && discVal > 100;
    const clampedDiscVal = (discType === 'percentage' || !discType) ? Math.min(100, Math.max(0, discVal)) : Math.max(0, discVal);

    let lineDiscount = 0;
    if (discType === 'fixed' || discType === 'amount') {
        lineDiscount = Math.min(gross, clampedDiscVal);
    } else {
        lineDiscount = (gross * clampedDiscVal) / 100;
    }
    lineDiscount = Math.min(gross, Math.max(0, lineDiscount));

    const net = Math.max(0, gross - lineDiscount);

    const taxRate = parseFloat(
        item.taxRate !== undefined && item.taxRate !== null && item.taxRate !== ''
            ? item.taxRate
            : (item.tax !== undefined && item.tax !== null && item.tax !== '' ? item.tax : (meta?.taxRate || 0))
    ) || 0;

    const vat = taxRate > 0 ? (net * taxRate) / 100 : 0;

    return {
        qty,
        rate,
        gross,
        lineDiscount,
        discVal,
        discType,
        net,
        taxRate,
        vat,
        taxName: item.taxName || meta?.taxName || '',
        isDiscountOver100
    };
};

export const computeInvoiceFinancials = (itemsOrInvoice = [], options = {}) => {
    let rawItems = [];
    let itemsMeta = options.itemsMeta || [];
    let otherCharges = options.otherCharges !== undefined ? options.otherCharges : 0;
    let roundOff = options.roundOff !== undefined ? options.roundOff : 0;
    let paymentsReceived = options.paymentsReceived !== undefined ? options.paymentsReceived : 0;
    let sourceInv = null;

    if (itemsOrInvoice && !Array.isArray(itemsOrInvoice) && typeof itemsOrInvoice === 'object') {
        sourceInv = itemsOrInvoice;
        rawItems = sourceInv.invoiceitem || sourceInv.posinvoiceitem || sourceInv.items || [];

        let cfData = {};
        if (sourceInv.customFields) {
            try {
                cfData = typeof sourceInv.customFields === 'string' ? JSON.parse(sourceInv.customFields) : sourceInv.customFields;
            } catch (e) {
                cfData = {};
            }
        }
        if (!options.itemsMeta && Array.isArray(cfData?._itemsDiscountMeta)) {
            itemsMeta = cfData._itemsDiscountMeta;
        }
        if (options.otherCharges === undefined) {
            otherCharges = Array.isArray(cfData?._otherCharges)
                ? cfData._otherCharges
                : (parseFloat(sourceInv.otherCharges || 0) || 0);
        }
        if (options.roundOff === undefined) {
            roundOff = parseFloat(sourceInv.roundOffAmount || 0) || 0;
        }
        if (options.paymentsReceived === undefined) {
            let paid = parseFloat(sourceInv.paidAmount !== undefined && sourceInv.paidAmount !== null ? sourceInv.paidAmount : 0) || 0;
            if (Array.isArray(sourceInv.receipt) && sourceInv.receipt.length > 0) {
                const recSum = sourceInv.receipt.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
                if (recSum > paid) paid = recSum;
            } else if (Array.isArray(sourceInv.allocations) && sourceInv.allocations.length > 0) {
                const allocSum = sourceInv.allocations.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
                if (allocSum > paid) paid = allocSum;
            }
            paymentsReceived = paid;
        }
    } else if (Array.isArray(itemsOrInvoice)) {
        rawItems = itemsOrInvoice;
    }

    let subtotal = 0;
    let discount = 0;
    let taxableAmount = 0;
    let vatTotal = 0;
    const computedLines = [];
    const groups = {};

    if (rawItems.length > 0) {
        rawItems.forEach((item, idx) => {
            const meta = (Array.isArray(itemsMeta) && (itemsMeta[idx] || itemsMeta.find(m =>
                (m.productId && String(m.productId) === String(item.productId)) ||
                (m.serviceId && String(m.serviceId) === String(item.serviceId))
            ))) || null;

            const line = computeInvoiceLine(item, meta);
            computedLines.push({
                ...item,
                ...line
            });

            subtotal += line.gross;
            discount += line.lineDiscount;
            taxableAmount += line.net;
            vatTotal += line.vat;

            const rateKey = line.taxRate.toFixed(2);
            if (!groups[rateKey]) {
                groups[rateKey] = {
                    rate: line.taxRate,
                    vatAmount: 0,
                    netAmount: 0
                };
            }
            groups[rateKey].netAmount += line.net;
            groups[rateKey].vatAmount += line.vat;
        });
    } else if (sourceInv) {
        subtotal = parseFloat(sourceInv.subtotal || 0) || 0;
        discount = parseFloat(sourceInv.discountAmount || 0) || 0;
        taxableAmount = Math.max(0, subtotal - discount);
        vatTotal = parseFloat(sourceInv.taxAmount || 0) || 0;
    }

    let explicitOtherCharges = 0;
    if (typeof otherCharges === 'number') {
        explicitOtherCharges = otherCharges;
    } else if (Array.isArray(otherCharges)) {
        explicitOtherCharges = otherCharges.reduce((sum, c) => {
            const val = parseFloat(c.value !== undefined ? c.value : (c.amount !== undefined ? c.amount : 0)) || 0;
            const isPct = c.chargeType === 'percentage' || c.type === 'percentage';
            const amt = isPct ? ((taxableAmount + vatTotal) * val) / 100 : val;
            return sum + amt;
        }, 0);
    }

    const explicitRoundOff = parseFloat(roundOff) || 0;
    const explicitPayments = parseFloat(paymentsReceived) || 0;

    const total = taxableAmount + vatTotal + explicitOtherCharges + explicitRoundOff;
    const balanceDue = Math.max(0, total - explicitPayments);

    // Internal reconciliation check:
    // Subtotal - Discount + VAT + Other Charges + Round Off = Total
    const reconciledEquationVal = subtotal - discount + vatTotal + explicitOtherCharges + explicitRoundOff;
    const reconciliationDiscrepancy = Math.abs(reconciledEquationVal - total);
    if (reconciliationDiscrepancy > 0.01) {
        console.error('[Invoice Financials Reconciliation Bug Detected!]', {
            subtotal,
            discount,
            taxableAmount,
            vatTotal,
            explicitOtherCharges,
            explicitRoundOff,
            total,
            reconciledEquationVal,
            reconciliationDiscrepancy
        });
    }

    let vatSummaryList = Object.values(groups).sort((a, b) => b.rate - a.rate);
    if (vatSummaryList.length === 0 && (vatTotal > 0 || taxableAmount > 0)) {
        const defaultRate = taxableAmount > 0 ? (vatTotal / taxableAmount) * 100 : 23;
        vatSummaryList = [{
            rate: defaultRate,
            vatAmount: vatTotal,
            netAmount: taxableAmount
        }];
    }

    return {
        subtotal,
        discount,
        taxableAmount,
        vatTotal,
        otherCharges: explicitOtherCharges,
        roundOff: explicitRoundOff,
        total,
        paidAmount: explicitPayments,
        balanceDue,
        vatSummaryList,
        computedLines,
        isReconciled: reconciliationDiscrepancy <= 0.01
    };
};
