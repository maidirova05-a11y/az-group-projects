/**
 * Client-side guard for URLs that come from the DB / API / settings and end up in
 * `href`, `src` or `window.open`. React 18 does not block `javascript:` hrefs, so every
 * such sink goes through these helpers (second layer on top of server validation).
 *
 * safeHref allows: http:, https:, mailto:, tel: and same-site paths starting with a single '/'.
 * safeImgSrc allows: http:, https: and same-site '/' paths.
 *
 * The check runs on a normalised copy (all ASCII control chars and whitespace removed), so
 * obfuscations like ' JaVaScRiPt:', 'java\tscript:' or '/\\evil.com' are caught. When the value
 * is accepted the original (trimmed) string is returned, so legitimate URLs are not altered.
 */

const HREF_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const IMG_PROTOCOLS = new Set(['http:', 'https:']);
const SCHEME_RE = /^([a-z][a-z0-9+.-]*):/i;
// C0 controls, DEL, all whitespace (incl. Unicode spaces), zero-width chars and BOM.
// eslint-disable-next-line no-control-regex
const STRIP_RE = /[\u0000-\u001F\u007F\s​-‍⁠﻿]+/g;

function siteOrigin(): string {
  try {
    if (typeof location !== 'undefined' && location.origin && location.origin !== 'null') return location.origin;
  } catch { /* no location (tests / SSR) */ }
  return 'http://localhost';
}

function check(url: unknown, protocols: Set<string>): string | null {
  if (typeof url !== 'string') return null;
  const raw = url.trim();
  const s = raw.replace(STRIP_RE, '');
  if (!s) return null;

  // Same-site path: exactly one leading '/', never '//' or '/\' (protocol-relative tricks).
  if (s[0] === '/') {
    if (s[1] === '/' || s[1] === '\\') return null;
    const origin = siteOrigin();
    try {
      if (new URL(s, origin).origin !== origin) return null;
    } catch { return null; }
    return raw;
  }

  // Anything else must carry an explicit, allowed scheme ('\\evil', 'evil.com', '#x' are rejected).
  const m = SCHEME_RE.exec(s);
  if (!m) return null;
  let parsed: URL;
  try { parsed = new URL(s, siteOrigin()); } catch { return null; }
  const proto = parsed.protocol.toLowerCase();
  if (!protocols.has(proto) || `${m[1].toLowerCase()}:` !== proto) return null;
  return raw;
}

/** True when `url` is safe to put into an `href` (see module doc). */
export function isSafeHref(url: string | null | undefined): boolean {
  return check(url, HREF_PROTOCOLS) !== null;
}

/** Returns `url` when safe for an `href`, otherwise `fallback`. */
export function safeHref(url: string | null | undefined, fallback = '#'): string {
  return check(url, HREF_PROTOCOLS) ?? fallback;
}

/** Same as safeHref, but returns undefined for unsafe/empty values (to hide a link entirely). */
export function safeHrefOrNull(url: string | null | undefined): string | undefined {
  return check(url, HREF_PROTOCOLS) ?? undefined;
}

/** Returns `url` when it is an http(s) or same-site '/' image URL, otherwise undefined. */
export function safeImgSrc(url: string | null | undefined): string | undefined {
  return check(url, IMG_PROTOCOLS) ?? undefined;
}

/** True when a non-empty value was rejected (used by the admin to flag broken data). */
export function isUnsafeHref(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.trim() !== '' && !isSafeHref(url);
}

/** window.open guarded by safeHref; silently ignores unsafe values. */
export function safeOpen(url: string | null | undefined, target = '_blank', features = 'noopener'): void {
  const href = check(url, HREF_PROTOCOLS);
  if (href) window.open(href, target, features);
}
