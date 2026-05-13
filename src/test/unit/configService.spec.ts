import { describe, expect } from "vitest"
import { it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { ConfigService, ConfigServiceLive } from "../../services/ConfigService"
import { IconServiceLive } from "../../services/IconService"
import { CodiconsSource } from "../../services/iconSources/CodiconsSource"
import { NerdFontsSource } from "../../services/iconSources/NerdFontsSource"

const TestConfigLayer = ConfigServiceLive.pipe(Layer.provide(IconServiceLive))

it.layer(TestConfigLayer)("ConfigService", (it) => {
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

  it.effect("validateIcon rejects empty string", () =>
    Effect.gen(function* () {
      const cfg = yield* ConfigService
      const result = yield* cfg.validateIcon("")
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })
  )

  it.effect("validateIcon rejects whitespace-only string", () =>
    Effect.gen(function* () {
      const cfg = yield* ConfigService
      const result = yield* cfg.validateIcon("   ")
      expect(result.valid).toBe(false)
    })
  )

  it.effect("validateIcon returns error for unknown icons", () =>
    Effect.gen(function* () {
      const cfg = yield* ConfigService
      const result = yield* cfg.validateIcon("unknown-icon-xyz-12345")
      expect(result.valid).toBe(false)
      expect(result.error).toContain("not found")
    })
  )
})
