import { describe, it, expect } from "vitest"
import { it as effectIt } from "@effect/vitest"
import { Effect } from "effect"
import { toRenderItem, RenderModelService, RenderModelServiceLive, PAGE_SIZE } from "../../services/RenderModelService"
import { Command, CommandId, SearchResult, MatchRange } from "../../domain/types"

const makeCommand = (label: string, opts?: { keybinding?: string; category?: string; description?: string }) =>
  new Command({
    id: CommandId(`test.${label.toLowerCase().replace(/\s/g, "")}`),
    label,
    description: opts?.description,
    category: opts?.category,
    keybinding: opts?.keybinding,
    when: undefined,
  })

const makeResult = (label: string, score: number, opts?: { keybinding?: string; category?: string }) =>
  new SearchResult({
    command: makeCommand(label, opts),
    score,
    matches: [],
  })

describe("toRenderItem", () => {
  it("renders basic command", () => {
    const result = makeResult("Format", 1)
    const item = toRenderItem(result)
    expect(item.label).toBe("Format")
  })

  it("renders command with keybinding", () => {
    const result = makeResult("Format", 1, { keybinding: "Ctrl+F" })
    const item = toRenderItem(result)
    expect(item.label).toBe("$(key) Format")
  })

  it("includes category as description", () => {
    const result = makeResult("Format", 1, { category: "Editor" })
    const item = toRenderItem(result)
    expect(item.description).toBe("Editor")
  })
})

effectIt.layer(RenderModelServiceLive)("RenderModelService", (it) => {
  it.effect("renders search results", () =>
    Effect.gen(function* () {
      const renderer = yield* RenderModelService
      const results = [makeResult("Open", 1), makeResult("Close", 0.5)]
      const model = yield* renderer.render(results, "oc", 1)
      expect(model.items).toHaveLength(2)
      expect(model.version).toBe(1)
      expect(model.query).toBe("oc")
    })
  )

  it.effect("caches render model", () =>
    Effect.gen(function* () {
      const renderer = yield* RenderModelService
      const results = [makeResult("Open", 1)]
      const a = yield* renderer.render(results, "o", 1)
      const b = yield* renderer.render(results, "o", 1)
      expect(a === b).toBe(true)
    })
  )

  it.effect("invalidates on different version", () =>
    Effect.gen(function* () {
      const renderer = yield* RenderModelService
      const results = [makeResult("Open", 1)]
      const a = yield* renderer.render(results, "o", 1)
      const b = yield* renderer.render(results, "o", 2)
      expect(a === b).toBe(false)
    })
  )

  it.effect("clearCache resets the cache", () =>
    Effect.gen(function* () {
      const renderer = yield* RenderModelService
      const results = [makeResult("Open", 1)]
      const a = yield* renderer.render(results, "o", 1)
      yield* renderer.clearCache
      const b = yield* renderer.render(results, "o", 1)
      expect(a === b).toBe(false)
    })
  )

  it.effect("evicts oldest when cache exceeds 50", () =>
    Effect.gen(function* () {
      const renderer = yield* RenderModelService
      const results = [makeResult("Open", 1)]
      for (let i = 0; i < 51; i++) {
        yield* renderer.render(results, `query-${i}`, 1)
      }
      const model = yield* renderer.render(results, "query-51", 1)
      expect(model.items).toHaveLength(1)
      expect(model.query).toBe("query-51")
    })
  )

  it.effect("renderPage slices results by page", () =>
    Effect.gen(function* () {
      const renderer = yield* RenderModelService
      const results = Array.from({ length: 250 }, (_, i) => makeResult(`Cmd ${i}`, 1 - i / 250))
      const page0 = yield* renderer.renderPage(results, "test", 1, 0)
      expect(page0.items).toHaveLength(PAGE_SIZE)
      expect(page0.items[0].label).toBe("Cmd 0")

      const page1 = yield* renderer.renderPage(results, "test", 1, 1)
      expect(page1.items).toHaveLength(50)
      expect(page1.items[0].label).toBe(`Cmd ${PAGE_SIZE}`)
    })
  )

  it.effect("renderPage caches independently per page", () =>
    Effect.gen(function* () {
      const renderer = yield* RenderModelService
      const results = Array.from({ length: 250 }, (_, i) => makeResult(`Cmd ${i}`, 1))
      const a = yield* renderer.renderPage(results, "q", 1, 0)
      const b = yield* renderer.renderPage(results, "q", 1, 0)
      expect(a === b).toBe(true)

      const c = yield* renderer.renderPage(results, "q", 1, 1)
      expect(a === c).toBe(false)
    })
  )
})
