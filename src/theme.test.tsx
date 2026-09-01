import { darkPalette, isThemeMode, lightPalette, resolveTheme } from "./theme";

describe("theme preferences", () => {
  it("resolves explicit light and dark palettes", () => {
    expect(resolveTheme("dark", "light")).toEqual({ isDark: true, colors: darkPalette });
    expect(resolveTheme("light", "dark")).toEqual({ isDark: false, colors: lightPalette });
  });

  it("uses the system scheme only when mode is system", () => {
    expect(resolveTheme("system", "dark").isDark).toBe(true);
    expect(resolveTheme("system", "light").isDark).toBe(false);
  });

  it("accepts only supported persisted modes", () => {
    expect(isThemeMode("light")).toBe(true);
    expect(isThemeMode("dark")).toBe(true);
    expect(isThemeMode("system")).toBe(true);
    expect(isThemeMode("midnight")).toBe(false);
    expect(isThemeMode(null)).toBe(false);
  });
});
