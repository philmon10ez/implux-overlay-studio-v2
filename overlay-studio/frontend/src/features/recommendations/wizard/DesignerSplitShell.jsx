/**
 * Split layout: controls (left / second on mobile) + sticky live preview (right / first on mobile).
 * Preview column is wider on xl+ for a dominant visual.
 */
export default function DesignerSplitShell({ controls, preview, className = '' }) {
  return (
    <div
      className={`flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-10 ${className}`}
    >
      {/* Preview first on small screens (dominant), right column on xl */}
      <aside className="order-1 w-full shrink-0 xl:order-2 xl:sticky xl:top-6 xl:z-10 xl:w-[min(100%,580px)] xl:flex-[1.5] xl:self-start xl:pl-2">
        <div className="max-h-[min(78vh,720px)] overflow-y-auto overflow-x-hidden rounded-2xl border border-gray-200/80 bg-gradient-to-b from-gray-50/80 to-white p-4 shadow-card sm:p-5 xl:max-h-[calc(100vh-7.5rem)]">
          {preview}
        </div>
      </aside>
      <div className="order-2 min-w-0 flex-1 xl:order-1 xl:max-w-xl">{controls}</div>
    </div>
  );
}
