// Harness stub for useDisplayCurrency. Uses the SAME Intl formatting as
// production so the Albanian U+00A0 group separators (the locale-dependent
// overflow trigger this suite exists to catch) are reproduced exactly.
export function useDisplayCurrency() {
  const lang = document.documentElement.lang === 'en' ? 'en-US' : 'sq-AL';
  return {
    currency: 'EUR',
    format: (v) =>
      new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' }).format(Number(v) || 0),
  };
}
export default useDisplayCurrency;
