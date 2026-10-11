import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        "paper-raised": "var(--paper-raised)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        line: "var(--line)",
        teal: {
          DEFAULT: "var(--teal)",
          deep: "var(--teal-deep)",
          tint: "var(--teal-tint)",
        },
        amber: {
          DEFAULT: "var(--amber)",
          tint: "var(--amber-tint)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          tint: "var(--danger-tint)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-bg)",
          ink: "var(--sidebar-ink)",
          "ink-muted": "var(--sidebar-ink-muted)",
          border: "var(--sidebar-border)",
          hover: "var(--sidebar-hover)",
          active: "var(--sidebar-active)",
          "active-text": "var(--sidebar-active-text)",
        },
      },
      fontFamily: {
        display: ["Inter", "-apple-system", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
        body: ["Inter", "-apple-system", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["Consolas", "SF Mono", "Cascadia Code", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
