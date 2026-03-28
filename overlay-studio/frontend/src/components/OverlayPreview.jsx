import { useState } from 'react';

/**
 * Live overlay renderer — mirrors overlay-engine structure for preview.
 */
export default function OverlayPreview({
  designConfig = {},
  className = '',
  mobile = false,
  campaignType = '',
}) {
  const d = designConfig;
  const bg = d.background || '#ffffff';
  const opacity = d.backgroundOpacity ?? 0.95;
  const size = d.size || 'medium';
  const position = d.position || 'center';
  const width =
    size === 'full' ? '100%' : size === 'large' ? '90%' : size === 'small' ? '320px' : '480px';
  const anim = d.animation || 'fade';

  const isExitTwoStep =
    campaignType === 'exit_intent' && d.exitTwoStep !== false;
  const [exitPreviewPhase, setExitPreviewPhase] = useState('gate');

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

  const renderOfferPanel = () => (
    <>
      {d.imageDataUrl && (
        <img
          src={d.imageDataUrl}
          alt=""
          className="mb-4 max-h-32 w-full object-contain"
        />
      )}
      {(d.exitOfferEyebrow || '').trim() ? (
        <p
          className="mb-1 text-xs font-semibold uppercase tracking-wide"
          style={{ color: d.exitOfferEyebrowColor || '#6c63ff' }}
        >
          {d.exitOfferEyebrow}
        </p>
      ) : null}
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
          <button type="button" className="text-sm text-gray-500 underline">
            {d.secondaryCtaText}
          </button>
        )}
      </div>
    </>
  );

  const renderGatePanel = () => (
    <>
      {(d.exitGateHeadline || '').trim() ? (
        <h2
          className="mb-1 font-bold"
          style={{
            fontSize: d.headlineSize || 22,
            fontWeight: d.headlineBold ? 700 : 600,
            color: d.headlineColor || '#1f2937',
          }}
        >
          {d.exitGateHeadline}
        </h2>
      ) : null}
      {(d.exitGateSubheadline || '').trim() ? (
        <p
          className="mb-2 text-sm"
          style={{
            fontSize: (d.subheadlineSize || 16) - 1,
            color: d.subheadlineColor || '#6b7280',
          }}
        >
          {d.exitGateSubheadline}
        </p>
      ) : null}
      {(d.exitGateBody || '').trim() ? (
        <p
          className="mb-4 text-sm"
          style={{
            fontSize: d.bodySize || 14,
            color: d.bodyColor || '#4b5563',
          }}
        >
          {d.exitGateBody}
        </p>
      ) : null}
      <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          className="rounded-lg px-4 py-2.5 text-sm font-semibold"
          style={{
            backgroundColor: d.exitGateStayBgColor || d.ctaBgColor || '#6c63ff',
            color: d.exitGateStayTextColor || d.ctaTextColor || '#fff',
            borderRadius: (d.ctaBorderRadius ?? 8) + 'px',
          }}
        >
          {d.exitStayCtaText || 'Yes, show me the offer'}
        </button>
        <button
          type="button"
          className="px-2 py-2 text-sm underline decoration-gray-400"
          style={{ color: d.exitGateLeaveColor || '#6b7280' }}
        >
          {d.exitLeaveCtaText || 'No thanks, exit'}
        </button>
      </div>
    </>
  );

  if (campaignType === 'welcome_mat') {
    const innerPreview = Math.min(320, Math.max(200, (Number(d.welcomeMatInnerMaxPx) || 640) * 0.48));
    return (
      <div
        className={`relative overflow-hidden rounded-lg bg-gray-200 ${className}`}
        style={{
          width: mobile ? 375 : 800,
          height: mobile ? 600 : 500,
          maxWidth: '100%',
        }}
      >
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
        <div className="absolute inset-0 top-9 flex flex-col">
          <div className="relative flex-1 overflow-hidden">
            <div className="absolute inset-0 bg-neutral-800/80" aria-hidden />
            <div
              className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto px-4 py-8"
              style={{ backgroundColor: bg, opacity }}
            >
              <div className="relative w-full" style={{ maxWidth: innerPreview }}>
                {d.showCloseButton !== false && (
                  <button
                    type="button"
                    className="absolute -right-1 -top-1 z-10 rounded-full p-1 text-gray-500 hover:bg-black/5"
                    aria-label="Close"
                  >
                    ×
                  </button>
                )}
                <div className="text-center">{renderOfferPanel()}</div>
              </div>
            </div>
          </div>
          <p className="shrink-0 bg-gray-900 py-1.5 text-center text-[10px] text-gray-400">
            Preview scaled — live welcome mat fills the viewport and pauses page scroll
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-gray-200 ${className}`}
      style={{
        width: mobile ? 375 : 800,
        height: mobile ? 600 : 500,
        maxWidth: '100%',
      }}
    >
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
      <div className="absolute inset-0 top-9 bg-gray-100 p-4">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded bg-gray-200" />
          ))}
        </div>
      </div>
      <div
        className="absolute inset-0 top-9 flex items-center justify-center bg-black/40"
        style={{ backgroundColor: `rgba(0,0,0,0.4)` }}
      >
        {isExitTwoStep && (
          <div className="absolute right-3 top-12 z-10 flex gap-1 rounded-md border border-gray-300 bg-white p-0.5 text-xs shadow-sm">
            <button
              type="button"
              onClick={() => setExitPreviewPhase('gate')}
              className={`rounded px-2 py-1 ${
                exitPreviewPhase === 'gate' ? 'bg-accent text-white' : 'text-gray-600'
              }`}
            >
              Gate
            </button>
            <button
              type="button"
              onClick={() => setExitPreviewPhase('offer')}
              className={`rounded px-2 py-1 ${
                exitPreviewPhase === 'offer' ? 'bg-accent text-white' : 'text-gray-600'
              }`}
            >
              Offer
            </button>
          </div>
        )}
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
          {isExitTwoStep ? (
            exitPreviewPhase === 'gate' ? renderGatePanel() : renderOfferPanel()
          ) : (
            renderOfferPanel()
          )}
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
