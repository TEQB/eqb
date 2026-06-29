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
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          50: "#FDF1F4",
          100: "#F8DDE4",
          200: "#EFB5C4",
          300: "#E186A0",
          400: "#D05B7F",
          500: "#B43A60",
          600: "#7A1030",
          700: "#651028",
          800: "#4D0C1F",
          900: "#340815",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
          50: "#FFF4E6",
          100: "#FCE3BF",
          200: "#F8CC8A",
          300: "#F3B456",
          400: "#ED9C24",
          500: "#E2870F",
          600: "#D4750A",
          700: "#B96308",
          800: "#975006",
          900: "#783D05",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        success: {
          50: "#F0FDF4",
          600: "#16A34A",
        },
        warning: {
          50: "#FFFBEB",
          600: "#D97706",
        },
        danger: {
          50: "#FEF2F2",
          600: "#DC2626",
        },
        info: {
          50: "#ECFEFF",
          600: "#0891B2",
        },
        gray: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          500: "#6B7280",
          700: "#374151",
          900: "#111827",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        xs: ["12px", "1.5"],
        sm: ["14px", "1.5"],
        base: ["16px", "1.7"],
        lg: ["18px", "1.4"],
        xl: ["20px", "1.3"],
        "2xl": ["24px", "1.2"],
        "3xl": ["30px", "1.1"],
      },
      spacing: {
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        5: "20px",
        6: "24px",
        8: "32px",
        10: "40px",
        12: "48px",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        full: "9999px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.05)",
        md: "0 4px 6px rgba(0,0,0,0.07)",
        lg: "0 10px 15px rgba(0,0,0,0.1)",
        xl: "0 20px 25px rgba(0,0,0,0.12)",
        soft: "0 2px 8px rgba(0,0,0,0.06)",
        glow: "0 0 0 3px rgba(212,117,10,0.18)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-out-expo": "cubic-bezier(0.87, 0, 0.13, 1)",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "250ms",
        slow: "400ms",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          from: { opacity: "0", transform: "translateY(-12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-scale": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "scale-in": {
          from: { transform: "scale(0)" },
          to: { transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
        "bounce-in": {
          "0%": { opacity: "0", transform: "scale(0.3)" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        spinner: {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in-up": "fade-in-up 0.25s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in-down": "fade-in-down 0.25s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in-scale": "fade-in-scale 0.25s cubic-bezier(0.16,1,0.3,1) both",
        "scale-in": "scale-in 0.2s cubic-bezier(0.34,1.56,0.64,1) both",
        shimmer: "shimmer 1.5s linear infinite",
        shake: "shake 0.5s cubic-bezier(0.87,0,0.13,1)",
        "bounce-in": "bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1)",
        spinner: "spinner 0.8s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
