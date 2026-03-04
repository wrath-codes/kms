import { describe, it, expect } from "vitest"
import { layer } from "@effect/vitest"
import { Effect } from "effect"
import { tokenize, RegistryService, RegistryServiceLive } from "../../services/RegistryService"
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

describe("tokenize", () => {
  it("splits camelCase", () => {
    expect(tokenize("formatDocument")).toEqual(["format", "document"])
  })

  it("splits dot notation", () => {
    expect(tokenize("editor.action.formatDocument")).toEqual(["editor", "action", "format", "document"])
  })

  it("splits underscores", () => {
    expect(tokenize("my_command_name")).toEqual(["my", "command", "name"])
  })

  it("handles empty string", () => {
    expect(tokenize("")).toEqual([])
  })

  it("lowercases everything", () => {
    expect(tokenize("GoToDefinition")).toEqual(["go", "to", "definition"])
  })
})

layer(RegistryServiceLive)("RegistryService", (it) => {
  it.effect("starts with empty snapshot", () =>
    Effect.gen(function* () {
      const registry = yield* RegistryService
      const snap = yield* registry.snapshot
      expect(snap.version).toBe(0)
      expect(snap.commands).toEqual([])
      expect(snap.groups).toEqual([])
    })
  )

  it.effect("registers commands and bumps version", () =>
    Effect.gen(function* () {
      const registry = yield* RegistryService
      const cmd1 = makeCommand("Format")
      const cmd2 = makeCommand("Lint")
      yield* registry.register([cmd1, cmd2])
      const snap = yield* registry.snapshot
      expect(snap.version).toBe(1)
      expect(snap.commands).toHaveLength(2)
      expect(snap.commands[0]).toEqual(cmd1)
      expect(snap.commands[1]).toEqual(cmd2)
    })
  )

  it.effect("registers groups", () =>
    Effect.gen(function* () {
      const registry = yield* RegistryService
      const group = new CommandGroup({
        key: "editing",
        name: "Editing",
        commands: [makeCommand("Format")],
      })
      yield* registry.registerGroup(group)
      const snap = yield* registry.snapshot
      expect(snap.groups).toHaveLength(1)
      expect(snap.groups[0]).toEqual(group)
    })
  )

  it.effect("increments version on each mutation", () =>
    Effect.gen(function* () {
      const registry = yield* RegistryService
      const before = yield* registry.version
      yield* registry.register([makeCommand("A")])
      yield* registry.register([makeCommand("B")])
      const after = yield* registry.version
      expect(after - before).toBe(2)
    })
  )
})
