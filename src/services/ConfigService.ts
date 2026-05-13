import * as vscode from "vscode"
import { Context, Effect, Layer, Ref } from "effect"
import { ConfigSnapshot } from "../domain/types"
import { IconService } from "./IconService"

// ---------------------------------------------------------------------------
// Icon Validation Result
// ---------------------------------------------------------------------------

export interface IconValidationResult {
  readonly valid: boolean
  readonly source?: string
  readonly error?: string
}

/**
 * Configuration service for KMS settings.
 * 
 * Caches VS Code workspace configuration with version tracking.
 * Configuration is invalidated on `onDidChangeConfiguration` events.
 * Provides icon validation against registered sources.
 */
export class ConfigService extends Context.Tag("ConfigService")<
  ConfigService,
  {
    readonly get: <A>(section: string, key: string, fallback: A) => Effect.Effect<A>
    readonly snapshot: Effect.Effect<ConfigSnapshot>
    readonly version: Effect.Effect<number>
    readonly validateIcon: (iconString: string) => Effect.Effect<IconValidationResult>
  }
>() {}

export const ConfigServiceLive = Layer.scoped(
  ConfigService,
  Effect.gen(function* () {
    const ref = yield* Ref.make(new ConfigSnapshot({ values: new Map(), version: 0 }))
    const iconService = yield* IconService

    const disposable = vscode.workspace.onDidChangeConfiguration(() => {
      Effect.runSync(Ref.update(ref, (snap) => new ConfigSnapshot({ values: new Map(), version: snap.version + 1 })))
    })

    yield* Effect.addFinalizer(() => Effect.sync(() => disposable.dispose()))

    return {
      get: <A>(section: string, key: string, fallback: A) =>
        Effect.sync(() => vscode.workspace.getConfiguration(section).get<A>(key, fallback)),
      snapshot: Ref.get(ref),
      version: Ref.get(ref).pipe(Effect.map((s) => s.version)),
      validateIcon: (iconString: string) =>
        Effect.gen(function* () {
          if (!iconString || !iconString.trim()) {
            return { valid: false, error: "Icon cannot be empty" }
          }

          const result = yield* iconService.resolve(iconString)

          if (result.source === "fallback") {
            return {
              valid: false,
              error: `Icon "${iconString}" not found. Check codicon names at https://github.com/microsoft/vscode-codicons or use a Nerd Font glyph.`,
            }
          }

          return { valid: true, source: result.source }
        }),
    }
  })
)
