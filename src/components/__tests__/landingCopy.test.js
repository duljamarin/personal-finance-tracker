import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Guards the landing page's load-bearing invariants. These are cheap checks on
// static files, but each one maps to a claim that was actually wrong on the
// live site at some point: the page advertised multi-currency support the app
// does not have, and the prerendered HTML drifted from the rendered hero.

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const json = (p) => JSON.parse(read(p));

const en = json('src/locales/en/translation.json');
const sq = json('src/locales/sq/translation.json');

const leafKeys = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? leafKeys(v, `${prefix}${k}.`)
      : [`${prefix}${k}`]
  );

describe('landing copy: locale parity', () => {
  it('landing.* key sets are identical in en and sq', () => {
    expect(leafKeys(en.landing).sort()).toEqual(leafKeys(sq.landing).sort());
  });

  it('meta.* key sets are identical in en and sq', () => {
    expect(leafKeys(en.meta).sort()).toEqual(leafKeys(sq.meta).sort());
  });

  it('no landing or meta value is an empty string', () => {
    for (const [lang, bundle] of [['en', en], ['sq', sq]]) {
      for (const scope of ['landing', 'meta']) {
        for (const key of leafKeys(bundle[scope])) {
          const value = key.split('.').reduce((a, k) => a[k], bundle[scope]);
          expect(typeof value, `${lang}.${scope}.${key}`).toBe('string');
          expect(value.trim().length, `${lang}.${scope}.${key}`).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('landing copy: house rules', () => {
  it('uses no em dashes (a pre-write hook blocks them in locales)', () => {
    for (const [lang, bundle] of [['en', en], ['sq', sq]]) {
      for (const scope of ['landing', 'meta']) {
        for (const key of leafKeys(bundle[scope])) {
          const value = key.split('.').reduce((a, k) => a[k], bundle[scope]);
          expect(value, `${lang}.${scope}.${key}`).not.toContain('—');
        }
      }
    }
  });

  it('makes no multi-currency claim: the app is single-currency', () => {
    // TransactionForm has no currency picker and base_amount === amount, so any
    // conversion/normalisation wording on the landing page would be false.
    const banned = /multi-currency|multicurrency|shume valuta|normalizohet|normalized to|exchange rate|kurset e kembimit/i;
    for (const [lang, bundle] of [['en', en], ['sq', sq]]) {
      for (const scope of ['landing', 'meta']) {
        for (const key of leafKeys(bundle[scope])) {
          const value = key.split('.').reduce((a, k) => a[k], bundle[scope]);
          expect(value, `${lang}.${scope}.${key}`).not.toMatch(banned);
        }
      }
    }
  });

  it('fabricates no social proof (no user counts, ratings, or testimonials)', () => {
    const banned = /trusted by|join \d|\d+[,.]?\d*\+? (users|customers|people)|star rating|testimonial|as seen on/i;
    for (const [lang, bundle] of [['en', en], ['sq', sq]]) {
      for (const key of leafKeys(bundle.landing)) {
        const value = key.split('.').reduce((a, k) => a[k], bundle.landing);
        expect(value, `${lang}.landing.${key}`).not.toMatch(banned);
      }
    }
  });
});

describe('landing SEO: meta limits', () => {
  it.each([['en', en], ['sq', sq]])('%s meta.title is at most 60 chars', (_lang, bundle) => {
    expect(bundle.meta.title.length).toBeLessThanOrEqual(60);
  });

  it.each([['en', en], ['sq', sq]])('%s meta.description is 140-160 chars', (_lang, bundle) => {
    expect(bundle.meta.description.length).toBeGreaterThanOrEqual(140);
    expect(bundle.meta.description.length).toBeLessThanOrEqual(160);
  });
});

describe('prerendered HTML matches rendered copy', () => {
  const cases = [
    ['en.html', en],
    ['sq.html', sq],
    ['index.html', en],
  ];

  it.each(cases)('%s has exactly one h1, matching the rendered hero', (file, bundle) => {
    const html = read(file);
    const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)];
    expect(h1s).toHaveLength(1);
    const expected = `${bundle.landing.hero.titleLine1} ${bundle.landing.hero.titleAccent}`;
    expect(h1s[0][1].trim()).toBe(expected);
  });

  it.each(cases)('%s title and description match the i18n meta', (file, bundle) => {
    const html = read(file);
    expect(html).toContain(`<title>${bundle.meta.title}</title>`);
    expect(html).toContain(`content="${bundle.meta.description}"`);
  });

  it.each(cases)('%s JSON-LD is valid and claims no ratings', (file) => {
    const html = read(file);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    expect(blocks.length).toBeGreaterThan(0);
    const types = blocks.map((b) => {
      const parsed = JSON.parse(b[1]); // throws if the generator emitted bad JSON
      expect(parsed.aggregateRating).toBeUndefined();
      return parsed['@type'];
    });
    expect(types).toContain('FAQPage');
    expect(types).toContain('SoftwareApplication');
  });

  it.each(cases)('%s FAQ JSON-LD matches the FAQ keys the page renders', (file, bundle) => {
    const html = read(file);
    const faqBlock = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((b) => JSON.parse(b[1]))
      .find((b) => b['@type'] === 'FAQPage');
    const questions = faqBlock.mainEntity.map((q) => q.name);
    // Every question in structured data must be a question the page shows.
    const rendered = Object.values(bundle.landing.faq.items).map((i) => i.q);
    for (const q of questions) expect(rendered).toContain(q);
  });
});
