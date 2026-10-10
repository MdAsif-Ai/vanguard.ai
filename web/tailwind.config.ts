import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F4F1EA",
        foreground: "#0B132B",
        navy: {
          DEFAULT: "#0B132B",
          dark: "#060A17",
          light: "#1C2541",
          card: "#141C34",
          border: "#243054",
        },
        ivory: {
          DEFAULT: "#F4F1EA",
          50: "#FAF9F5",
          100: "#F4F1EA",
          200: "#EAE5D9",
          300: "#DDD6C4",
          400: "#C7BC9F",
          border: "#E2DCD0",
        },
        gold: {
          DEFAULT: "#D4AF37",
          50: "#FAF6E8",
          100: "#F5ECCB",
          200: "#EBD897",
          300: "#E0C563",
          400: "#D4AF37",
          500: "#BF9B27",
          600: "#9C7C18",
        },
        teal: {
          DEFAULT: "#2A9D8F",
          50: "#EBF7F5",
          100: "#D3EEEA",
          200: "#A7DDD6",
          300: "#7BCCC1",
          400: "#2A9D8F",
          500: "#217D72",
          600: "#185D55",
        },
        primary: {
          DEFAULT: "#D4AF37",
          foreground: "#0B132B",
        },
        secondary: {
          DEFAULT: "#1C2541",
          foreground: "#F4F1EA",
        },
        muted: {
          DEFAULT: "#EAE5D9",
          foreground: "#5A677D",
        },
        accent: {
          DEFAULT: "#2A9D8F",
          foreground: "#FFFFFF",
        },
        border: "#E2DCD0",
        vanguard: {
          navy: "#0B132B",
          "navy-light": "#1C2541",
          ivory: "#F4F1EA",
          gold: "#D4AF37",
          teal: "#2A9D8F",
        },
      },
      borderRadius: {
        "4xl": "28px",
        "3xl": "24px",
        "2xl": "18px",
        xl: "14px",
        lg: "10px",
        md: "8px",
        sm: "6px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        card: "0 8px 24px rgba(11, 19, 43, 0.08), 0 2px 6px rgba(11, 19, 43, 0.05)",
        "card-hover": "0 16px 36px rgba(11, 19, 43, 0.12), 0 4px 12px rgba(11, 19, 43, 0.06)",
        feature: "0 16px 40px rgba(11, 19, 43, 0.12), 0 4px 12px rgba(11, 19, 43, 0.06)",
        terminal: "0 16px 40px rgba(0, 0, 0, 0.28), 0 2px 6px rgba(0, 0, 0, 0.12)",
        "gold-btn": "0 6px 18px rgba(212, 175, 55, 0.35)",
        "teal-btn": "0 6px 18px rgba(42, 157, 143, 0.35)",
        paper: "0 4px 16px rgba(11, 19, 43, 0.06), 0 1px 3px rgba(11, 19, 43, 0.04)",
        "sidebar-soft": "8px 0 32px rgba(11, 19, 43, 0.16), 2px 0 10px rgba(11, 19, 43, 0.08)",
        "header-soft": "0 10px 28px -4px rgba(11, 19, 43, 0.08), 0 3px 8px -2px rgba(11, 19, 43, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
