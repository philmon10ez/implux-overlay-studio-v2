/**
 * Live overlay renderer — mirrors overlay-engine structure for preview.
 * designConfig: { background, backgroundOpacity, size, position, headline, headlineSize, headlineBold, headlineColor,
 *   subheadline, subheadlineSize, subheadlineColor, body, bodySize, bodyColor,
 *   ctaText, ctaAction, ctaUrl, ctaBgColor, ctaTextColor, ctaBorderRadius,
 *   secondaryCtaText, imageDataUrl, showCloseButton, closeDelay, animation }
 */
export default function OverlayPreview({ designConfig = {}, className = '', mobile = false }) {
  const d = designConfig;
  const bg = d.background || '#ffffff';
  const opacity = d.backgroundOpacity ?? 0.95;
  const size = d.size || 'medium';
  const position = d.position || 'center';
  const width =
    size === 'full' ? '100%' : size === 'large' ? '90%' : size === 'small' ? '320px' : '480px';
  const anim = d.animation || 'fade';

  const positionClasses = {
    center: 'inset-0 m-auto',
    'bottom-bar': 'left-0 right-0 bottom-0',
    'top-bar': 'left-0 right-0 top-0',
    'bottom-right': 'right-4 bottom-4',
    'bottom-left': 'left-4 bottom-4',
  };
  const pos = positionClasses[position] || positionClasses.center;

  const animationClass = {
    fade: 'animate-fadeIn',
    'slide-up': 'animate-slideUp',
    'slide-down': 'animate-slideDown',
    bounce: 'animate-bounceIn',
    none: '',
  }[anim] || 'animate-fadeIn';

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-gray-200 ${className}`}
      style={{
        width: mobile ? 375 : 800,
        height: mobile ? 600 : 500,
        maxWidth: '100%',
      }}
    >
      {/* Mock browser chrome */}
      <div className="flex items-center gap-2 border-b border-gray-300 bg-gray-100 px-3 py-2">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        </div>
        <div className="ml-4 flex-1 rounded bg-white px-3 py-1 text-xs text-gray-400">
          https://store.myshopify.com
        </div>
      </div>
      {/* Mock storefront background */}
      <div className="absolute inset-0 top-9 bg-gray-100 p-4">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded bg-gray-200" />
          ))}
        </div>
      </div>
      {/* Overlay backdrop */}
      <div
        className="absolute inset-0 top-9 flex items-center justify-center bg-black/40"
        style={{ backgroundColor: `rgba(0,0,0,0.4)` }}
      >
        {/* Overlay panel — same structure as overlay-engine */}
        <div
          className={`absolute flex flex-col rounded-lg p-6 shadow-xl ${pos} ${animationClass}`}
          style={{
            width,
            maxWidth: '95%',
            maxHeight: '85%',
            backgroundColor: bg,
            opacity,
            overflow: 'auto',
          }}
        >
          {d.imageDataUrl && (
            <img
              src={d.imageDataUrl}
              alt=""
              className="mb-4 max-h-32 w-full object-contain"
            />
          )}
          {d.headline && (
            <h2
              className="mb-1 font-bold"
              style={{
                fontSize: d.headlineSize || 24,
                fontWeight: d.headlineBold ? 700 : 600,
                color: d.headlineColor || '#1f2937',
              }}
            >
              {d.headline}
            </h2>
          )}
          {d.subheadline && (
            <p
              className="mb-2"
              style={{
                fontSize: d.subheadlineSize || 16,
                color: d.subheadlineColor || '#6b7280',
              }}
            >
              {d.subheadline}
            </p>
          )}
          {d.body && (
            <p
              className="mb-4 text-sm"
              style={{
                fontSize: d.bodySize || 14,
                color: d.bodyColor || '#4b5563',
              }}
            >
              {d.body}
            </p>
          )}
          <div className="mt-auto flex flex-wrap gap-2">
            {d.ctaText && (
              <button
                type="button"
                className="rounded-lg px-4 py-2 font-medium transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: d.ctaBgColor || '#6c63ff',
                  color: d.ctaTextColor || '#fff',
                  borderRadius: (d.ctaBorderRadius ?? 8) + 'px',
                }}
              >
                {d.ctaText}
              </button>
            )}
            {d.secondaryCtaText && (
              <button
                type="button"
                className="text-sm text-gray-500 underline"
              >
                {d.secondaryCtaText}
              </button>
            )}
          </div>
          {d.showCloseButton !== false && (
            <button
              type="button"
              className="absolute right-2 top-2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
