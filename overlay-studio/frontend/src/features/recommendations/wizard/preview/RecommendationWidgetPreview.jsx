import { memo, useCallback, useRef } from 'react';

function ProductThumb({ imageUrl, title, size }) {
  const box =
    size === 'lg' ? 'h-28 w-28 sm:h-32 sm:w-32' : size === 'md' ? 'h-20 w-20' : 'h-16 w-16 shrink-0';
  return (
    <div className={`overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200/80 ${box}`}>
      {imageUrl ? (
        <img src={imageUrl} alt={title || ''} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full items-center justify-center px-1 text-center text-[9px] leading-tight text-gray-400">
          No image
        </div>
      )}
    </div>
  );
}

const ProductThumbMemo = memo(ProductThumb);

function SingleProductCard({
  headline,
  subcopy,
  cta,
  title,
  imageUrl,
  internalSetName,
  comfortable,
}) {
  const pad = comfortable ? 'p-5' : 'p-3.5';
  return (
    <div
      className={`rounded-xl border-2 border-poptek-action/25 bg-white shadow-lg shadow-poptek-action/5 ring-1 ring-poptek-action/10 ${pad}`}
    >
      {(headline && headline.trim()) || (subcopy && subcopy.trim()) ? (
        <div className={comfortable ? 'mb-4' : 'mb-2.5'}>
          {headline && headline.trim() ? (
            <p className={`font-semibold leading-snug text-gray-900 ${comfortable ? 'text-base' : 'text-sm'}`}>
              {headline.trim()}
            </p>
          ) : null}
          {subcopy && subcopy.trim() ? (
            <p
              className={`mt-1.5 leading-relaxed text-gray-600 ${comfortable ? 'text-sm' : 'text-xs'}`}
            >
              {subcopy.trim()}
            </p>
          ) : null}
        </div>
      ) : null}
      <div
        className={`flex gap-4 ${comfortable ? 'flex-col sm:flex-row sm:items-start' : 'flex-col sm:flex-row sm:items-center'}`}
      >
        <ProductThumbMemo imageUrl={imageUrl} title={title || 'Product'} size={comfortable ? 'lg' : 'md'} />
        <div className="min-w-0 flex-1">
          <p className={`line-clamp-2 font-medium text-gray-900 ${comfortable ? 'text-sm sm:text-base' : 'text-xs'}`}>
            {title}
          </p>
          {internalSetName ? (
            <p className="mt-1 truncate text-[10px] text-gray-400">Set: {internalSetName}</p>
          ) : null}
          <button
            type="button"
            className={`mt-3 w-full cursor-default rounded-lg bg-poptek-action font-medium text-white sm:w-auto ${
              comfortable ? 'px-5 py-2.5 text-sm' : 'px-3 py-1.5 text-[10px]'
            }`}
          >
            {cta}
          </button>
        </div>
      </div>
    </div>
  );
}

function CarouselCard({ cta, title, imageUrl }) {
  return (
    <div className="w-[min(100%,220px)] shrink-0 snap-start rounded-xl border-2 border-poptek-action/20 bg-white p-3 shadow-md shadow-poptek-action/5 ring-1 ring-poptek-action/10">
      <ProductThumbMemo imageUrl={imageUrl} title={title || 'Product'} size="sm" />
      <p className="mt-2 line-clamp-2 text-xs font-medium text-gray-900">{title}</p>
      <button
        type="button"
        className="mt-2 w-full cursor-default rounded-lg bg-poptek-action px-3 py-1.5 text-[10px] font-medium text-white"
      >
        {cta}
      </button>
    </div>
  );
}

/**
 * Live recommendation block driven by editor state (not a static image).
 * @param {object} props
 * @param {{ id?: string|number, title?: string, imageUrl?: string }[]} props.products
 * @param {string} props.headline
 * @param {string} props.subcopy
 * @param {string} props.ctaLabel
 * @param {string} props.internalSetName
 * @param {'comfortable' | 'compact'} props.density
 * @param {string} props.sectionTitle — e.g. "You might also like"
 */
