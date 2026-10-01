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
        // Blok Primary Palette (Sitecore Purple)
        primary: {
          50: "#f7f6ff",
          100: "#eae7ff",
          200: "#d9d4ff",
          300: "#b8a9ff",
          400: "#9373ff",
          500: "#6e3fff", // Core Blok Primary
          600: "#5319e0", // Core Blok Hover
          700: "#4715af", // Core Blok Active
          800: "#401791",
          900: "#2f1469",
          DEFAULT: "#6e3fff",
          foreground: "#ffffff",
        },
        // Blok Success Palette
        success: {
          50: "#e8fcf5",
          100: "#bef6e3",
          200: "#8bebd0",
          300: "#44cbac",
          400: "#0ea184",
          500: "#007f66",
          600: "#006450",
          700: "#085040",
          DEFAULT: "#007f66",
          foreground: "#ffffff",
        },
        // Blok Danger / Destructive Palette
        danger: {
          50: "#fff5f4",
          100: "#ffe4e2",
          200: "#ffccc8",
          300: "#ff9a94",
          400: "#f4595a",
          500: "#d92739",
          600: "#b30426",
          700: "#92001f",
          DEFAULT: "#d92739",
          foreground: "#ffffff",
        },
        // Blok Warning / Amber Palette
        warning: {
          50: "#fff6e7",
          100: "#ffe6bd",
          200: "#fdd291",
          300: "#ffa037",
          400: "#e26e00",
          500: "#ba5200",
          600: "#953d00",
          700: "#7a2f00",
          DEFAULT: "#ba5200",
          foreground: "#ffffff",
        },
        // Blok Neutral Greys
        neutral: {
          50: "#f7f7f7",
          100: "#e9e9e9",
          200: "#d8d8d8",
          300: "#b5b5b5",
          400: "#8e8e8e",
          500: "#717171",
          600: "#535353",
          700: "#3b3b3b",
          800: "#282828",
          900: "#212121",
        },
        // Blok semantic surface colors
        border: "var(--border, #e9e9e9)",
        background: "var(--background, #ffffff)",
        foreground: "var(--foreground, #212121)",
        muted: {
          DEFAULT: "#f7f7f7",
          foreground: "#717171",
        },
      },
      borderRadius: {
        "sm": "0.25rem",
        "md": "0.375rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        "blok-sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "blok-md": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        "blok-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        "blok-focus": "0 0 0 3px rgba(110, 63, 255, 0.25)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
