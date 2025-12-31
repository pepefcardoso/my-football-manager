/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#0f172a",
          secondary: "#1e293b",
          tertiary: "#334155",
        },
        primary: {
          DEFAULT: "#3b82f6",
          hover: "#2563eb",
          foreground: "#ffffff",
        },
        text: {
          primary: "#f8fafc",
          secondary: "#94a3b8",
          muted: "#64748b",
        },
        status: {
          success: "#10b981",
          warning: "#f59e0b",
          danger: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
