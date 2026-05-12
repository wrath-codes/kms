import { Effect } from "effect"
import { IconService } from "../IconService"
import { NerdFontsSource } from "./NerdFontsSource"
import { CodiconsSource } from "./CodiconsSource"

/**
 * Initialize default icon sources.
 * Called on extension activation to register all available icon providers.
 * 
 * Execution order (via Effects):
 * 1. Register Codicons (priority 5)
 * 2. Register Nerd Fonts (priority 10)
 */
export const initializeDefaultIconSources = Effect.gen(function* () {
  const iconService = yield* IconService
  yield* iconService.register(CodiconsSource)
  yield* iconService.register(NerdFontsSource)
})
