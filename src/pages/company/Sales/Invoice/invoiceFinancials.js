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

export const buildCombinedPaymentHistory = (childInvoices = [], combinedTotal = 0) => {
    const rawItems = [];

    childInvoices.forEach(childInv => {
        if (Array.isArray(childInv.allocations) && childInv.allocations.length > 0) {
            childInv.allocations.forEach(a => {
                rawItems.push({
                    ...a,
                    invoiceId: childInv.id,
                    invoiceNumber: childInv.invoiceNumber
                });
            });
        } else if (Array.isArray(childInv.receipt) && childInv.receipt.length > 0) {
            childInv.receipt.forEach(r => {
                rawItems.push({
                    id: r.id,
                    receiptId: r.id,
                    invoiceId: childInv.id,
                    invoiceNumber: childInv.invoiceNumber,
                    amount: r.amount,
                    balanceBeforePayment: r.balanceBeforePayment,
                    balanceAfterPayment: r.balanceAfterPayment,
                    receipt: r
                });
            });
        }
    });

    if (rawItems.length === 0) return { allAllocations: [], paymentHistory: [], totalPaid: 0 };

    // Group allocations by receipt transaction
    const receiptMap = new Map();
    rawItems.forEach(item => {
        const r = item.receipt || item;
        const key = r.receiptNumber && r.receiptNumber !== '-' ? r.receiptNumber : (r.id ? `ID-${r.id}` : `ALLOC-${item.id || Math.random()}`);
        if (!receiptMap.has(key)) {
            receiptMap.set(key, {
                id: r.id || item.receiptId,
                receiptNumber: r.receiptNumber || (item.receiptId ? `RCV-${item.receiptId}` : '-'),
                date: r.date || item.createdAt,
                amount: 0,
                paymentMode: r.paymentMode || item.paymentMode || 'BANK',
                referenceNumber: r.referenceNumber || item.referenceNumber,
                cashBankAccount: r.cashBankAccount || item.cashBankAccount,
                notes: r.notes || item.notes
            });
        }
        const entry = receiptMap.get(key);
        entry.amount = parseFloat((entry.amount + (parseFloat(item.amount) || 0)).toFixed(2));
        if (!entry.date && (r.date || item.createdAt)) entry.date = r.date || item.createdAt;
        if ((!entry.paymentMode || entry.paymentMode === 'BANK') && (r.paymentMode || item.paymentMode)) {
            entry.paymentMode = r.paymentMode || item.paymentMode;
        }
    });

    const sortedPayments = Array.from(receiptMap.values()).sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    let runningPaid = 0;
    const paymentHistory = sortedPayments.map(pmt => {
        runningPaid = parseFloat((runningPaid + pmt.amount).toFixed(2));
        const balAfter = Math.max(0, parseFloat((combinedTotal - runningPaid).toFixed(2)));
        return {
            ...pmt,
            balanceAfterPayment: balAfter
        };
    });

    return {
        allAllocations: rawItems,
        paymentHistory,
        totalPaid: runningPaid
    };
};

