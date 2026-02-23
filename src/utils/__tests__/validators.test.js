import { describe, it, expect } from 'vitest';
import { validators, validateField, validateForm } from '../validators.js';

describe('validators.required', () => {
  it('returns error message for empty string', () => {
    expect(validators.required('')).toBeTruthy();
  });

  it('returns error message for whitespace-only string', () => {
    expect(validators.required('   ')).toBeTruthy();
  });

  it('returns undefined for non-empty string', () => {
    expect(validators.required('hello')).toBeUndefined();
  });

  it('uses default error message when none provided', () => {
    const result = validators.required('');
    expect(result).toBe('This field is required');
  });

  it('uses custom error message when provided', () => {
    const result = validators.required('', 'Custom error');
    expect(result).toBe('Custom error');
  });
});

describe('validators.positiveNumber', () => {
  it('returns error for zero', () => {
    expect(validators.positiveNumber(0)).toBeTruthy();
  });

  it('returns error for negative number', () => {
    expect(validators.positiveNumber(-5)).toBeTruthy();
  });

  it('returns error for NaN string', () => {
    expect(validators.positiveNumber('abc')).toBeTruthy();
  });

  it('returns undefined for positive number', () => {
    expect(validators.positiveNumber(10)).toBeUndefined();
    expect(validators.positiveNumber(0.01)).toBeUndefined();
  });
});

describe('validators.email', () => {
  it('returns error for invalid email formats', () => {
    expect(validators.email('notanemail')).toBeTruthy();
    expect(validators.email('missing@domain')).toBeTruthy();
    expect(validators.email('@nodomain.com')).toBeTruthy();
  });

  it('returns undefined for valid email', () => {
    expect(validators.email('user@example.com')).toBeUndefined();
    expect(validators.email('test.user+tag@domain.org')).toBeUndefined();
  });
});

describe('validators.minLength', () => {
  it('returns error when value is shorter than minimum', () => {
    expect(validators.minLength('ab', 3, 'Too short')).toBe('Too short');
  });

  it('returns undefined when value meets minimum length', () => {
    expect(validators.minLength('abc', 3, 'Too short')).toBeUndefined();
    expect(validators.minLength('abcd', 3, 'Too short')).toBeUndefined();
  });
});

describe('validateField', () => {
  it('returns first failing rule error', () => {
    const rules = [
      () => undefined,
      () => 'Second error',
      () => 'Third error',
    ];
    expect(validateField('value', rules)).toBe('Second error');
  });

  it('returns undefined when all rules pass', () => {
    const rules = [() => undefined, () => undefined];
    expect(validateField('value', rules)).toBeUndefined();
  });

  it('short-circuits after first error', () => {
    const thirdRule = vi.fn(() => 'Third error');
    const rules = [
      () => undefined,
      () => 'Second error',
      thirdRule,
    ];
    const result = validateField('value', rules);
    expect(result).toBe('Second error');
    // Third rule should not be called after second fails
    expect(thirdRule).not.toHaveBeenCalled();
  });
});

describe('validateForm', () => {
  it('returns all field errors', () => {
    const values = { name: '', email: 'invalid', age: 0 };
    const schema = {
      name: [(v) => (!v ? 'Name required' : undefined)],
      email: [(v) => (!/\S+@\S+\.\S+/.test(v) ? 'Email invalid' : undefined)],
    };
    const errors = validateForm(values, schema);
    expect(errors.name).toBe('Name required');
    expect(errors.email).toBe('Email invalid');
  });

  it('returns empty object when all fields are valid', () => {
    const values = { name: 'John', email: 'john@example.com' };
    const schema = {
      name: [(v) => (!v ? 'Required' : undefined)],
      email: [(v) => (!/\S+@\S+\.\S+/.test(v) ? 'Invalid email' : undefined)],
    };
    const errors = validateForm(values, schema);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('only includes fields with errors', () => {
    const values = { name: 'John', email: '' };
    const schema = {
      name: [(v) => (!v ? 'Required' : undefined)],
      email: [(v) => (!v ? 'Required' : undefined)],
    };
    const errors = validateForm(values, schema);
    expect(errors).not.toHaveProperty('name');
    expect(errors).toHaveProperty('email');
  });
});
