// Detects common in-app WebViews (Instagram, Facebook, LinkedIn, TikTok,
// generic Android WebView) that Google blocks from OAuth sign-in with
// "Error 403: disallowed_useragent" — Google refuses these WebViews outright
// since they could intercept credentials, and there is no way to bypass this
// from application code. The only fix is opening the page in a real browser
// (Chrome, Safari, Firefox), so we detect this case client-side and warn the
// user before they hit the dead end on Google's side.
const IN_APP_PATTERNS = [
  /Instagram/i,
  /FBAN|FBAV|FB_IAB/i, // Facebook app
  /LinkedInApp/i,
  /TikTok/i,
  /Line\//i,
  /MicroMessenger/i, // WeChat
  /Twitter/i,
  /wv\)/i, // generic Android WebView marker
];

export function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return IN_APP_PATTERNS.some((pattern) => pattern.test(ua));
}
