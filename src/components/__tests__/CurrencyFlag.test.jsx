import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import CurrencyFlag from '../UI/CurrencyFlag.jsx';

const CODES = ['EUR', 'USD', 'GBP', 'ALL', 'CHF', 'JPY', 'CAD', 'AUD'];

describe('CurrencyFlag', () => {
  it.each(CODES)('points at the %s asset', (code) => {
    const { container } = render(<CurrencyFlag code={code} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe(`/currency-flags/${code}.svg`);
    // Explicit dimensions keep the sidebar from reflowing as flags load.
    expect(img.getAttribute('width')).toBe('16');
    expect(img.getAttribute('height')).toBe('12');
  });

  it('renders nothing for an unknown code', () => {
    const { container } = render(<CurrencyFlag code="XYZ" />);
    expect(container.querySelector('img')).toBeNull();
  });

  // The adjacent text already names the currency; the image must not repeat it.
  it('is decorative for screen readers', () => {
    const { container } = render(<CurrencyFlag code="ALL" />);
    const img = container.querySelector('img');
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('aria-hidden')).toBe('true');
  });
});
