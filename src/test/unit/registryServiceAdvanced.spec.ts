import { describe, expect } from "vitest"
import { it } from "@effect/vitest"
import { Effect } from "effect"
import { RegistryService } from "../../services/RegistryService"
import { RegistryServiceAdvancedLive } from "../../services/RegistryServiceAdvanced"
import { Command, CommandId, CommandGroup } from "../../domain/types"

const makeCommand = (label: string) =>
  new Command({
    id: CommandId(`test.${label.toLowerCase().replace(/\s/g, "")}`),
    label,
    description: undefined,
    category: undefined,
    keybinding: undefined,
    when: undefined,
  })

it.layer(RegistryServiceAdvancedLive)("RegistryServiceAdvanced", (it) => {
  it.effect("starts with empty snapshot", () =>
    Effect.gen(function* () {
      const registry = yield* RegistryService
      const snap = yield* registry.snapshot
      expect(snap.version).toBe(0)
      expect(snap.commands).toEqual([])
    })
  )

  it.effect("registers commands and rebuilds index", () =>
    Effect.gen(function* () {
      const registry = yield* RegistryService
      yield* registry.register([makeCommand("Format Document"), makeCommand("Open File")])
      const snap = yield* registry.snapshot
      expect(snap.commands).toHaveLength(2)
      expect(snap.version).toBe(1)
    })
  )

  it.effect("registers groups and bumps version", () =>
    Effect.gen(function* () {
      const registry = yield* RegistryService
      yield* registry.registerGroup(new CommandGroup({
        key: "f",
        name: "File",
        commands: [makeCommand("Save")],
      }))
      const snap = yield* registry.snapshot
      expect(snap.groups).toHaveLength(1)
    })
  )

  it.effect("tokenize works", () =>
    Effect.gen(function* () {
      const registry = yield* RegistryService
      expect(registry.tokenize("formatDocument")).toEqual(["format", "document"])
    })
  )
})
