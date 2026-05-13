import * as vscode from "vscode"
import { Effect } from "effect"
import type { IconSource } from "../IconService"
import { IconService } from "../IconService"
import { NerdFontsSource } from "./NerdFontsSource"
import { CodiconsSource } from "./CodiconsSource"
import { buildUserIconSource, UserIconSourceConfig } from "./UserIconSource"

/**
 * Initialize icon sources: built-in defaults + user-defined custom sources.
 * Called on extension activation.
 * 
 * Execution order (via Effects):
 * 1. Register user-defined sources (from kms.iconSources config)
 * 2. Register Codicons (priority 5)
 * 3. Register Nerd Fonts (priority 10)
 */
export const initializeDefaultIconSources = Effect.gen(function* () {
  const iconService = yield* IconService

  // Load user-defined sources from settings
  const userSources = yield* loadUserIconSources()
  for (const source of userSources) {
    yield* iconService.register(source)
  }

  // Register built-in sources (fallback)
  yield* iconService.register(CodiconsSource)
  yield* iconService.register(NerdFontsSource)
})

/**
 * Load user-defined icon sources from kms.iconSources config.
 * Returns empty array if config is missing or invalid.
 */
export const loadUserIconSources = (): Effect.Effect<readonly IconSource[]> =>
  Effect.sync(() => {
    const config = vscode.workspace.getConfiguration("kms")
    const userConfigs = config.get<UserIconSourceConfig[]>("iconSources", [])

    const sources: IconSource[] = []

    for (const userConfig of userConfigs) {
      try {
        const source = buildUserIconSource(userConfig)
        sources.push(source)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.warn(`[KMS] Skipping invalid icon source "${userConfig.id}": ${msg}`)
      }
    }

    return sources
  })
