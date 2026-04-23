import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { DARK, LIGHT, type ThemeColors } from "@/constants/colors";

export type ThemeMode = "light" | "dark" | "system";

// Brand decision: ship in dark mode by default. The user can opt
// into "light" or "system" later from the profile screen.
const DEFAULT_MODE: ThemeMode = "dark";

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const STORAGE_KEY = "shkuna_theme_mode_v1";

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((v) => {
        if (v === "light" || v === "dark" || v === "system") setModeState(v);
      })
      .finally(() => setHydrated(true));
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    SecureStore.setItemAsync(STORAGE_KEY, m).catch(() => undefined);
  }, []);

  // Treat unknown system scheme (e.g. SSR / before first paint) as dark
  // since the brand baseline is dark.
  const isDark =
    mode === "system" ? (systemScheme ?? "dark") === "dark" : mode === "dark";

  const toggle = useCallback(() => {
    setMode(isDark ? "light" : "dark");
  }, [isDark, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: isDark ? DARK : LIGHT,
      isDark,
      mode,
      setMode,
      toggle,
    }),
    [isDark, mode, setMode, toggle]
  );

  // Avoid theme flicker until persisted value is loaded.
  if (!hydrated) {
    return (
      <ThemeContext.Provider value={{ colors: DARK, isDark: true, mode: DEFAULT_MODE, setMode, toggle }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider />");
  return ctx;
}
