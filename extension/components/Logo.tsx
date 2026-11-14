// The HiddenInk icon: an eye inside a shield (docs/design/UI-SPEC.md, option C, light tile).
// Same drawing as assets/icon/icon.svg. `glyph` drops the tile for very small sizes.
export function Logo({ size = 18, glyph = false }: { size?: number; glyph?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" role="img" aria-label="HiddenInk" className="block shrink-0">
      {!glyph && (
        <>
          <rect width="28" height="28" rx="7" fill="#EEF2FF" />
          <rect x=".5" y=".5" width="27" height="27" rx="6.5" fill="none" stroke="#C7D2FE" />
        </>
      )}
      <path d="M14 4l8 3v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V7z" fill="none" stroke="#1B2A4A" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="14" cy="13.5" r="2.6" fill="#6D5BF0" />
      <path d="M9.5 13.5c1.2-1.8 2.7-2.7 4.5-2.7s3.3.9 4.5 2.7" fill="none" stroke="#1B2A4A" strokeWidth="1.3" />
    </svg>
  );
}

/** Icon plus the "HiddenInk" name, as shown at the top of every card and dialog so a page can't pass one off as ours. */
export function Brand({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs font-medium text-hi-faint ${className}`}>
      <Logo size={18} />
      <span>HiddenInk</span>
    </div>
  );
}
