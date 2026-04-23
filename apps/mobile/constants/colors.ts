// ─────────────────────────────────────────────────────────────────
// Shkuna design tokens.
// Two themes (DARK / LIGHT) sharing the same shape so screens can
// just consume `colors` without branching on the mode.
// Inspired by the Fan Football mock: deep navy + mint-green accents.
// ─────────────────────────────────────────────────────────────────

export const DARK = {
  mode: "dark" as "dark" | "light",

  // Backgrounds
  bg:           "#0A1322",   // app root
  bgElevated:   "#0E1A2D",   // headers / hero
  bgCard:       "#111E33",   // primary card
  bgSurface:    "#152743",   // input / chip
  bgSubtle:     "#0F1B30",   // alt background
  bgOverlay:    "rgba(5, 10, 20, 0.65)",

  // Borders
  border:       "#1C2D4A",
  borderStrong: "#243C61",
  borderSoft:   "rgba(0, 200, 150, 0.12)",

  // Text
  textPrimary:   "#F8FAFF",
  textSecondary: "#94A8C4",
  textMuted:     "#5C7392",
  textDisabled:  "#34465F",
  textInverse:   "#0A1322",

  // Accent (mint / fan-football green)
  primary:        "#00D29A",
  primaryHover:   "#00BE8B",
  primaryPress:   "#00A578",
  primaryDim:     "rgba(0, 210, 154, 0.12)",
  primaryDimer:   "rgba(0, 210, 154, 0.06)",
  primaryMuted:   "rgba(0, 210, 154, 0.30)",
  primaryGlow:    "rgba(0, 210, 154, 0.45)",
  primaryOnText:  "#03130D",

  // Status
  error:        "#FF4D6E",
  errorDim:     "rgba(255, 77, 110, 0.14)",
  warning:      "#F5A623",
  warningDim:   "rgba(245, 166, 35, 0.16)",
  success:      "#00D29A",
  successDim:   "rgba(0, 210, 154, 0.16)",
  info:         "#5DA8FF",
  infoDim:      "rgba(93, 168, 255, 0.16)",

  // Tabs / chrome
  tabBar:        "#0A1322",
  tabBorder:     "#152743",
  tabActive:     "#00D29A",
  tabInactive:   "#5C7392",

  // Misc
  shadow:        "#000000",
  scrim:         "rgba(0, 0, 0, 0.55)",
  statusBar:     "light" as "light" | "dark",
};

export const LIGHT: typeof DARK = {
  mode: "light" as const,

  bg:           "#F4F7FB",
  bgElevated:   "#FFFFFF",
  bgCard:       "#FFFFFF",
  bgSurface:    "#F0F4FA",
  bgSubtle:     "#E8EEF7",
  bgOverlay:    "rgba(10, 19, 34, 0.18)",

  border:       "#E1E8F2",
  borderStrong: "#C9D4E4",
  borderSoft:   "rgba(0, 173, 126, 0.20)",

  textPrimary:   "#0A1322",
  textSecondary: "#4A5C75",
  textMuted:     "#7B8CA5",
  textDisabled:  "#B8C4D6",
  textInverse:   "#FFFFFF",

  primary:        "#00AD7E",
  primaryHover:   "#009972",
  primaryPress:   "#008763",
  primaryDim:     "rgba(0, 173, 126, 0.10)",
  primaryDimer:   "rgba(0, 173, 126, 0.05)",
  primaryMuted:   "rgba(0, 173, 126, 0.28)",
  primaryGlow:    "rgba(0, 173, 126, 0.35)",
  primaryOnText:  "#FFFFFF",

  error:        "#E03A57",
  errorDim:     "rgba(224, 58, 87, 0.10)",
  warning:      "#D9870F",
  warningDim:   "rgba(217, 135, 15, 0.12)",
  success:      "#00AD7E",
  successDim:   "rgba(0, 173, 126, 0.12)",
  info:         "#2F7DDF",
  infoDim:      "rgba(47, 125, 223, 0.10)",

  tabBar:        "#FFFFFF",
  tabBorder:     "#E1E8F2",
  tabActive:     "#00AD7E",
  tabInactive:   "#7B8CA5",

  shadow:        "#0A1322",
  scrim:         "rgba(10, 19, 34, 0.45)",
  statusBar:     "dark" as const,
};

export type ThemeColors = typeof DARK;

// Spacing / radius tokens for quick reuse in inline styles.
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  pill: 999,
};

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  button: {
    shadowColor: "#00D29A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  hero: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.30,
    shadowRadius: 26,
    elevation: 12,
  },
};
