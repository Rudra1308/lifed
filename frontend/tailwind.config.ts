import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontSize: {
        "2xs": ["0.8125rem", { lineHeight: "1.2rem" }], // 13px
        xs: ["1rem", { lineHeight: "1.45rem" }],        // 16px (was 12px, +4px)
        sm: ["1.125rem", { lineHeight: "1.6rem" }],     // 18px (was 14px, +4px)
        base: ["1.25rem", { lineHeight: "1.75rem" }],   // 20px (was 16px, +4px)
        lg: ["1.375rem", { lineHeight: "1.875rem" }],   // 22px (was 18px, +4px)
        xl: ["1.5rem", { lineHeight: "2rem" }],         // 24px (was 20px, +4px)
        "2xl": ["1.75rem", { lineHeight: "2.25rem" }],  // 28px (was 24px, +4px)
        "3xl": ["2.125rem", { lineHeight: "2.5rem" }],  // 34px (was 30px, +4px)
        "4xl": ["2.5rem", { lineHeight: "2.8rem" }],    // 40px (was 36px, +4px)
        "5xl": ["3.25rem", { lineHeight: "3.5rem" }],   // 52px (was 48px, +4px)
      },
      fontFamily: {
        mono: ['"Courier New"', "Courier", '"Lucida Console"', "Monaco", "monospace"],
        sans: ['"Courier New"', "Courier", '"Lucida Console"', "Monaco", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;