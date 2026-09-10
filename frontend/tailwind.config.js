/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: "#F5F8F7",
          surface: "#FFFFFF",
          ink: "#0F211D",
          muted: "#5C7169",
          line: "#E3EAE7",
          primary: "#0F6E5D",
          primaryDark: "#0A4B3F",
          primaryLight: "#E4F2EE",
          coral: "#FF7A59",
          coralLight: "#FFE9E1",
          gold: "#D8A44C",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,33,29,0.04), 0 8px 24px -12px rgba(15,33,29,0.12)",
        pop: "0 4px 12px -2px rgba(15,110,93,0.25)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
