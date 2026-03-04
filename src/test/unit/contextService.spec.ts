import { describe, expect } from "vitest"
import { it } from "@effect/vitest"
import { Effect } from "effect"
import { ContextService, ContextServiceLive } from "../../services/ContextService"

describe("ContextService", () => {
  it.layer(ContextServiceLive)("starts with empty pending", (it) => {
    it.effect("starts with empty pending", () =>
      Effect.gen(function* () {
        const ctx = yield* ContextService
        const pending = yield* ctx.pending
        expect(pending.size).toBe(0)
      })
    )
  })

  it.layer(ContextServiceLive)("adds entries to pending", (it) => {
    it.effect("adds entries to pending", () =>
      Effect.gen(function* () {
        const ctx = yield* ContextService
        yield* ctx.set("a", 1)
        yield* ctx.set("b", "hello")
        const pending = yield* ctx.pending
        expect(pending.size).toBe(2)
        expect(pending.get("a")).toBe(1)
        expect(pending.get("b")).toBe("hello")
      })
    )
  })

  it.layer(ContextServiceLive)("overwrites duplicate keys in pending", (it) => {
    it.effect("overwrites duplicate keys in pending", () =>
      Effect.gen(function* () {
        const ctx = yield* ContextService
        yield* ctx.set("a", 1)
        yield* ctx.set("a", 2)
        const pending = yield* ctx.pending
        expect(pending.size).toBe(1)
        expect(pending.get("a")).toBe(2)
      })
    )
  })

  it.layer(ContextServiceLive)("flushNow clears pending", (it) => {
    it.effect("flushNow clears pending", () =>
      Effect.gen(function* () {
        const ctx = yield* ContextService
        yield* ctx.set("a", 1)
        yield* ctx.flushNow
        const pending = yield* ctx.pending
        expect(pending.size).toBe(0)
      })
    )
  })

  it.layer(ContextServiceLive)("flushNow deduplicates unchanged values", (it) => {
    it.effect("flushNow deduplicates unchanged values", () =>
      Effect.gen(function* () {
        const ctx = yield* ContextService
        yield* ctx.set("a", 1)
        yield* ctx.flushNow
        yield* ctx.set("a", 1)
        yield* ctx.flushNow
        const pending = yield* ctx.pending
        expect(pending.size).toBe(0)
      })
    )
  })
})
