export function trackPageview(path) {
  window.goatcounter?.count?.({ path });
}

export function trackEvent(name) {
  window.goatcounter?.count?.({ path: name, title: name, event: true });
}
