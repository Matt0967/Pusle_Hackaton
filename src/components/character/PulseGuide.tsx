interface PulseGuideProps {
  mood?: "calm" | "urgent" | "hope";
  className?: string;
}

export function PulseGuide({ mood = "calm", className }: PulseGuideProps) {
  const accent = mood === "urgent" ? "#ff6b6b" : mood === "hope" ? "#8ad879" : "#5de0d7";
  const secondary = mood === "urgent" ? "#ffc857" : "#a78bfa";

  return (
    <svg
      className={className}
      viewBox="0 0 220 260"
      role="img"
      aria-label="Nara, guide triangulaire de Pulse"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="guideGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <polygon points="110 10 33 142 110 250 187 142" fill="#10221f" stroke={accent} strokeWidth="4" />
      <polygon points="110 10 72 112 110 92" fill="#1d3b35" />
      <polygon points="110 10 148 112 110 92" fill="#28493e" />
      <polygon points="33 142 72 112 84 184" fill="#2f5d48" />
      <polygon points="187 142 148 112 136 184" fill="#31544f" />
      <polygon points="84 184 110 92 136 184" fill="#18332f" />
      <polygon points="84 184 110 250 110 200" fill="#223d32" />
      <polygon points="136 184 110 250 110 200" fill="#172f35" />
      <polygon points="75 112 97 122 86 137" fill={secondary} opacity="0.86" />
      <polygon points="145 112 123 122 134 137" fill={secondary} opacity="0.86" />
      <polygon points="97 156 110 136 123 156 110 178" fill={accent} filter="url(#guideGlow)" />
      <polygon points="110 144 116 156 110 168 104 156" fill="#f5fff8" opacity="0.72" />
      <polygon points="54 145 20 170 60 176" fill="#142b28" stroke={accent} strokeWidth="3" />
      <polygon points="166 145 200 170 160 176" fill="#142b28" stroke={accent} strokeWidth="3" />
      <polygon points="58 205 88 214 66 244" fill="#24463d" />
      <polygon points="162 205 132 214 154 244" fill="#24463d" />
      <circle cx="89" cy="116" r="4" fill="#f5fff8" />
      <circle cx="131" cy="116" r="4" fill="#f5fff8" />
      <path d="M96 137 Q110 146 124 137" fill="none" stroke="#d8fff5" strokeWidth="4" strokeLinecap="round" opacity="0.78" />
    </svg>
  );
}
