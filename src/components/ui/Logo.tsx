import React from "react";

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 32, showText = false, className = "" }) => {
  if (showText) {
    return (
      <div className={`flex items-center gap-2.5 select-none ${className}`}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          <rect
            x="2"
            y="2"
            width="28"
            height="28"
            rx="7"
            fill="var(--card)"
            stroke="var(--border)"
            strokeWidth="1.5"
          />
          <path
            d="M 7 24 C 13 11, 21 11, 23 15 C 25 19, 23 23, 19 24 C 15 25, 13 19, 21 13"
            stroke="#00F0FF"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="21" cy="13" r="2.8" fill="#10B981" />
        </svg>
        <div className="flex flex-col text-left leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-display font-black text-sm tracking-wider text-themed">
              INTERMINAL
            </span>
            <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan/15 text-cyan border border-cyan/30">
              ARC
            </span>
          </div>
          <span className="font-mono text-[8.5px] text-muted tracking-widest uppercase mt-0.5">
            Treasury Desk · 5042
          </span>
        </div>
      </div>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="7"
        fill="var(--card)"
        stroke="var(--border)"
        strokeWidth="1.5"
      />
      <path
        d="M 7 24 C 13 11, 21 11, 23 15 C 25 19, 23 23, 19 24 C 15 25, 13 19, 21 13"
        stroke="#00F0FF"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="21" cy="13" r="2.8" fill="#10B981" />
    </svg>
  );
};
