/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0a0a0f",
        surface: "#13131a",
        glass: "rgba(255,255,255,0.04)",
        border: "rgba(255,255,255,0.08)",
        accent: {
          pri: "#3dd68c",
          sec: "#a8f0c6",
          danger: "#f76a6a",
        },
        text: {
          pri: "#f0eeff",
          muted: "#7a7a9a",
        },
      },
      fontFamily: {
        display: ["DM Sans", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backdropBlur: {
        glass: "12px",
      },
      boxShadow: {
        glass: "0 -1px 0 rgba(61,214,140,0.4), 0 4px 24px rgba(0,0,0,0.4)",
        glow: "0 0 24px rgba(61,214,140,0.25)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease forwards",
        "slide-up": "slideUp 0.4s ease forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(16px)" }, to: { opacity: 1, transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
}
