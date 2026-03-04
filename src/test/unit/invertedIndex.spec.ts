import { describe, it, expect } from "vitest"
import { buildIndex, searchIndex, tokenize, MinHeap, type ScoredHit } from "../../services/InvertedIndex"

describe("tokenize", () => {
  it("splits camelCase", () => {
    expect(tokenize("formatDocument")).toEqual(["format", "document"])
  })

  it("handles dots and underscores", () => {
    expect(tokenize("editor.action.format_doc")).toEqual(["editor", "action", "format", "doc"])
  })
})

describe("buildIndex", () => {
  it("builds index from commands", () => {
    const index = buildIndex([
      { id: "cmd.a", label: "Format Document" },
      { id: "cmd.b", label: "Open File" },
      { id: "cmd.c", label: "Close Tab" },
    ])
    expect(index.documentCount).toBe(3)
    expect(index.avgDocLength).toBeGreaterThan(0)
  })

  it("creates posting lists", () => {
    const index = buildIndex([
      { id: "cmd.a", label: "Format Document" },
      { id: "cmd.b", label: "Format Selection" },
    ])
    const list = index.postings.get("format")
    expect(list).toBeDefined()
    expect(list).toHaveLength(2)
  })

  it("handles empty input", () => {
    const index = buildIndex([])
    expect(index.documentCount).toBe(0)
    expect(index.avgDocLength).toBe(0)
  })
})

describe("searchIndex", () => {
  const commands = [
    { id: "cmd.format", label: "Format Document" },
    { id: "cmd.open", label: "Open File" },
    { id: "cmd.close", label: "Close Tab" },
  ]
  const index = buildIndex(commands)

  it("finds exact matches", () => {
    const results = searchIndex(index, "format", 10)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].label).toBe("Format Document")
  })

  it("ranks by relevance", () => {
    const idx = buildIndex([
      { id: "cmd.gotoDef", label: "Go To Definition" },
      { id: "cmd.gotoFile", label: "Go To File" },
      { id: "cmd.toggleTerm", label: "Toggle Terminal" },
    ])
    const results = searchIndex(idx, "go definition", 10)
    expect(results[0].label).toBe("Go To Definition")
  })

  it("handles prefix matching", () => {
    const results = searchIndex(index, "for", 10)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].label).toBe("Format Document")
  })

  it("returns empty for no matches", () => {
    const results = searchIndex(index, "xyzxyz", 10)
    expect(results).toEqual([])
  })

  it("respects topK limit", () => {
    const bigIndex = buildIndex(
      Array.from({ length: 100 }, (_, i) => ({
        id: `cmd.${i}`,
        label: `Command ${i}`,
      }))
    )
    const results = searchIndex(bigIndex, "command", 5)
    expect(results).toHaveLength(5)
  })

  it("handles empty query", () => {
    const results = searchIndex(index, "", 10)
    expect(results).toEqual([])
  })
})

describe("MinHeap", () => {
  const makeScoredHit = (score: number): ScoredHit => ({
    docId: score,
    commandId: `cmd.${score}`,
    label: `Command ${score}`,
    score,
  })

  it("maintains min at top", () => {
    const heap = new MinHeap(10)
    heap.push(makeScoredHit(5))
    heap.push(makeScoredHit(3))
    heap.push(makeScoredHit(7))
    heap.push(makeScoredHit(1))
    expect(heap.items[0].score).toBe(1)
  })

  it("respects capacity", () => {
    const heap = new MinHeap(3)
    heap.push(makeScoredHit(1))
    heap.push(makeScoredHit(5))
    heap.push(makeScoredHit(3))
    heap.push(makeScoredHit(7))
    heap.push(makeScoredHit(9))
    const sorted = heap.toSorted()
    expect(sorted).toHaveLength(3)
    expect(sorted.map((h) => h.score)).toEqual([9, 7, 5])
  })

  it("toSorted returns descending", () => {
    const heap = new MinHeap(10)
    heap.push(makeScoredHit(2))
    heap.push(makeScoredHit(8))
    heap.push(makeScoredHit(4))
    heap.push(makeScoredHit(6))
    const sorted = heap.toSorted()
    const scores = sorted.map((h) => h.score)
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1])
    }
  })
})
