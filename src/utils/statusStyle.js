/**
 * Returns an inline style object for a status <select> pill
 * based on the current status value.
 */
export const getStatusStyle = (status) => {
    const s = (status || '').toUpperCase();

    const base = {
        border: 'none',
        outline: 'none',
        cursor: 'pointer',
        appearance: 'auto',
        padding: '4px 18px 4px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '700',
        textTransform: 'uppercase',
        textAlign: 'center',
        display: 'inline-block',
        minWidth: '100px',
    };

    // Green — fully settled / delivered / accepted
    if (['PAID', 'COMPLETED', 'RECEIVED', 'CLEARED', 'ACCEPTED'].includes(s))
        return { ...base, background: '#f1f5f9', color: '#334155' };

    // Orange / Yellow — partial or mid-state
    if (['PARTIAL', 'PARTIALLY_PAID', 'PARTIALLY PAID'].includes(s))
        return { ...base, background: '#fff7ed', color: '#ea580c' };

    // Red — unpaid, overdue, cancelled, declined, bounced, rejected
    if (['UNPAID', 'PENDING', 'OVERDUE', 'BOUNCED', 'REJECTED', 'DECLINED'].includes(s))
        return { ...base, background: '#fee2e2', color: '#dc2626' };

    // Red (same) for cancelled
    if (s === 'CANCELLED')
        return { ...base, background: '#fef2f2', color: '#dc2626' };

    // Blue — draft
    if (s === 'DRAFT')
        return { ...base, background: '#eff6ff', color: '#3b82f6' };

    // Dark teal/green — sent
    if (s === 'SENT')
        return { ...base, background: '#f8fafc', color: '#334155' };

    // Gray — expired
    if (s === 'EXPIRED')
        return { ...base, background: '#f3f4f6', color: '#6b7280' };

    // Default neutral
    return { ...base, background: '#f1f5f9', color: '#475569' };
};
