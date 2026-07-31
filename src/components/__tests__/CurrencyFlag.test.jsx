import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import CurrencyFlag from '../UI/CurrencyFlag.jsx';

const CODES = ['EUR', 'USD', 'GBP', 'ALL', 'CHF', 'JPY', 'CAD', 'AUD'];

describe('CurrencyFlag', () => {
  it.each(CODES)('renders %s without warnings', (code) => {
    const { container } = render(<CurrencyFlag code={code} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('aria-label')).toBe(code);
    // Generated markup must be real SVG, not an empty shell.
    expect(svg.innerHTML.length).toBeGreaterThan(50);
  });

  it('renders nothing for an unknown code', () => {
    const { container } = render(<CurrencyFlag code="XYZ" />);
    expect(container.querySelector('svg')).toBeNull();
  });

  // Duplicate ids across flags would make markers/clips resolve to the wrong
  // element when several are on screen at once.
  it('namespaces ids so multiple flags can coexist', () => {
    const { container } = render(
      <div>{CODES.map((c) => <CurrencyFlag key={c} code={c} />)}</div>
    );
    const ids = [...container.querySelectorAll('[id]')].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
