import * as SecureStore from "expo-secure-store";
import { Appearance } from "react-native";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

export const lightPalette = { background: "#F8FAFC", surface: "#FFFFFF", surfaceMuted: "#F1F5F9", text: "#0F172A", muted: "#64748B", border: "#E2E8F0", icon: "#334155" };
export const darkPalette = { background: "#020617", surface: "#0F172A", surfaceMuted: "#1E293B", text: "#F8FAFC", muted: "#94A3B8", border: "#334155", icon: "#CBD5E1" };
export const isThemeMode = (value: string | null): value is ThemeMode => value === "light" || value === "dark" || value === "system";
export const resolveTheme = (mode: ThemeMode, system: "light" | "dark") => ({ isDark: mode === "dark" || (mode === "system" && system === "dark"), colors: mode === "dark" || (mode === "system" && system === "dark") ? darkPalette : lightPalette });
const light = lightPalette;
const dark = darkPalette;
type Palette = typeof light;
type ThemeContextValue = { mode: ThemeMode; isDark: boolean; colors: Palette; setMode: (mode: ThemeMode) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [system, setSystem] = useState(Appearance.getColorScheme() ?? "light");
  useEffect(() => { SecureStore.getItemAsync("recs-theme-mode").then((value) => { if (isThemeMode(value)) setModeState(value); }).catch(() => undefined); }, []);
  useEffect(() => Appearance.addChangeListener(({ colorScheme }) => setSystem(colorScheme ?? "light")).remove, []);
  useEffect(() => { Appearance.setColorScheme(mode === "system" ? null : mode); }, [mode]);
  const setMode = (next: ThemeMode) => { setModeState(next); void SecureStore.setItemAsync("recs-theme-mode", next); };
  const { isDark, colors } = resolveTheme(mode, system);
  const value = useMemo(() => ({ mode, isDark, colors, setMode }), [mode, isDark, colors]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme() { const value = useContext(ThemeContext); if (!value) throw new Error("useTheme must be used within ThemeProvider"); return value; }
