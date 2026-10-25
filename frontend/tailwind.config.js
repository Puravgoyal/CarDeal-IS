/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        page: "#F6F7F5",
        surface: "#FFFFFF",
        primary: "#172126",
        secondary: "#52616B",
        accent: {
          DEFAULT: "#0F766E",
          hover: "#0D665F",
          light: "#E6F4F2"
        },
        border: "#DCE3E1",
        error: "#B42318"
      },
      borderRadius: {
        card: "16px",
        control: "8px"
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};
