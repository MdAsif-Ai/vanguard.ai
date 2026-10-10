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
        background: "#F4F9F8",
        foreground: "#1E293B",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1E293B",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#1E293B",
        },
        primary: {
          DEFAULT: "#FF9F1C",
          foreground: "#FFFFFF",
          50: "#FFF8EE",
          100: "#FEF0D6",
          200: "#FDE0AD",
          300: "#FCCF84",
          400: "#FFBF69",
          500: "#FF9F1C",
          600: "#E68A0C",
          700: "#CC7400",
        },
        secondary: {
          DEFAULT: "#CBF3F0",
          foreground: "#134E4A",
          50: "#F6FAF9",
          100: "#EDF8F7",
          200: "#DBF4F2",
          300: "#CBF3F0",
          400: "#A2E8E3",
          500: "#79DDD6",
        },
        muted: {
          DEFAULT: "#F4F9F8",
          foreground: "#64748B",
        },
        accent: {
          DEFAULT: "#2EC4B6",
          foreground: "#FFFFFF",
          50: "#E6F9F7",
          100: "#CBF3F0",
          200: "#9CE9E3",
          300: "#6EDFD6",
          400: "#4FD5C9",
          500: "#2EC4B6",
          600: "#249E92",
          700: "#1A786F",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        border: "#CBF3F0",
        input: "#FFFFFF",
        ring: "#2EC4B6",
        vanguard: {
          orange: "#FF9F1C",
          "orange-light": "#FFBF69",
          white: "#FFFFFF",
          mint: "#CBF3F0",
          teal: "#2EC4B6",
          canvas: "#F4F9F8",
        },
      },
      borderRadius: {
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
        clay: "8px 8px 22px rgba(46, 196, 182, 0.08), -4px -4px 14px rgba(255, 255, 255, 0.95), 0 2px 6px rgba(0, 0, 0, 0.03)",
        "clay-hover": "12px 12px 28px rgba(46, 196, 182, 0.14), -6px -6px 18px rgba(255, 255, 255, 1), 0 4px 10px rgba(0, 0, 0, 0.04)",
        "clay-btn": "0 6px 18px rgba(255, 159, 28, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.5)",
        "clay-teal-btn": "0 6px 18px rgba(46, 196, 182, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.5)",
        "clay-inset": "inset 2px 2px 6px rgba(0, 0, 0, 0.04), inset -2px -2px 6px rgba(255, 255, 255, 0.9)",
        metamorphic: "0 10px 30px rgba(46, 196, 182, 0.08), 0 2px 6px rgba(0, 0, 0, 0.03)",
        glow: "0 0 22px -4px rgba(255, 159, 28, 0.35)",
        "glow-teal": "0 0 22px -4px rgba(46, 196, 182, 0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
