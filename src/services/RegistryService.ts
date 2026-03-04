import { Context, Effect, Layer, Ref } from "effect"
import { Command, CommandGroup, RegistrySnapshot } from "../domain/types"

// ---------------------------------------------------------------------------
// Tokenize (pure, exported for testing)
// ---------------------------------------------------------------------------

export const tokenize = (text: string): readonly string[] =>
  text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[._\-:]/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0)

// ---------------------------------------------------------------------------
// Service Interface
// ---------------------------------------------------------------------------

export class RegistryService extends Context.Tag("RegistryService")<
  RegistryService,
  {
    readonly snapshot: Effect.Effect<RegistrySnapshot>
    readonly register: (commands: readonly Command[]) => Effect.Effect<void>
    readonly registerGroup: (group: CommandGroup) => Effect.Effect<void>
    readonly tokenize: (text: string) => readonly string[]
    readonly version: Effect.Effect<number>
  }
>() {}

// ---------------------------------------------------------------------------
// Live Implementation
// ---------------------------------------------------------------------------

export const RegistryServiceLive = Layer.effect(
  RegistryService,
  Effect.gen(function* () {
    const ref = yield* Ref.make(
      new RegistrySnapshot({
        version: 0,
        commands: [],
        groups: [],
        updatedAt: Date.now(),
      })
    )

    return {
      snapshot: Ref.get(ref),
      register: (commands: readonly Command[]) =>
        Ref.update(ref, (snap) =>
          new RegistrySnapshot({
            version: snap.version + 1,
            commands: [...snap.commands, ...commands],
            groups: snap.groups,
            updatedAt: Date.now(),
          })
        ),
      registerGroup: (group: CommandGroup) =>
        Ref.update(ref, (snap) =>
          new RegistrySnapshot({
            version: snap.version + 1,
            commands: snap.commands,
            groups: [...snap.groups, group],
            updatedAt: Date.now(),
          })
        ),
      tokenize,
      version: Ref.get(ref).pipe(Effect.map((s) => s.version)),
    }
  })
)
