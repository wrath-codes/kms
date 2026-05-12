import { IconSource, IconResult } from "../IconService"

/**
 * Nerd Fonts icon source.
 *
 * Accepts Nerd Font glyphs directly (e.g., "󰊢", "󰍉").
 * Returns null for empty, non-string, or whitespace-only values.
 * Does not validate against a specific glyph set — accepts any non-empty string.
 *
 * Priority: 10 (lower than codicons, so codicons are tried first).
 */
export const NerdFontsSource: IconSource = {
  id: "nerd-fonts",
  name: "Nerd Fonts",
  priority: 10,
  supportsTheme: false,

  resolve: (iconName: string): IconResult | null => {
    const trimmed = iconName?.trim()
    if (!trimmed) return null

    return {
      icon: trimmed,
      source: "nerd-fonts",
      themeAware: false,
    }
  },
}
