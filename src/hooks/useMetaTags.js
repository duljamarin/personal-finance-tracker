import { useEffect } from 'react';

export function useMetaTags({ title, description, canonical, hreflangs, jsonLd } = {}) {
  useEffect(() => {
    if (title) document.title = title;

    let descEl = document.querySelector('meta[name="description"]');
    if (description) {
      if (!descEl) {
        descEl = document.createElement('meta');
        descEl.setAttribute('name', 'description');
        document.head.appendChild(descEl);
      }
      descEl.setAttribute('content', description);
    }

    // og:title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (title && ogTitle) ogTitle.setAttribute('content', title);

    // og:description
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (description && ogDesc) ogDesc.setAttribute('content', description);

    // twitter:title
    let twTitle = document.querySelector('meta[name="twitter:title"]');
    if (title && twTitle) twTitle.setAttribute('content', title);

    // twitter:description
    let twDesc = document.querySelector('meta[name="twitter:description"]');
    if (description && twDesc) twDesc.setAttribute('content', description);

    // canonical
    if (canonical) {
      let canonEl = document.querySelector('link[rel="canonical"]');
      if (canonEl) canonEl.setAttribute('href', canonical);
      let ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.setAttribute('content', canonical);
    }

    // hreflang: remove all existing, then add the provided set (if any).
    // Non-landing routes pass no hreflangs — Semrush flags hreflang conflicts
    // when /pricing, /terms etc. inherit the root's hreflang from the SPA shell.
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
    if (Array.isArray(hreflangs)) {
      hreflangs.forEach(({ lang, href }) => {
        const link = document.createElement('link');
        link.setAttribute('rel', 'alternate');
        link.setAttribute('hreflang', lang);
        link.setAttribute('href', href);
        document.head.appendChild(link);
      });
    }

    // Route-specific JSON-LD. Tagged with data-route-jsonld so we manage only
    // the scripts this hook injects — the static WebApplication/FAQPage blocks
    // in index.html (which describe the app as a whole) are left untouched.
    document.querySelectorAll('script[data-route-jsonld]').forEach(el => el.remove());
    if (jsonLd) {
      const blocks = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      blocks.forEach(block => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-route-jsonld', '');
        script.textContent = JSON.stringify(block);
        document.head.appendChild(script);
      });
    }

    return () => {
      document.querySelectorAll('script[data-route-jsonld]').forEach(el => el.remove());
    };
  }, [title, description, canonical, hreflangs, jsonLd]);
}