function RecommendationWidgetPreviewInner({
  products,
  headline,
  subcopy,
  ctaLabel,
  internalSetName,
  density,
  sectionTitle,
}) {
  const comfortable = density === 'comfortable';
  const cta = (ctaLabel && ctaLabel.trim()) || 'Add to cart';
  const scrollRef = useRef(null);

  const scrollStrip = useCallback((dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const delta = dir === 'left' ? -200 : 200;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  }, []);

  if (!products || products.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-amber-200/90 bg-amber-50/50 px-4 py-8 text-center">
        <p className="text-sm font-medium text-amber-900">No products in this set yet</p>
        <p className="mt-1 text-xs text-amber-800/90">Add products to see how the recommendation block will look.</p>
      </div>
    );
  }

  if (products.length === 1) {
    const p = products[0];
    return (
      <section aria-label="Recommendation preview">
        {sectionTitle ? (
          <h4 className={`mb-3 font-semibold text-gray-900 ${comfortable ? 'text-sm' : 'text-xs'}`}>{sectionTitle}</h4>
        ) : null}
        <SingleProductCard
          headline={headline}
          subcopy={subcopy}
          cta={cta}
          title={p.title || 'Product'}
          imageUrl={p.imageUrl}
          internalSetName={internalSetName}
          comfortable={comfortable}
        />
      </section>
    );
  }

  return (
    <section aria-label="Recommendation preview">
      <div className="mb-2 flex items-center justify-between gap-2">
        {sectionTitle ? (
          <h4 className={`font-semibold text-gray-900 ${comfortable ? 'text-sm' : 'text-xs'}`}>{sectionTitle}</h4>
        ) : (
          <span />
        )}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => scrollStrip('left')}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            aria-label="Scroll recommendations left"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scrollStrip('right')}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            aria-label="Scroll recommendations right"
          >
            →
          </button>
        </div>
      </div>
      {(headline && headline.trim()) || (subcopy && subcopy.trim()) ? (
        <div className="mb-3 rounded-lg border border-poptek-action/15 bg-poptek-action/[0.05] px-3 py-2.5">
          {headline && headline.trim() ? (
            <p className={`font-semibold leading-snug text-gray-900 ${comfortable ? 'text-sm' : 'text-xs'}`}>
              {headline.trim()}
            </p>
          ) : null}
          {subcopy && subcopy.trim() ? (
            <p className={`mt-1 leading-relaxed text-gray-600 ${comfortable ? 'text-xs' : 'text-[10px]'}`}>
              {subcopy.trim()}
            </p>
          ) : null}
        </div>
      ) : null}
      <div
        ref={scrollRef}
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 pt-0.5 [scrollbar-width:thin]"
      >
        {products.map((p, i) => (
          <CarouselCard
            key={p.id ?? `p-${i}`}
            cta={cta}
            title={p.title || 'Product'}
            imageUrl={p.imageUrl}
          />
        ))}
      </div>
      {internalSetName ? (
        <p className="mt-2 text-[10px] text-gray-400">Set: {internalSetName}</p>
      ) : null}
    </section>
  );
}

function propsEqual(a, b) {
  if (a.headline !== b.headline || a.subcopy !== b.subcopy || a.ctaLabel !== b.ctaLabel) return false;
  if (a.internalSetName !== b.internalSetName) return false;
  if (a.density !== b.density) return false;
  if (a.sectionTitle !== b.sectionTitle) return false;
  const pa = a.products || [];
  const pb = b.products || [];
  if (pa.length !== pb.length) return false;
  for (let i = 0; i < pa.length; i += 1) {
    if (pa[i]?.id !== pb[i]?.id) return false;
    if (pa[i]?.title !== pb[i]?.title) return false;
    if (pa[i]?.imageUrl !== pb[i]?.imageUrl) return false;
  }
  return true;
}

const RecommendationWidgetPreview = memo(RecommendationWidgetPreviewInner, propsEqual);
export default RecommendationWidgetPreview;
