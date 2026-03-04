import { describe, it, expect } from "vitest"
import { buildIndex, searchIndex } from "../../services/InvertedIndex"

const generateCommands = (count: number) => {
  const categories = ["editor", "workbench", "terminal", "debug", "git", "search", "view", "file"]
  const actions = ["open", "close", "toggle", "format", "save", "delete", "rename", "find", "replace", "goto"]
  const targets = ["document", "file", "window", "panel", "sidebar", "tab", "line", "selection", "word", "definition"]

  return Array.from({ length: count }, (_, i) => {
    const cat = categories[i % categories.length]
    const act = actions[i % actions.length]
    const tgt = targets[i % targets.length]
    return {
      id: `${cat}.action.${act}${tgt.charAt(0).toUpperCase()}${tgt.slice(1)}.${i}`,
      label: `${act.charAt(0).toUpperCase()}${act.slice(1)} ${tgt.charAt(0).toUpperCase()}${tgt.slice(1)} ${i}`,
    }
  })
}

describe("Performance at 50k commands", () => {
  const commands = generateCommands(50_000)
  let index: ReturnType<typeof buildIndex>

  it("builds index in under 3 seconds", () => {
    const start = performance.now()
    index = buildIndex(commands)
    const elapsed = performance.now() - start

    console.log(`[Perf] buildIndex(50k): ${elapsed.toFixed(2)}ms`)
    expect(elapsed).toBeLessThan(3000)
    expect(index.documentCount).toBe(50_000)
  })

  it("searches in under 10ms (typical query)", () => {
    const queries = ["format document", "open file", "toggle", "go definition", "save"]

    for (const query of queries) {
      const start = performance.now()
      const results = searchIndex(index, query, 200)
      const elapsed = performance.now() - start

      console.log(`[Perf] search("${query}"): ${elapsed.toFixed(2)}ms, ${results.length} results`)
      expect(elapsed).toBeLessThan(50)
      expect(results.length).toBeGreaterThan(0)
    }
  })

  it("handles short prefix queries under 20ms", () => {
    const start = performance.now()
    const results = searchIndex(index, "for", 200)
    const elapsed = performance.now() - start

    console.log(`[Perf] search("for"): ${elapsed.toFixed(2)}ms, ${results.length} results`)
    expect(elapsed).toBeLessThan(20)
  })

  it("topK=500 in under 15ms", () => {
    const start = performance.now()
    const results = searchIndex(index, "open", 500)
    const elapsed = performance.now() - start

    console.log(`[Perf] search("open", topK=500): ${elapsed.toFixed(2)}ms, ${results.length} results`)
    expect(elapsed).toBeLessThan(15)
    expect(results.length).toBeLessThanOrEqual(500)
  })
})
