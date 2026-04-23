/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#e0fff5",
          100: "#b3ffe8",
          200: "#7dffd8",
          300: "#40ffc5",
          400: "#00e5b0",
          500: "#00c896",
          600: "#00aa80",
          700: "#008a68",
          800: "#006b52",
          900: "#004d3c",
        },
        navy: {
          50:  "#f0f5ff",
          100: "#e0ebff",
          200: "#c0d4f0",
          300: "#93b0d8",
          400: "#5a7fa8",
          500: "#324f78",
          600: "#1e3660",
          700: "#162748",
          800: "#111d2d",
          900: "#0b1120",
          950: "#07090f",
        },
      },
    },
  },
  plugins: [],
};
