import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0A0A0A", soft: "#3A3F4B", muted: "#6B7280" },
        // royal blue sampled from the logo (~#10358E)
        brand: {
          50: "#F2F6FD",
          100: "#E4ECFA",
          200: "#C7D7F3",
          300: "#9DB6E8",
          400: "#5E82CF",
          500: "#2B56B0",
          600: "#12378F",
          700: "#0F2E78",
          800: "#0B2259",
          900: "#081A44",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-cinzel)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,10,10,0.04), 0 8px 24px -12px rgba(18,55,143,0.12)",
        lift: "0 2px 4px rgba(10,10,10,0.05), 0 18px 40px -16px rgba(18,55,143,0.28)",
      },
    },
  },
  plugins: [],
};
export default config;
