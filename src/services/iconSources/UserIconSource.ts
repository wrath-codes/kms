import { IconSource, IconResult } from "../IconService"

// ---------------------------------------------------------------------------
// User Icon Source Type
// ---------------------------------------------------------------------------

export interface UserIconSourceConfig {
  readonly id: string
  readonly name: string
  readonly priority: number
  readonly icons: Record<string, string>
}

// ---------------------------------------------------------------------------
// Builder (pure, exported for testing)
// ---------------------------------------------------------------------------

/**
 * Build an IconSource from user configuration.
 * Validates and converts user-defined icon mappings into an IconSource.
 */
export const buildUserIconSource = (config: UserIconSourceConfig): IconSource => {
  // Validate required fields
  if (!config.id || !config.name || typeof config.priority !== "number" || !config.icons) {
    throw new Error("Invalid user icon source config: missing required fields")
  }

  // Create a Map for fast lookup
  const iconMap = new Map(Object.entries(config.icons))

  return {
    id: config.id,
    name: config.name,
    priority: config.priority,
    supportsTheme: false, // User-defined sources are static by default

    resolve: (iconName: string): IconResult | null => {
      if (!iconName || !iconName.trim()) return null

      // Check if icon exists in user's mapping
      const trimmed = iconName.trim()
      const icon = iconMap.get(trimmed)

      if (icon) {
        return {
          icon,
          source: config.id,
          themeAware: false,
        }
      }

      return null
    },
  }
}
