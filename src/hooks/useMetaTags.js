import { useEffect } from 'react';

export function useMetaTags({ title, description, canonical } = {}) {
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
  }, [title, description, canonical]);
}
