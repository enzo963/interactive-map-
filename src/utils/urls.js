/** Public references use HTTP(S); media may also use an explicit same-origin path. */
export function safeUrl(value, { allowRelative = false, httpsOnly = false } = {}) {
  if (typeof value !== 'string' || !value || /[\s\\]/.test(value)
    || [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return '';
  if (allowRelative && value.startsWith('/') && !value.startsWith('//')) return value;
  if (!/^https?:\/\//i.test(value)) return '';
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || (httpsOnly && url.protocol !== 'https:')
      || url.username || url.password) return '';
    return url.href;
  } catch { return ''; }
}
