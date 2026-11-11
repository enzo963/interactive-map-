/**
 * Preview-server twin of public/_headers: content-hashed build assets and optimized heritage
 * images (tools/content-pipeline/optimize_images.py) never change under the same URL, so the
 * browser may cache them for a year without revalidating.
 */
const IMMUTABLE = /^\/(assets|images\/sites)\//;

export default function immutableAssets() {
  return {
    name: 'heritage-immutable-assets',
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (IMMUTABLE.test(req.url ?? '')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        next();
      });
    },
  };
}
