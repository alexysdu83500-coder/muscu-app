import React, { createContext, useContext, useMemo } from "react";
import { usePersistentState_simple } from "../hooks/useLocalStorage";

// Calcule l'objet de couleurs à partir du booléen clair/sombre — pure fonction de calcul,
// utilisée aussi bien par le Provider ci-dessous que par WorkoutSessionView (qui force
// toujours le thème sombre pendant une séance, indépendamment du réglage global).
export function useTheme(isDark) {
  return useMemo(() => ({
    bg: isDark ? "#000000" : "#F2F2F7",
    bgAlt: isDark ? "#0A0A0B" : "#F2F2F7",
    card: isDark ? "#1C1C1E" : "#FFFFFF",
    card2: isDark ? "#242426" : "#FBFBFD",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(60,60,67,0.1)",
    text: isDark ? "#F5F5F7" : "#1C1C1E",
    textMuted: isDark ? "#8E8E93" : "#6E6E73",
    textFaint: isDark ? "#636366" : "#AEAEB2",
    accent: "#FF5A36",
    accent2: "#FF9F1C",
    good: "#30D5A6",
    bad: "#FF453A",
    tabBg: isDark ? "rgba(20,20,22,0.85)" : "rgba(255,255,255,0.85)",
  }), [isDark]);
}

const ThemeContext = createContext(null);

// Ne gère QUE l'état global (clair/sombre + le thème calculé qui en découle). Peuplé au
// niveau App.jsx ; les composants continuent de recevoir `theme` en prop comme avant
// (migration progressive possible vers `useThemeContext()` sans casser l'existant).
export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = usePersistentState_simple("gt_dark", true);
  const theme = useTheme(isDark);
  return (
    <ThemeContext.Provider value={{ isDark, setIsDark, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext doit être utilisé à l'intérieur de <ThemeProvider>");
  return ctx;
}

/* ============================== STORAGE HOOK ============================== */
