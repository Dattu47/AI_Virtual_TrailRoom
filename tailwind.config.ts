import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base: "#f8f3ee",
        charcoal: "#1d1d1f",
        accent: "#E8632A"
      }
    }
  },
  plugins: []
};

export default config;
