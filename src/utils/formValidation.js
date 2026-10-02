import toast from 'react-hot-toast';

/**
 * Validates a form values object against an array of field rules.
 * 
 * Each rule can have:
 * - name: string (field name in values object)
 * - label: string (human-readable label, e.g. "Customer Name")
 * - required?: boolean (default: true)
 * - type?: 'string' | 'email' | 'phone' | 'number' | 'array' | 'custom'
 * - minLength?: number
 * - customValidator?: (value, allValues) => string | null (returns error message string if invalid)
 * - message?: string (custom error message override)
 */
export const validateRequiredFields = (rules, values) => {
    const errors = {};
    let firstError = null;

    for (const rule of rules) {
        const fieldName = rule.name || rule.field;
        const {
            label = rule.label || fieldName,
            required = true,
            type = 'string',
            customValidator,
            message
        } = rule;
        const name = fieldName;

        const rawValue = (values && name) ? values[name] : undefined;
        let isFieldEmpty = false;

        if (rawValue === undefined || rawValue === null) {
            isFieldEmpty = true;
        } else if (typeof rawValue === 'string') {
            isFieldEmpty = rawValue.trim() === '';
        } else if (Array.isArray(rawValue)) {
            isFieldEmpty = rawValue.length === 0;
        } else if (type === 'number') {
            isFieldEmpty = isNaN(rawValue) || rawValue === '';
        }

        if (required && isFieldEmpty) {
            const errorMsg = message || `Please provide the ${label}.`;
            errors[name] = errorMsg;
            if (!firstError) {
                firstError = { name, label, message: errorMsg };
            }
            continue;
        }

        // Field is not empty, run type validations if applicable
        if (!isFieldEmpty) {
            if (type === 'email' && typeof rawValue === 'string') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(rawValue.trim())) {
                    const errorMsg = `Please enter a valid email address for ${label}.`;
                    errors[name] = errorMsg;
                    if (!firstError) {
                        firstError = { name, label, message: errorMsg };
                    }
                    continue;
                }
            }

            if (type === 'phone' && typeof rawValue === 'string') {
                const cleanedPhone = rawValue.replace(/\D/g, '');
                if (cleanedPhone.length !== 10) {
                    const errorMsg = `${label} must be exactly 10 digits.`;
                    errors[name] = errorMsg;
                    if (!firstError) {
                        firstError = { name, label, message: errorMsg };
                    }
                    continue;
                }
            }

            if (customValidator && typeof customValidator === 'function') {
                const customError = customValidator(rawValue, values);
                if (customError) {
                    errors[name] = customError;
                    if (!firstError) {
                        firstError = { name, label, message: customError };
                    }
                    continue;
                }
            }
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
        firstError
    };
};

/**
 * Smoothly scrolls to and focuses the element corresponding to the field name.
 * Supports standard inputs, select, textarea, custom buttons (like SearchableSelect trigger),
 * and elements inside scrollable modal bodies.
 */
export const focusAndScrollToError = (fieldName, container = document) => {
    if (!fieldName) return;

    // Small delay to allow any modal or state updates to settle
    setTimeout(() => {
        const root = container || document;
        const selectorCandidates = [
            `[data-field="${fieldName}"]`,
            `[name="${fieldName}"]`,
            `#${fieldName}`,
            `[data-testid="${fieldName}"]`,
            `.field-${fieldName}`
        ];

        let targetEl = null;
        for (const selector of selectorCandidates) {
            const el = root.querySelector(selector);
            if (el) {
                targetEl = el;
                break;
            }
        }

        if (targetEl) {
            // Scroll into view (centered within its scrollable container or modal)
            targetEl.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });

            // Focusable element resolution
            const isFocusable = (el) =>
                el && (
                    el.tagName === 'INPUT' ||
                    el.tagName === 'SELECT' ||
                    el.tagName === 'TEXTAREA' ||
                    el.tagName === 'BUTTON' ||
                    el.hasAttribute('tabindex')
                );

            if (isFocusable(targetEl)) {
                targetEl.focus({ preventScroll: true });
            } else {
                const childInput = targetEl.querySelector('input, select, textarea, button, [tabindex]');
                if (childInput && isFocusable(childInput)) {
                    childInput.focus({ preventScroll: true });
                }
            }
        }
    }, 60);
};

/**
 * High-level form validation runner:
 * - Runs validation rules
 * - Sets component error state
 * - Shows toast error for the first invalid field
 * - Automatically scrolls to and focuses the first invalid field
 * - Returns boolean: true if valid, false if invalid
 */
export const executeFormValidation = (rules, values, setErrors, options = {}) => {
    const { isValid, errors, firstError } = validateRequiredFields(rules, values);

    if (!isValid) {
        if (typeof setErrors === 'function') {
            setErrors(errors);
        }
        if (firstError) {
            toast.error(firstError.message);
            focusAndScrollToError(firstError.name, options.container);
        }
        return false;
    }

    if (typeof setErrors === 'function') {
        setErrors({});
    }
    return true;
};

/**
 * Helper to remove an error from state when the user modifies that field
 */
export const clearFieldError = (fieldName, setErrors) => {
    if (typeof setErrors === 'function') {
        setErrors(prev => {
            if (!prev || !prev[fieldName]) return prev;
            const updated = { ...prev };
            delete updated[fieldName];
            return updated;
        });
    }
};
