import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        felt: {
          950: "#061a15",
          900: "#08231c",
          800: "#0d3428",
          700: "#14523e",
        },
        brass: {
          400: "#d7b56d",
          500: "#c99d48",
          700: "#876223",
        },
      },
      boxShadow: {
        glow: "0 0 32px rgba(215, 181, 109, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
