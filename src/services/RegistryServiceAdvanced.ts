import { Effect, Layer, Ref } from "effect"
import { Command, CommandGroup, RegistrySnapshot } from "../domain/types"
import { RegistryService } from "./RegistryService"
import { buildIndex, tokenize, type InvertedIndex } from "./InvertedIndex"

export const RegistryServiceAdvancedLive = Layer.effect(
  RegistryService,
  Effect.gen(function* () {
    const snapshotRef = yield* Ref.make(
      new RegistrySnapshot({
        version: 0,
        commands: [],
        groups: [],
        updatedAt: Date.now(),
      })
    )
    const indexRef = yield* Ref.make<InvertedIndex | null>(null)

    const rebuildIndex = Effect.gen(function* () {
      const snap = yield* Ref.get(snapshotRef)
      // Collect all commands (top-level + from groups)
      const allCommands: { id: string; label: string }[] = []
      for (const cmd of snap.commands) {
        allCommands.push({ id: cmd.id, label: cmd.label })
      }
      for (const group of snap.groups) {
        for (const cmd of group.commands) {
          allCommands.push({ id: cmd.id, label: cmd.label })
        }
      }
      const index = buildIndex(allCommands)
      yield* Ref.set(indexRef, index)
    })

    return {
      snapshot: Ref.get(snapshotRef),
      register: (commands: readonly Command[]) =>
        Effect.gen(function* () {
          yield* Ref.update(snapshotRef, (snap) =>
            new RegistrySnapshot({
              version: snap.version + 1,
              commands: [...snap.commands, ...commands],
              groups: snap.groups,
              updatedAt: Date.now(),
            })
          )
          yield* rebuildIndex
        }),
      registerGroup: (group: CommandGroup) =>
        Effect.gen(function* () {
          yield* Ref.update(snapshotRef, (snap) =>
            new RegistrySnapshot({
              version: snap.version + 1,
              commands: snap.commands,
              groups: [...snap.groups, group],
              updatedAt: Date.now(),
            })
          )
          yield* rebuildIndex
        }),
      tokenize,
      version: Ref.get(snapshotRef).pipe(Effect.map((s) => s.version)),
    }
  })
)
