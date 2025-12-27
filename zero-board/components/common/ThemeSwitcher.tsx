"use client";

interface ThemeSwitcherProps {
  theme: string;
  setTheme: (theme: "light" | "dark" | "dark-red") => void;
}

export function ThemeSwitcher({ theme, setTheme }: ThemeSwitcherProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-1">
      <button
        onClick={() => setTheme("light")}
        className={`rounded px-3 py-1 text-sm transition-colors ${
          theme === "light"
            ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
            : "text-[var(--text-muted)] hover:bg-[var(--muted)]"
        }`}
        title="Light Theme"
      >
        ☀️
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`rounded px-3 py-1 text-sm transition-colors ${
          theme === "dark"
            ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
            : "text-[var(--text-muted)] hover:bg-[var(--muted)]"
        }`}
        title="Dark Theme"
      >
        🌙
      </button>
      <button
        onClick={() => setTheme("dark-red")}
        className={`rounded px-3 py-1 text-sm transition-colors ${
          theme === "dark-red"
            ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
            : "text-[var(--text-muted)] hover:bg-[var(--muted)]"
        }`}
        title="Dark Red Theme"
      >
        🔥
      </button>
    </div>
  );
}

