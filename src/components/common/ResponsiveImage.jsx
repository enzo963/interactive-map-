import { IMAGE_SIZES, pictureSources } from '../../utils/imageVariants';

/**
 * An optimized heritage image: AVIF and WebP sources with a JPEG fallback, sized by `role`
 * so phones never download desktop renditions. Explicit width/height reserve the space and the
 * image's average colour fills it while loading. Off-screen images load lazily; `priority`
 * loads above-the-fold images at once. Without renditions it falls back to the plain source.
 */
export default function ResponsiveImage({ image, alt, role = 'card', priority = false, className, onLoad, onError }) {
  const picture = pictureSources(image, role);
  // A reviewed focus point (CSS object-position) keeps the subject in frame when the card crops.
  const position = role === 'card' && typeof image.focus === 'string' ? { objectPosition: image.focus } : null;
  const loading = priority ? 'eager' : 'lazy';
  const fetchPriority = priority ? 'high' : undefined;
  if (!picture?.src) {
    return <img className={className} src={image.src} alt={alt} loading={loading} decoding="async"
      fetchPriority={fetchPriority} style={position ?? undefined} onLoad={onLoad} onError={onError} />;
  }
  return (
    <picture>
      {picture.sources.map((source) => <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={IMAGE_SIZES[role]} />)}
      <img className={className} src={picture.src} alt={alt} width={picture.width} height={picture.height}
        loading={loading} decoding="async" fetchPriority={fetchPriority}
        style={picture.color || position ? { ...(picture.color && { backgroundColor: picture.color }), ...position } : undefined}
        onLoad={onLoad} onError={onError} />
    </picture>
  );
}
