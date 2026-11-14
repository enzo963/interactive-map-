/**
 * Resolves the image paths stored in sites.json into URLs Vite can serve.
 *
 *  - absolute URLs, data URIs and "/public" paths pass through unchanged
 *  - anything else is matched by filename against src/assets/**
 *
 * This keeps sites.json free of build-specific paths.
 */
let assetsByName;
function localAssets() {
  // Read imported bindings on first use, after split chunks have initialized.
  // Capturing module namespaces at evaluation time can freeze undefined exports in a cycle.
  if (!assetsByName) {
    const assetModules = import.meta.glob('../assets/**/*.{jpg,jpeg,png,webp,avif,gif,svg}', { eager: true, import: 'default' });
    assetsByName = new Map(Object.entries(assetModules).map(([path, url]) => [path.split('/').pop().toLowerCase(), url]));
  }
  return assetsByName;
}

export function resolveImage(source) {
  const value = typeof source === 'string' ? source : source?.src ?? source?.url;
  if (!value) return null;
  if (/^(https?:)?\/\//.test(value) || value.startsWith('data:')) return value;

  const byName = localAssets().get(value.split('/').pop().toLowerCase());
  if (byName) return byName;

  return value; // e.g. a file in /public
}
