/**
 * Resolves the image paths stored in sites.json into URLs Vite can serve.
 *
 *  - absolute URLs, data URIs and "/public" paths pass through unchanged
 *  - anything else is matched by filename against src/assets/**
 *
 * This keeps sites.json free of build-specific paths.
 */
const assetModules = import.meta.glob('../assets/**/*.{jpg,jpeg,png,webp,avif,gif,svg}', {
  eager: true,
});

const assetsByName = new Map(
  Object.entries(assetModules).map(([path, mod]) => [
    path.split('/').pop().toLowerCase(),
    mod.default,
  ]),
);

export function resolveImage(source) {
  const value = typeof source === 'string' ? source : source?.src ?? source?.url;
  if (!value) return null;
  if (/^(https?:)?\/\//.test(value) || value.startsWith('data:')) return value;

  const byName = assetsByName.get(value.split('/').pop().toLowerCase());
  if (byName) return byName;

  return value; // e.g. a file in /public
}
