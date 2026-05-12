import { Context, Effect, Layer, Ref } from "effect"

// ---------------------------------------------------------------------------
// Icon Source Interface & Types
// ---------------------------------------------------------------------------

/**
 * Result from icon resolution through a source.
 */
export type IconResult = {
  readonly icon: string
  readonly source: string
  readonly themeAware: boolean
}

/**
 * Interface for pluggable icon providers.
 * Sources are tried in priority order (lower number = higher priority).
 */
export interface IconSource {
  readonly id: string // e.g., "nerd-fonts", "codicons", "custom-icons"
  readonly name: string
  readonly priority: number // Lower = tried first in fallback chain
  readonly supportsTheme: boolean // Does it respect light/dark theme?
  /**
   * Attempt to resolve an icon name using this source.
   * Returns null if the icon is not recognized by this source.
   */
  readonly resolve: (iconName: string) => IconResult | null
}

// ---------------------------------------------------------------------------
// Service Interface
// ---------------------------------------------------------------------------

/**
 * Icon service for resolving icons across multiple pluggable sources.
 * 
 * Supports fast querying with automatic fallback chain:
 * Codicons (theme-aware) → Nerd Fonts (static) → Custom → Fallback
 */
export class IconService extends Context.Tag("IconService")<
  IconService,
  {
    readonly register: (source: IconSource) => Effect.Effect<void>
    readonly resolve: (iconName: string) => Effect.Effect<IconResult>
    readonly listSources: () => Effect.Effect<readonly IconSource[]>
  }
>() {}

// ---------------------------------------------------------------------------
// Live Implementation
// ---------------------------------------------------------------------------

export const IconServiceLive = Layer.effect(
  IconService,
  Effect.gen(function* () {
    const sourcesRef = yield* Ref.make<IconSource[]>([])

    return {
      register: (source: IconSource) =>
        Ref.update(sourcesRef, (sources) =>
          // Add source and sort by priority (lower number = first)
          [...sources, source].sort((a, b) => a.priority - b.priority)
        ),

      resolve: (iconName: string) =>
        Effect.gen(function* () {
          const sources = yield* Ref.get(sourcesRef)

          // Try each source in priority order
          for (const source of sources) {
            const result = source.resolve(iconName)
            if (result) return result
          }

          // Fallback: return as-is if no source matched
          return {
            icon: iconName || "•",
            source: "fallback",
            themeAware: false,
          }
        }),

      listSources: () => Ref.get(sourcesRef),
    }
  })
)
