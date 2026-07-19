import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        "secondary-text": "hsl(var(--text-secondary))",
        "text-disabled": "hsl(var(--text-disabled))",
        border: {
          DEFAULT: "hsl(var(--border))",
          strong: "hsl(var(--border-strong))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        overlay: "hsl(var(--overlay))",
        sheet: "hsl(var(--sheet))",
        card: {
          DEFAULT: "hsl(var(--card))",
          hover: "hsl(var(--card-hover))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          soft: "hsl(var(--primary-soft))",
          foreground: "hsl(var(--primary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        calories: {
          DEFAULT: "hsl(var(--calories))",
          track: "hsl(var(--calories-track))",
        },
        protein: {
          DEFAULT: "hsl(var(--protein))",
          soft: "hsl(var(--protein-soft))",
        },
        carbs: {
          DEFAULT: "hsl(var(--carbs))",
          soft: "hsl(var(--carbs-soft))",
        },
        fat: {
          DEFAULT: "hsl(var(--fat))",
          soft: "hsl(var(--fat-soft))",
        },
        fiber: {
          DEFAULT: "hsl(var(--fiber))",
          soft: "hsl(var(--fiber-soft))",
        },
        water: {
          DEFAULT: "hsl(var(--water))",
          soft: "hsl(var(--water-soft))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          soft: "hsl(var(--success-soft))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          soft: "hsl(var(--warning-soft))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          soft: "hsl(var(--destructive-soft))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          soft: "hsl(var(--info-soft))",
        },
        streak: {
          DEFAULT: "hsl(var(--streak))",
          soft: "hsl(var(--streak-soft))",
        },
        confidence: {
          high: "hsl(var(--confidence-high))",
          med: "hsl(var(--confidence-med))",
          low: "hsl(var(--confidence-low))",
        },
        chart: {
          calories: "hsl(var(--chart-calories))",
          "goal-line": "hsl(var(--chart-goal-line))",
          under: "hsl(var(--chart-under))",
          "on-target": "hsl(var(--chart-on-target))",
          over: "hsl(var(--chart-over))",
          grid: "hsl(var(--chart-grid))",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Space Grotesk", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["64px", { lineHeight: "68px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-lg": ["40px", { lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-md": ["28px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "700" }],
        title: ["20px", { lineHeight: "28px", fontWeight: "600" }],
        heading: ["17px", { lineHeight: "24px", fontWeight: "600" }],
        body: ["15px", { lineHeight: "22px", fontWeight: "400" }],
        label: ["13px", { lineHeight: "18px", fontWeight: "500" }],
        caption: ["12px", { lineHeight: "16px", fontWeight: "500" }],
        micro: ["11px", { lineHeight: "14px", letterSpacing: "0.04em", fontWeight: "600" }],
      },
      borderRadius: {
        DEFAULT: "1rem",
        card: "20px",
        control: "12px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        raised: "var(--shadow-raised)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        instant: "120ms",
        fast: "200ms",
        standard: "300ms",
        expressive: "700ms",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "fade-rise": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "flame-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.25)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.6s linear infinite",
        "fade-rise": "fade-rise 300ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "flame-pulse": "flame-pulse 500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
