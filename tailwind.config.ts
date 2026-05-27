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
        brand: {
          ink: "#171717",
          paper: "#fff7ef",
          orange: "#ff5a1f",
          coral: "#ff8a5b",
          blush: "#ffe1d2",
          graphite: "#2b2b2b",
          blue: "#3157ff",
          mint: "#47d6a4",
        },
        felt: {
          950: "#171717",
          900: "#2b2b2b",
          800: "#403f3c",
          700: "#5e5a54",
        },
        brass: {
          400: "#ff5a1f",
          500: "#e94a12",
          700: "#a9320c",
        },
      },
      boxShadow: {
        glow: "0 18px 45px rgba(255, 90, 31, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
