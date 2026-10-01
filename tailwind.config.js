/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        themed: "var(--text)",
        sub:    "var(--sub)",
        muted:  "var(--muted)",
        pos:    "var(--pos)",
        neg:    "var(--neg)",
        warn:   "var(--warn)",
        "dm-bg":      "#000000",
        "dm-surface": "#0A0A0A",
        "dm-card":    "#111111",
        "dm-border":  "#2A2A2A",
        "dm-muted":   "#7A7A7A",
        "dm-sub":     "#A3A3A3",
        "dm-text":    "#FFFFFF",
        "lm-bg":      "#FFFFFF",
        "lm-surface": "#F8F8F8",
        "lm-card":    "#F0F0F0",
        "lm-border":  "#E5E5E5",
        "lm-muted":   "#888888",
        "lm-sub":     "#666666",
        "lm-text":    "#171717",
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        body:    ["IBM Plex Sans", "sans-serif"],
        mono:    ["IBM Plex Mono", "monospace"],
      },
      borderRadius: {
        pill:  "9999px",
        panel: "16px",
        card:  "12px",
      },
      animation: {
        marquee: "marquee 40s linear infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
    },
  },
  plugins: [],
};
