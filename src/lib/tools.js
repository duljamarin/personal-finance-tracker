/**
 * Public tools registry.
 *
 * Adding a tool is one entry here: it appears in the navbar automatically, and
 * the navbar switches itself from a direct link to a dropdown at two or more.
 * The route still needs registering in App.jsx (routes are declared, not
 * generated, everywhere else in this app — staying consistent with that).
 */
export const TOOLS = [
  {
    path: '/tools/salary-calculator',
    labelKey: 'nav.tools.salaryCalculator',
  },
  {
    path: '/tools/self-employed-calculator',
    labelKey: 'nav.tools.freelancerCalculator',
  },
];
