"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "dark-red";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("zero-board-theme") as Theme;
      if (savedTheme && ["light", "dark", "dark-red"].includes(savedTheme)) {
        return savedTheme;
      }
    }
    return "dark";
  });

  useEffect(() => {
    // Apply initial theme class if not already set
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      const savedTheme = localStorage.getItem("zero-board-theme") as Theme;
      if (!savedTheme || !["light", "dark", "dark-red"].includes(savedTheme)) {
        root.classList.remove("theme-light", "theme-dark", "theme-dark-red");
        root.classList.add("theme-dark");
      }
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark", "theme-dark-red");
    root.classList.add(`theme-${theme}`);
    localStorage.setItem("zero-board-theme", theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

