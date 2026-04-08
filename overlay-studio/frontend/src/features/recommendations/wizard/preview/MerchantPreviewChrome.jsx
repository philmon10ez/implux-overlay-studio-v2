/**
 * Browser-style frame + optional theme root for future storefront templates.
 */
export default function MerchantPreviewChrome({ path, frameLabel, brandName, children }) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md"
      data-preview-theme="default"
    >
      <div className="rounded-t-xl border-b border-gray-200 bg-gray-100 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-red-300/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <div className="min-w-0 flex-1 truncate rounded-md bg-white px-2 py-1 text-center text-[10px] text-gray-500 shadow-sm">
            {path}
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-center gap-2 text-[9px] font-semibold uppercase tracking-wider text-gray-400">
          <span>{frameLabel}</span>
          {brandName ? (
            <>
              <span className="text-gray-300">·</span>
              <span className="font-normal normal-case tracking-normal text-gray-500">{brandName}</span>
            </>
          ) : null}
        </div>
      </div>
      <div className="preview-root text-gray-900">{children}</div>
    </div>
  );
}
