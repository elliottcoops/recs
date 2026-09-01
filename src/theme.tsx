import * as SecureStore from "expo-secure-store";
import { Appearance } from "react-native";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

// A soft blue-grey canvas and ink-led typography make both modes feel more
// editorial than the default white/slate treatment, while teal remains Recs'
// recognisable action colour.
export const lightPalette = { background: "#F3F5F8", surface: "#FFFFFF", surfaceMuted: "#E9EEF4", text: "#172033", muted: "#68758A", border: "#D7E0EA", icon: "#344258" };
export const darkPalette = { background: "#10151D", surface: "#19222E", surfaceMuted: "#243040", text: "#F4F7FB", muted: "#A8B4C4", border: "#344256", icon: "#D3DCE7" };
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
