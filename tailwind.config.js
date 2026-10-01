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
        accent: "var(--accent)",
        cyan:   "var(--cyan)",
        "lime-500": "var(--lime-500)",
        "lime-400": "var(--lime-400)",
        "mint-500": "var(--mint-500)",
        "amber-500": "var(--amber-500)",
        /* Dark mode surfaces — Selo/Salesforce inspired */
        "dm-bg":      "#000000",
        "dm-surface": "#0A0A0A",
        "dm-card":    "#141414",
        "dm-border":  "#2A2A2A",
        "dm-muted":   "#7A7A7A",
        "dm-sub":     "#A3A3A3",
        "dm-text":    "#FFFFFF",
        /* Light mode surfaces — Selo/Salesforce inspired (clean light mode) */
        "lm-bg":      "#F8F9FA",
        "lm-surface": "#FFFFFF",
        "lm-card":    "#FFFFFF",
        "lm-border":  "#E4E6EB",
        "lm-muted":   "#888888",
        "lm-sub":     "#6B7280",
        "lm-text":    "#1A1D23",
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
