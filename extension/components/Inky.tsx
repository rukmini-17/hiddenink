// Inky: HiddenInk's mascot, an original ink-drop character. Pure SVG so it scales anywhere.
export type InkyMood = "calm" | "alert" | "happy";

export function Inky({ size = 56, mood = "calm" }: { size?: number; mood?: InkyMood }) {
  const browRaise = mood === "alert" ? -6 : 0;
  const mouth = mood === "happy" ? "M 38 70 Q 50 82 62 70" : mood === "alert" ? "M 41 74 Q 50 70 59 74" : "M 40 71 Q 50 78 60 71";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Inky, the HiddenInk mascot">
      <path d="M50 4 C 62 30, 86 44, 86 66 A 36 36 0 0 1 14 66 C 14 44, 38 30, 50 4 Z" fill="#1f2a44" />
      <ellipse cx="32" cy="58" rx="6" ry="9" fill="#fbf7f0" opacity="0.28" />
      <g transform={`translate(0 ${browRaise})`}>
        <ellipse cx="40" cy="58" rx="7" ry="8" fill="#fbf7f0" />
        <ellipse cx="60" cy="58" rx="7" ry="8" fill="#fbf7f0" />
        <circle cx="41.5" cy="60" r="3.2" fill="#1f2a44" />
        <circle cx="61.5" cy="60" r="3.2" fill="#1f2a44" />
        <circle cx="40.5" cy="58.5" r="1" fill="#fbf7f0" />
        <circle cx="60.5" cy="58.5" r="1" fill="#fbf7f0" />
      </g>
      <path d={mouth} stroke="#e8a33d" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
