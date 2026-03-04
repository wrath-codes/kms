import * as vscode from "vscode"
import { Context, Effect, Layer, Ref } from "effect"
import { ConfigSnapshot } from "../domain/types"

export class ConfigService extends Context.Tag("ConfigService")<
  ConfigService,
  {
    readonly get: <A>(section: string, key: string, fallback: A) => Effect.Effect<A>
    readonly snapshot: Effect.Effect<ConfigSnapshot>
    readonly version: Effect.Effect<number>
  }
>() {}

export const ConfigServiceLive = Layer.scoped(
  ConfigService,
  Effect.gen(function* () {
    const ref = yield* Ref.make(new ConfigSnapshot({ values: new Map(), version: 0 }))

    const disposable = vscode.workspace.onDidChangeConfiguration(() => {
      Effect.runSync(Ref.update(ref, (snap) => new ConfigSnapshot({ values: new Map(), version: snap.version + 1 })))
    })

    yield* Effect.addFinalizer(() => Effect.sync(() => disposable.dispose()))

    return {
      get: <A>(section: string, key: string, fallback: A) =>
        Effect.sync(() => vscode.workspace.getConfiguration(section).get<A>(key, fallback)),
      snapshot: Ref.get(ref),
      version: Ref.get(ref).pipe(Effect.map((s) => s.version)),
    }
  })
)
