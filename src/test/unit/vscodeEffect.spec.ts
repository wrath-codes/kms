import { describe, it, expect } from "vitest"
import { it as effectIt } from "@effect/vitest"
import { Effect } from "effect"
import { VscodeError, fromVscode, execCommand, execSetContext, getConfig } from "../../services/VscodeEffect"

describe("VscodeEffect", () => {
  it("VscodeError has correct tag", () => {
    const err = new VscodeError({ op: "test", cause: "boom" })
    expect(err._tag).toBe("VscodeError")
  })

  effectIt.effect("fromVscode wraps successful thenable", () =>
    Effect.gen(function* () {
      const result = yield* fromVscode("test", () => Promise.resolve(42))
      expect(result).toBe(42)
    })
  )

  effectIt.effect("fromVscode wraps failed thenable", () =>
    fromVscode("test", () => Promise.reject("fail")).pipe(
      Effect.catchTag("VscodeError", (e) => {
        expect(e.op).toBe("test")
        return Effect.void
      })
    )
  )

  effectIt.effect("execCommand resolves", () =>
    Effect.gen(function* () {
      const result = yield* execCommand("noop")
      expect(result).toBe(undefined)
    })
  )

  effectIt.effect("execSetContext resolves", () =>
    Effect.gen(function* () {
      yield* execSetContext("key", true)
    })
  )

  effectIt.effect("getConfig returns fallback", () =>
    Effect.gen(function* () {
      const val = yield* getConfig("kms", "missing", "fallback")
      expect(val).toBe("fallback")
    })
  )
})
