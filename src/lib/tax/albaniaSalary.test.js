import { describe, it, expect } from 'vitest';
import {
  fromGross,
  grossFromNet,
  grossFromEmployerCost,
  incomeTax,
  AVAILABLE_YEARS,
  DEFAULT_YEAR,
} from './albaniaSalary.js';

/**
 * Expected values here were computed by hand from the statutory table,
 * independently of the implementation. They are typed as literals on purpose:
 * generating them by calling the engine would make these tests circular and
 * they would pass against a wrong engine.
 *
 * All assertions run against RAW, UNROUNDED engine output. The engine never
 * rounds; rounding is a display concern.
 */

const Y = 2026;
const TOL = 0.01;

describe('forward: gross → net and employer cost (monthly, ALL)', () => {
  const anchors = [
    { gross: 50000,  net: 44400,       employerCost: 58350 },
    { gross: 55000,  net: 46240,       employerCost: 64185 },
    { gross: 60000,  net: 50030,       employerCost: 70020 },
    { gross: 100000, net: 79700,       employerCost: 116700 },
    { gross: 186416, net: 145203.328,  employerCost: 217547.472 },
    { gross: 200000, net: 156790.48,   employerCost: 231362.4 },
    { gross: 250000, net: 194440.48,   employerCost: 282212.4 },
  ];

  anchors.forEach(({ gross, net, employerCost }) => {
    it(`gross ${gross} → net ${net}, employer cost ${employerCost}`, () => {
      const r = fromGross(gross, Y);
      expect(r.net).toBeCloseTo(net, 2);
      expect(Math.abs(r.net - net)).toBeLessThanOrEqual(TOL);
      expect(Math.abs(r.employerCost - employerCost)).toBeLessThanOrEqual(TOL);
    });
  });
});

describe('component checks at gross 100,000', () => {
  it('income tax is 9100', () => {
    expect(Math.abs(incomeTax(100000, Y) - 9100)).toBeLessThanOrEqual(TOL);
  });

  it('splits into the four statutory components', () => {
    const r = fromGross(100000, Y);
    expect(Math.abs(r.employeeSocial - 9500)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(r.employeeHealth - 1700)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(r.employerSocial - 15000)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(r.employerHealth - 1700)).toBeLessThanOrEqual(TOL);
  });

  it('income tax at the 200,000 checkpoint is 22100 — derived, not hardcoded', () => {
    // If someone replaces the derived low-band term with a literal, this still
    // passes — but the grep in the acceptance criteria catches that. This test
    // pins the VALUE; the grep pins the EXPRESSION.
    expect(Math.abs(incomeTax(200000, Y) - 22100)).toBeLessThanOrEqual(TOL);
  });
});

describe('cap asymmetry: social is capped, health is NOT', () => {
  /**
   * This is the whole point of socialBase() vs healthBase(). At gross 250,000
   * (above BASE_MAX = 186,416):
   *   - social freezes on the capped base 186,416
   *   - health is charged on the FULL 250,000
   * An engine that "simplified" both onto one base fails here.
   */
  it('at gross 250,000 social uses the cap and health uses full gross', () => {
    const r = fromGross(250000, Y);
    expect(Math.abs(r.employeeSocial - 17709.52)).toBeLessThanOrEqual(TOL); // 9.5% of capped base
    expect(Math.abs(r.employeeHealth - 4250)).toBeLessThanOrEqual(TOL);     // 1.7% of full 250,000
    expect(Math.abs(r.employerSocial - 27962.4)).toBeLessThanOrEqual(TOL);  // 15% of capped base
    expect(Math.abs(r.employerHealth - 4250)).toBeLessThanOrEqual(TOL);     // 1.7% of full 250,000
  });
});

describe('tax notches (real Albanian cliffs — NOT bugs, do not "fix")', () => {
  /**
   * Crossing 50,000 and 60,000 makes take-home DROP, because the allowance
   * steps down while the rate applies to the whole gross. This is how the
   * statute works. These tests exist so nobody "smooths" the curve.
   */
  it('the 50,000 notch: one lek more gross yields strictly less net', () => {
    expect(incomeTax(50000, Y)).toBe(0);
    expect(Math.abs(incomeTax(50001, Y) - 1950.13)).toBeLessThanOrEqual(TOL);
    expect(fromGross(50001, Y).net).toBeLessThan(fromGross(50000, Y).net);
  });

  it('the 60,000 notch: one lek more gross yields strictly less net', () => {
    expect(Math.abs(incomeTax(60000, Y) - 3250)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(incomeTax(60001, Y) - 3900.13)).toBeLessThanOrEqual(TOL);
    expect(fromGross(60001, Y).net).toBeLessThan(fromGross(60000, Y).net);
  });
});

describe('inverses: closed-form algebra guards', () => {
  it('round-trips net → gross across the whole range within 1 ALL', () => {
    for (let g = 50000; g <= 300000; g += 5000) {
      const { net } = fromGross(g, Y);
      expect(Math.abs(grossFromNet(net, Y) - g)).toBeLessThanOrEqual(1);
    }
  });

  it('round-trips employer cost → gross across the whole range within 1 ALL', () => {
    for (let g = 50000; g <= 300000; g += 5000) {
      const { employerCost } = fromGross(g, Y);
      expect(Math.abs(grossFromEmployerCost(employerCost, Y) - g)).toBeLessThanOrEqual(1);
    }
  });

  it('direct net → gross anchors', () => {
    expect(Math.abs(grossFromNet(79700, Y) - 100000)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(grossFromNet(145203.328, Y) - 186416)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(grossFromNet(156790.48, Y) - 200000)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(grossFromNet(194440.48, Y) - 250000)).toBeLessThanOrEqual(TOL);
  });

  it('direct employer cost → gross anchors', () => {
    expect(Math.abs(grossFromEmployerCost(116700, Y) - 100000)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(grossFromEmployerCost(231362.4, Y) - 200000)).toBeLessThanOrEqual(TOL);
  });

  it('notch ambiguity resolves to the LOWEST gross', () => {
    /**
     * Because of the 50,000 notch, a net of 44,400 is produced by TWO different
     * grosses: 50,000 and ~52,572.56. The convention is the lowest. This test
     * pins that convention — if the band scan is reordered, it breaks.
     */
    expect(Math.abs(grossFromNet(44400, Y) - 50000)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(fromGross(50000, Y).net - 44400)).toBeLessThanOrEqual(TOL);
  });
});

describe('year registry', () => {
  it('DEFAULT_YEAR is the newest available year', () => {
    expect(DEFAULT_YEAR).toBe(Math.max(...AVAILABLE_YEARS));
  });

  it('throws on an unknown year rather than falling back', () => {
    expect(() => fromGross(100000, 9999)).toThrow();
  });
});