export const computeInvoiceFinancials = (itemsOrInvoice = [], options = {}) => {
    // 1. Check if this is a Combined Invoice
    const isCombined = Boolean(
        options.isCombined ||
        (itemsOrInvoice && typeof itemsOrInvoice === 'object' && !Array.isArray(itemsOrInvoice) && (
            itemsOrInvoice.isCombined ||
            (Array.isArray(itemsOrInvoice.invoices) && itemsOrInvoice.invoices.length > 0) ||
            (typeof itemsOrInvoice.id === 'string' && (itemsOrInvoice.id.toLowerCase().startsWith('combined-') || itemsOrInvoice.id.toLowerCase().includes('combined'))) ||
            (typeof itemsOrInvoice.invoiceNumber === 'string' && (itemsOrInvoice.invoiceNumber.toLowerCase().startsWith('combined-') || itemsOrInvoice.invoiceNumber.toLowerCase().includes('combined')))
        ))
    );

    if (isCombined && itemsOrInvoice && typeof itemsOrInvoice === 'object' && Array.isArray(itemsOrInvoice.invoices) && itemsOrInvoice.invoices.length > 0) {
        const childInvoices = itemsOrInvoice.invoices;
        let subtotal = 0;
        let discount = 0;
        let taxableAmount = 0;
        let vatTotal = 0;
        let explicitOtherCharges = 0;
        let explicitRoundOff = 0;
        let total = 0;
        const computedLines = [];
        const groups = {};

        // Aggregate constituent child invoices
        childInvoices.forEach(childInv => {
            const childFin = computeInvoiceFinancials(childInv, options);
            subtotal += childFin.subtotal;
            discount += childFin.discount;
            taxableAmount += childFin.taxableAmount;
            vatTotal += childFin.vatTotal;
            explicitOtherCharges += childFin.otherCharges;
            explicitRoundOff += childFin.roundOff;
            total += childFin.total;

            computedLines.push(...childFin.computedLines);

            // Merge VAT summaries
            (childFin.vatSummaryList || []).forEach(vat => {
                const rateKey = parseFloat(vat.rate || 0).toFixed(2);
                if (!groups[rateKey]) {
                    groups[rateKey] = {
                        rate: parseFloat(vat.rate || 0),
                        vatAmount: 0,
                        netAmount: 0
                    };
                }
                groups[rateKey].vatAmount += vat.vatAmount;
                groups[rateKey].netAmount += vat.netAmount;
            });
        });

        // Round aggregate figures
        subtotal = parseFloat(subtotal.toFixed(2));
        discount = parseFloat(discount.toFixed(2));
        taxableAmount = parseFloat(taxableAmount.toFixed(2));
        vatTotal = parseFloat(vatTotal.toFixed(2));
        explicitOtherCharges = parseFloat(explicitOtherCharges.toFixed(2));
        explicitRoundOff = parseFloat(explicitRoundOff.toFixed(2));
        total = parseFloat(total.toFixed(2));

        // Build Payment History from actual allocations across the included child invoices
        const { allAllocations, paymentHistory, totalPaid } = buildCombinedPaymentHistory(childInvoices, total);

        let paymentsReceived = totalPaid;
        if (options.paymentsReceived !== undefined) {
            paymentsReceived = parseFloat(options.paymentsReceived) || 0;
        } else if (paymentsReceived === 0 && itemsOrInvoice.paidAmount !== undefined && itemsOrInvoice.paidAmount !== null) {
            paymentsReceived = parseFloat(itemsOrInvoice.paidAmount) || 0;
        }

        const balanceDue = Math.max(0, parseFloat((total - paymentsReceived).toFixed(2)));

        const isDuePassed = Boolean(itemsOrInvoice.dueDate && new Date(itemsOrInvoice.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0));
        const tol = 0.01;
        let status = 'UNPAID';
        if (balanceDue <= tol && (total > 0 || paymentsReceived > 0)) {
            status = 'PAID';
        } else if (balanceDue <= tol && total === 0) {
            status = 'PAID';
        } else if (paymentsReceived > tol && balanceDue > tol) {
            status = 'PARTIALLY PAID';
        } else if (balanceDue > tol && isDuePassed) {
            status = 'OVERDUE';
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
            paidAmount: paymentsReceived,
            balanceDue,
            vatSummaryList,
            computedLines,
            paymentHistory,
            allAllocations,
            status,
            isCombined: true,
            isReconciled: Math.abs((subtotal - discount + vatTotal + explicitOtherCharges + explicitRoundOff) - total) <= 0.01
        };
    }

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
            let paid = 0;
            const currentInvId = !isNaN(parseInt(sourceInv.id)) ? parseInt(sourceInv.id) : null;
            if (Array.isArray(sourceInv.allocations) && sourceInv.allocations.length > 0) {
                paid = sourceInv.allocations.reduce((s, a) => {
                    if (currentInvId && a.invoiceId && parseInt(a.invoiceId) !== currentInvId) return s;
                    return s + (parseFloat(a.amount) || 0);
                }, 0);
            } else if (sourceInv.paidAmount !== undefined && sourceInv.paidAmount !== null) {
                paid = parseFloat(sourceInv.paidAmount) || 0;
            } else if (Array.isArray(sourceInv.receipt) && sourceInv.receipt.length > 0) {
                // Only count receipts specifically linked to this invoice or with explicit allocatedAmount / balanceAfterPayment
                paid = sourceInv.receipt.reduce((s, r) => {
                    if (currentInvId && r.invoiceId && parseInt(r.invoiceId) !== currentInvId) return s;
                    if (r.balanceAfterPayment === undefined && (!currentInvId || parseInt(r.invoiceId) !== currentInvId)) return s;
                    const amt = parseFloat(r.allocatedAmount !== undefined ? r.allocatedAmount : r.amount) || 0;
                    return s + amt;
                }, 0);
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

    const total = parseFloat((taxableAmount + vatTotal + explicitOtherCharges + explicitRoundOff).toFixed(2));
    const balanceDue = Math.max(0, parseFloat((total - explicitPayments).toFixed(2)));

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

    const isDuePassed = Boolean(sourceInv?.dueDate && new Date(sourceInv.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0));
    const tol = 0.01;
    let status = 'UNPAID';
    if (explicitPayments > total + tol) {
        status = 'OVERPAID';
    } else if (balanceDue <= tol && (total > 0 || explicitPayments >= total - tol)) {
        status = 'PAID';
    } else if (balanceDue <= tol && total === 0 && explicitPayments === 0) {
        status = 'PAID';
    } else if (explicitPayments > tol && balanceDue > tol) {
        status = 'PARTIALLY PAID';
    } else if (balanceDue > tol && isDuePassed) {
        status = 'OVERDUE';
    } else {
        status = 'UNPAID';
    }

    return {
        subtotal: parseFloat(subtotal.toFixed(2)),
        discount: parseFloat(discount.toFixed(2)),
        taxableAmount: parseFloat(taxableAmount.toFixed(2)),
        vatTotal: parseFloat(vatTotal.toFixed(2)),
        otherCharges: parseFloat(explicitOtherCharges.toFixed(2)),
        roundOff: parseFloat(explicitRoundOff.toFixed(2)),
        total,
        paidAmount: parseFloat(explicitPayments.toFixed(2)),
        balanceDue,
        vatSummaryList,
        computedLines,
        status,
        isCombined: false,
        isReconciled: reconciliationDiscrepancy <= 0.01
    };
};

export const resolveInvoicePaymentHistory = (inv) => {
    if (!inv) return [];

    const isCombined = Boolean(
        inv.isCombined ||
        (Array.isArray(inv.invoices) && inv.invoices.length > 0) ||
        (typeof inv.id === 'string' && (inv.id.toLowerCase().startsWith('combined-') || inv.id.toLowerCase().includes('combined'))) ||
        (typeof inv.invoiceNumber === 'string' && (inv.invoiceNumber.toLowerCase().startsWith('combined-') || inv.invoiceNumber.toLowerCase().includes('combined')))
    );

    if (isCombined && Array.isArray(inv.invoices) && inv.invoices.length > 0) {
        const fin = computeInvoiceFinancials(inv);
        return fin.paymentHistory || [];
    }

    if (Array.isArray(inv.paymentHistory) && inv.paymentHistory.length > 0) {
        return inv.paymentHistory;
    }

    const invTotal = parseFloat(inv.totalAmount || 0);
    const rawItems = [];

    // Add allocations directly present on single invoice
    if (Array.isArray(inv.allocations) && inv.allocations.length > 0) {
        const currentInvId = !isNaN(parseInt(inv.id)) ? parseInt(inv.id) : null;
        inv.allocations.forEach(a => {
            if (currentInvId && a.invoiceId && a.invoiceId !== currentInvId) {
                return;
            }
            rawItems.push(a);
        });
    } else if (Array.isArray(inv.receipt) && inv.receipt.length > 0) {
        const currentInvId = !isNaN(parseInt(inv.id)) ? parseInt(inv.id) : null;
        inv.receipt.forEach(r => {
            if (r.balanceAfterPayment !== undefined || (currentInvId && r.invoiceId && parseInt(r.invoiceId) === currentInvId)) {
                rawItems.push({
                    id: r.id,
                    receiptId: r.id,
                    amount: r.amount,
                    balanceBeforePayment: r.balanceBeforePayment,
                    balanceAfterPayment: r.balanceAfterPayment,
                    receipt: r
                });
            }
        });
    }

    if (rawItems.length === 0) return [];

    // Group allocations by receipt transaction
    const receiptMap = new Map();
    rawItems.forEach(item => {
        const r = item.receipt || item;
        const key = r.receiptNumber && r.receiptNumber !== '-' ? r.receiptNumber : (r.id ? `ID-${r.id}` : `ALLOC-${item.id || Math.random()}`);
        if (!receiptMap.has(key)) {
            receiptMap.set(key, {
                id: r.id || item.receiptId,
                receiptNumber: r.receiptNumber || (item.receiptId ? `RCV-${item.receiptId}` : '-'),
                date: r.date || item.createdAt,
                amount: 0,
                paymentMode: r.paymentMode || item.paymentMode || 'BANK',
                referenceNumber: r.referenceNumber || item.referenceNumber,
                cashBankAccount: r.cashBankAccount || item.cashBankAccount,
                notes: r.notes || item.notes,
                balanceAfterPayment: item.balanceAfterPayment
            });
        }
        const entry = receiptMap.get(key);
        entry.amount = parseFloat((entry.amount + (parseFloat(item.amount) || 0)).toFixed(2));
        if (!entry.date && (r.date || item.createdAt)) entry.date = r.date || item.createdAt;
        if ((!entry.paymentMode || entry.paymentMode === 'BANK') && (r.paymentMode || item.paymentMode)) {
            entry.paymentMode = r.paymentMode || item.paymentMode;
        }
    });

    const sortedPayments = Array.from(receiptMap.values()).sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    let runningPaid = 0;
    return sortedPayments.map(pmt => {
        runningPaid = parseFloat((runningPaid + pmt.amount).toFixed(2));
        const calcBalAfter = Math.max(0, parseFloat((invTotal - runningPaid).toFixed(2)));
        let balAfter = calcBalAfter;
        // For single invoices, preserve the persisted historical database snapshot if present
        if (pmt.balanceAfterPayment !== undefined && pmt.balanceAfterPayment !== null) {
            balAfter = pmt.balanceAfterPayment;
        }
        return {
            ...pmt,
            balanceAfterPayment: balAfter
        };
    });
};

