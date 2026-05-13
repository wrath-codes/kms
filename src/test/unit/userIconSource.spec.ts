import { describe, it, expect } from "vitest"
import { buildUserIconSource, UserIconSourceConfig } from "../../services/iconSources/UserIconSource"

describe("UserIconSource", () => {
  describe("buildUserIconSource", () => {
    it("creates source from valid config", () => {
      const config: UserIconSourceConfig = {
        id: "emoji",
        name: "Emoji Icons",
        priority: 3,
        icons: { happy: "😀", sad: "😢" },
      }

      const source = buildUserIconSource(config)
      expect(source.id).toBe("emoji")
      expect(source.name).toBe("Emoji Icons")
      expect(source.priority).toBe(3)
      expect(source.supportsTheme).toBe(false)
    })

    it("resolves user-defined icons", () => {
      const config: UserIconSourceConfig = {
        id: "custom",
        name: "Custom",
        priority: 5,
        icons: { check: "✔", cross: "✖" },
      }

      const source = buildUserIconSource(config)
      const result = source.resolve("check")
      expect(result).not.toBeNull()
      expect(result?.icon).toBe("✔")
      expect(result?.source).toBe("custom")
      expect(result?.themeAware).toBe(false)
    })

    it("returns null for unknown icons", () => {
      const config: UserIconSourceConfig = {
        id: "custom",
        name: "Custom",
        priority: 5,
        icons: { check: "✔" },
      }

      const source = buildUserIconSource(config)
      const result = source.resolve("unknown")
      expect(result).toBeNull()
    })

    it("returns null for empty string", () => {
      const config: UserIconSourceConfig = {
        id: "custom",
        name: "Custom",
        priority: 5,
        icons: { test: "T" },
      }

      const source = buildUserIconSource(config)
      expect(source.resolve("")).toBeNull()
    })

    it("returns null for whitespace-only string", () => {
      const config: UserIconSourceConfig = {
        id: "custom",
        name: "Custom",
        priority: 5,
        icons: { test: "T" },
      }

      const source = buildUserIconSource(config)
      expect(source.resolve("   ")).toBeNull()
    })

    it("trims whitespace from icon names", () => {
      const config: UserIconSourceConfig = {
        id: "custom",
        name: "Custom",
        priority: 5,
        icons: { check: "✔" },
      }

      const source = buildUserIconSource(config)
      const result = source.resolve("  check  ")
      expect(result).not.toBeNull()
      expect(result?.icon).toBe("✔")
    })

    it("throws error on missing id", () => {
      const config = { name: "Test", priority: 5, icons: {} } as any
      expect(() => buildUserIconSource(config)).toThrow()
    })

    it("throws error on missing name", () => {
      const config = { id: "test", priority: 5, icons: {} } as any
      expect(() => buildUserIconSource(config)).toThrow()
    })

    it("throws error on missing priority", () => {
      const config = { id: "test", name: "Test", icons: {} } as any
      expect(() => buildUserIconSource(config)).toThrow()
    })

    it("throws error on missing icons", () => {
      const config = { id: "test", name: "Test", priority: 5 } as any
      expect(() => buildUserIconSource(config)).toThrow()
    })

    it("supports multiple user icons", () => {
      const config: UserIconSourceConfig = {
        id: "emoji",
        name: "Emoji",
        priority: 3,
        icons: {
          happy: "😀",
          sad: "😢",
          fire: "🔥",
          check: "✔",
          cross: "✖",
        },
      }

      const source = buildUserIconSource(config)
      expect(source.resolve("happy")?.icon).toBe("😀")
      expect(source.resolve("fire")?.icon).toBe("🔥")
      expect(source.resolve("cross")?.icon).toBe("✖")
      expect(source.resolve("unknown")).toBeNull()
    })

    it("returns source id in resolve result", () => {
      const config: UserIconSourceConfig = {
        id: "my-custom-source",
        name: "My Custom",
        priority: 7,
        icons: { star: "⭐" },
      }

      const source = buildUserIconSource(config)
      const result = source.resolve("star")
      expect(result?.source).toBe("my-custom-source")
    })
  })
})
