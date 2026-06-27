import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pitch-night palette. Tuned for OLED dark mode + glassmorphism.
        ink: {
          950: "#05060a",
          900: "#0a0c14",
          850: "#0f111c",
          800: "#141728",
          700: "#1d2138",
          600: "#2a2f4d",
        },
        brand: {
          50: "#eafff4",
          100: "#cdfee3",
          200: "#9bf9c9",
          300: "#5eefab",
          400: "#22dd8a",
          500: "#06c074",
          600: "#019a5f",
          700: "#067a4f",
          800: "#0a6041",
          900: "#0a4f38",
        },
        accent: {
          400: "#ffb020",
          500: "#ff9500",
          600: "#e07c00",
        },
        danger: {
          400: "#ff6b6b",
          500: "#f43f5e",
          600: "#e11d48",
        },
        info: {
          400: "#4cc9f0",
          500: "#2a9fd6",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px -4px rgba(34, 221, 138, 0.45)",
        "glow-danger": "0 0 24px -4px rgba(244, 63, 94, 0.45)",
        sheet: "0 -12px 40px -8px rgba(0, 0, 0, 0.6)",
        card: "0 8px 32px -12px rgba(0, 0, 0, 0.5)",
      },
      backdropBlur: {
        xs: "2px",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "pop-in": {
          "0%": { transform: "scale(0.92)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "pop-in": "pop-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
