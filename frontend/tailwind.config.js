/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Sora'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          50: "#f5f6fb",
          100: "#e9ebf7",
          200: "#cfd3ec",
          400: "#8a90c0",
          500: "#5a5fa8",
          600: "#454a8c",
          700: "#363a70",
          800: "#282a56",
          900: "#1a1b3a",
        },
      },
      boxShadow: {
        panel: "0 1px 2px rgba(26,27,58,0.04), 0 8px 24px -8px rgba(26,27,58,0.12)",
      },
    },
  },
  plugins: [],
};
