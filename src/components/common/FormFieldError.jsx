import React from 'react';

/**
 * Reusable inline error message component.
 * Displays below the field when an error is present.
 */
export const FormFieldError = ({ error, style = {} }) => {
    if (!error) return null;
    return (
        <span className="field-error-message" role="alert" style={style}>
            {error}
        </span>
    );
};

export default FormFieldError;
