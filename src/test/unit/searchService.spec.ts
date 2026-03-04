import { describe, it, expect } from "vitest"
import { layer } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { scoreMatch, SearchService, SearchServiceLive } from "../../services/SearchService"
import { RegistryService, RegistryServiceLive } from "../../services/RegistryService"
import { Command, CommandId } from "../../domain/types"

const makeCommand = (label: string, id?: string) =>
  new Command({
    id: CommandId(id ?? `test.${label.toLowerCase().replace(/\s/g, "")}`),
    label,
    description: undefined,
    category: undefined,
    keybinding: undefined,
    when: undefined,
  })

describe("scoreMatch", () => {
  it("returns all commands on empty query", () => {
    const cmd = makeCommand("Format Document")
    const result = scoreMatch("", cmd)
    expect(result).not.toBeNull()
    expect(result!.score).toBe(0)
    expect(result!.command).toEqual(cmd)
  })

  it("matches exact token", () => {
    const result = scoreMatch("format", makeCommand("Format Document"))
    expect(result).not.toBeNull()
    expect(result!.score).toBeCloseTo(1.0)
  })

  it("matches prefix", () => {
    const result = scoreMatch("for", makeCommand("Format Document"))
    expect(result).not.toBeNull()
    expect(result!.score).toBeCloseTo(0.7)
  })

  it("returns null on no match", () => {
    const result = scoreMatch("xyz", makeCommand("Format Document"))
    expect(result).toBeNull()
  })

  it("scores exact higher than prefix", () => {
    const exact = scoreMatch("format", makeCommand("Format Document"))
    const prefix = scoreMatch("for", makeCommand("Format Document"))
    expect(exact).not.toBeNull()
    expect(prefix).not.toBeNull()
    expect(exact!.score).toBeGreaterThan(prefix!.score)
  })
})

const TestLayer = Layer.mergeAll(
  RegistryServiceLive,
  SearchServiceLive.pipe(Layer.provide(RegistryServiceLive))
)

layer(TestLayer)("SearchService", (it) => {
  it.effect("returns empty results for empty registry", () =>
    Effect.gen(function* () {
      const search = yield* SearchService
      const results = yield* search.search("anything")
      expect(results).toEqual([])
    })
  )

  it.effect("finds registered commands", () =>
    Effect.gen(function* () {
      const registry = yield* RegistryService
      const search = yield* SearchService

      yield* registry.register([
        makeCommand("Format Document"),
        makeCommand("Toggle Sidebar"),
      ])

      const results = yield* search.search("format")
      expect(results.length).toBe(1)
      expect(results[0].command.label).toBe("Format Document")
    })
  )

  it.effect("sorts results by score descending", () =>
    Effect.gen(function* () {
      const registry = yield* RegistryService
      const search = yield* SearchService

      yield* registry.register([
        makeCommand("Open File"),
        makeCommand("Open Recent"),
        makeCommand("Open Folder"),
      ])

      const results = yield* search.search("open")
      expect(results.length).toBe(3)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
      }
    })
  )
})
