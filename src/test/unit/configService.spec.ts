import { describe, expect } from "vitest"
import { it } from "@effect/vitest"
import { Effect } from "effect"
import { ConfigService, ConfigServiceLive } from "../../services/ConfigService"

it.layer(ConfigServiceLive)("ConfigService", (it) => {
  it.effect("starts with version 0", () =>
    Effect.gen(function* () {
      const cfg = yield* ConfigService
      const v = yield* cfg.version
      expect(v).toBe(0)
    })
  )

  it.effect("returns fallback for config values", () =>
    Effect.gen(function* () {
      const cfg = yield* ConfigService
      const val = yield* cfg.get("kms", "some.key", "default")
      expect(val).toBe("default")
    })
  )

  it.effect("snapshot returns initial state", () =>
    Effect.gen(function* () {
      const cfg = yield* ConfigService
      const snap = yield* cfg.snapshot
      expect(snap.version).toBe(0)
      expect(snap.values.size).toBe(0)
    })
  )
})
