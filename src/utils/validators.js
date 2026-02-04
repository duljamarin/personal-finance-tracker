/**
 * Reusable validation functions
 */

export const validators = {
  /**
   * Validates that a value is not empty
   */
  required: (value, message = 'This field is required') => {
    return !value?.toString().trim() ? message : undefined;
  },

  /**
   * Validates minimum length
   */
  minLength: (value, min, message) => {
    return value?.length < min ? message : undefined;
  },

  /**
   * Validates that a value is a positive number
   */
  positiveNumber: (value, message = 'Must be a positive number') => {
    return isNaN(value) || Number(value) <= 0 ? message : undefined;
  },

  /**
   * Validates email format
   */
  email: (value, message = 'Invalid email format') => {
    return !/\S+@\S+\.\S+/.test(value) ? message : undefined;
  },

  /**
   * Validates minimum value
   */
  min: (value, min, message) => {
    return Number(value) < min ? message : undefined;
  },

  /**
   * Validates maximum value
   */
  max: (value, max, message) => {
    return Number(value) > max ? message : undefined;
  },
};

/**
 * Validates a field against multiple validation rules
 * @param {any} value - The value to validate
 * @param {Array<Function>} rules - Array of validation functions
 * @returns {string|undefined} Error message or undefined if valid
 */
export function validateField(value, rules) {
  for (const rule of rules) {
    const error = rule(value);
    if (error) return error;
  }
  return undefined;
}

/**
 * Validates an entire form object
 * @param {object} values - Form values
 * @param {object} schema - Validation schema { fieldName: [rules] }
 * @returns {object} Object with field errors
 */
export function validateForm(values, schema) {
  const errors = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const error = validateField(values[field], rules);
    if (error) {
      errors[field] = error;
    }
  }
  
  return errors;
}
