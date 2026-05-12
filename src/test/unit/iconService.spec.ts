import { describe, it, expect } from "vitest"
import { it as effectIt } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { IconService, IconServiceLive } from "../../services/IconService"
import { NerdFontsSource } from "../../services/iconSources/NerdFontsSource"
import { CodiconsSource } from "../../services/iconSources/CodiconsSource"

describe("NerdFontsSource", () => {
  it("resolves valid Nerd Font glyph", () => {
    const result = NerdFontsSource.resolve("󰊢")
    expect(result).not.toBeNull()
    expect(result?.icon).toBe("󰊢")
    expect(result?.source).toBe("nerd-fonts")
    expect(result?.themeAware).toBe(false)
  })

  it("returns null for empty string", () => {
    const result = NerdFontsSource.resolve("")
    expect(result).toBeNull()
  })

  it("returns null for whitespace-only string", () => {
    const result = NerdFontsSource.resolve("   ")
    expect(result).toBeNull()
  })

  it("trims whitespace from icon", () => {
    const result = NerdFontsSource.resolve("  󰊢  ")
    expect(result).not.toBeNull()
    expect(result?.icon).toBe("󰊢")
  })

  it("accepts any non-empty string (no glyph validation)", () => {
    const result = NerdFontsSource.resolve("not-a-glyph")
    expect(result).not.toBeNull()
    expect(result?.icon).toBe("not-a-glyph")
  })
})

describe("CodiconsSource", () => {
  it("resolves codicon in $(name) format", () => {
    const result = CodiconsSource.resolve("$(check)")
    expect(result).not.toBeNull()
    expect(result?.icon).toBe("$(check)")
    expect(result?.source).toBe("codicons")
    expect(result?.themeAware).toBe(true)
  })

  it("resolves codicon in direct name format", () => {
    const result = CodiconsSource.resolve("check")
    expect(result).not.toBeNull()
    expect(result?.icon).toBe("$(check)")
    expect(result?.source).toBe("codicons")
  })

  it("returns null for unknown codicon", () => {
    const result = CodiconsSource.resolve("$(unknown-icon)")
    expect(result).toBeNull()
  })

  it("returns null for empty string", () => {
    const result = CodiconsSource.resolve("")
    expect(result).toBeNull()
  })

  it("returns null for whitespace-only string", () => {
    const result = CodiconsSource.resolve("   ")
    expect(result).toBeNull()
  })

  it("resolves common codicons", () => {
    const icons = ["file", "folder", "settings", "search", "debug", "terminal"]
    for (const icon of icons) {
      const result = CodiconsSource.resolve(icon)
      expect(result).not.toBeNull()
      expect(result?.icon).toBe(`$(${icon})`)
    }
  })

  it("has supportsTheme=true", () => {
    expect(CodiconsSource.supportsTheme).toBe(true)
  })

  it("has lower priority than Nerd Fonts", () => {
    expect(CodiconsSource.priority).toBeLessThan(NerdFontsSource.priority)
  })
})

effectIt.layer(IconServiceLive)("IconService", (it) => {
  it.effect("resolves with codicons source first", () =>
    Effect.gen(function* () {
      const iconService = yield* IconService
      yield* iconService.register(CodiconsSource)
      yield* iconService.register(NerdFontsSource)

      const result = yield* iconService.resolve("check")
      expect(result.source).toBe("codicons")
      expect(result.icon).toBe("$(check)")
    })
  )

  it("falls back to Nerd Fonts when codicon not found", () =>
    Effect.gen(function* () {
      const iconService = yield* IconService
      yield* iconService.register(CodiconsSource)
      yield* iconService.register(NerdFontsSource)

      const result = yield* iconService.resolve("󰊢")
      expect(result.source).toBe("nerd-fonts")
      expect(result.icon).toBe("󰊢")
    })
  )

  it("respects priority order during registration", () =>
    Effect.gen(function* () {
      const iconService = yield* IconService
      // Register in reverse order
      yield* iconService.register(NerdFontsSource)
      yield* iconService.register(CodiconsSource)

      // Codicons should still be tried first (lower priority number)
      const sources = yield* iconService.listSources()
      expect(sources[0].id).toBe("codicons")
      expect(sources[1].id).toBe("nerd-fonts")
    })
  )

  it("returns fallback when no source matches", () =>
    Effect.gen(function* () {
      const iconService = yield* IconService
      // Don't register any sources

      const result = yield* iconService.resolve("unknown")
      expect(result.source).toBe("fallback")
      expect(result.icon).toBe("unknown")
    })
  )

  it("returns dot fallback for empty string when no sources match", () =>
    Effect.gen(function* () {
      const iconService = yield* IconService
      // Don't register any sources

      const result = yield* iconService.resolve("")
      expect(result.source).toBe("fallback")
      expect(result.icon).toBe("•")
    })
  )

  it("listSources returns registered sources in priority order", () =>
    Effect.gen(function* () {
      const iconService = yield* IconService
      yield* iconService.register(CodiconsSource)
      yield* iconService.register(NerdFontsSource)

      const sources = yield* iconService.listSources()
      expect(sources).toHaveLength(2)
      expect(sources[0].priority).toBeLessThanOrEqual(sources[1].priority)
    })
  )

  it("can register custom sources with priority", () =>
    Effect.gen(function* () {
      const iconService = yield* IconService
      const customSource = {
        id: "custom",
        name: "Custom Icons",
        priority: 3, // Higher priority than codicons (5)
        supportsTheme: false,
        resolve: (iconName: string) =>
          iconName.startsWith("custom:")
            ? { icon: iconName, source: "custom", themeAware: false }
            : null,
      }

      yield* iconService.register(CodiconsSource)
      yield* iconService.register(customSource)
      yield* iconService.register(NerdFontsSource)

      const sources = yield* iconService.listSources()
      expect(sources[0].id).toBe("custom") // priority 3 = first
      expect(sources[1].id).toBe("codicons") // priority 5 = second
      expect(sources[2].id).toBe("nerd-fonts") // priority 10 = third
    })
  )

  it("tries custom source before codicons", () =>
    Effect.gen(function* () {
      const iconService = yield* IconService
      const customSource = {
        id: "custom",
        name: "Custom Icons",
        priority: 3,
        supportsTheme: false,
        resolve: (iconName: string) =>
          iconName === "my-icon"
            ? { icon: "custom-resolved", source: "custom", themeAware: false }
            : null,
      }

      yield* iconService.register(CodiconsSource)
      yield* iconService.register(customSource)

      const result = yield* iconService.resolve("my-icon")
      expect(result.source).toBe("custom")
      expect(result.icon).toBe("custom-resolved")
    })
  )
})
