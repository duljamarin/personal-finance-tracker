const rateCache = new Map() // key: "USD", value: { rate: 0.9234, fetchedAt: Date.now() }
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

const PRIMARY_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@2026.5.29/v1/currencies/eur.json'
const FALLBACK_URL = 'https://currency-api.pages.dev/v1/currencies/eur.min.json'

// Fetches all EUR-based rates once and caches each currency individually.
// Response shape: { date: "...", eur: { usd: 1.08, all: 95.5, ... } }
// Rates are expressed as "1 EUR = X currency", so we invert to get "1 currency = Y EUR".
async function fetchAllRates() {
  const urls = [PRIMARY_URL, FALLBACK_URL]
  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const json = await res.json()
      const rates = json?.eur
      if (!rates) continue
      return rates
    } catch {
      // try next
    }
  }
  return null
}

export async function fetchExchangeRate(currency) {
  if (currency === 'EUR') return 1.0

  const key = currency.toLowerCase()
  const cached = rateCache.get(key)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rate
  }

  const rates = await fetchAllRates()
  if (!rates) return null

  const now = Date.now()
  // Cache every currency we got back so sibling requests are free
  for (const [code, eurPerUnit] of Object.entries(rates)) {
    if (eurPerUnit > 0) {
      rateCache.set(code, { rate: 1 / eurPerUnit, fetchedAt: now })
    }
  }

  return rateCache.get(key)?.rate ?? null
}
