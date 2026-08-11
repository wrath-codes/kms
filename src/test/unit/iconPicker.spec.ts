import { describe, it, expect, vi } from "vitest"
import { Effect, ManagedRuntime } from "effect"
import { buildIconList, IconPickerUI } from "../../ui/iconPicker"
import { MainLayer } from "../../layers/MainLayer"
import { initializeDefaultIconSources } from "../../services/iconSources"
import * as vscodeShim from "../shims/vscodeShim"

describe("IconPicker", () => {
  describe("buildIconList", () => {
    it("returns empty array when no sources available", () => {
      const icons = buildIconList(false, false)
      expect(icons).toHaveLength(0)
    })

    it("includes codicons when codicons source available", () => {
      const icons = buildIconList(true, false)
      expect(icons.length).toBeGreaterThan(0)
      const codiconIcons = icons.filter((i) => i.source === "codicons")
      expect(codiconIcons.length).toBeGreaterThan(0)
      expect(codiconIcons[0].label).toContain("$")
    })

    it("includes nerd fonts when nerd fonts source available", () => {
      const icons = buildIconList(false, true)
      expect(icons.length).toBeGreaterThan(0)
      const nerdFontIcons = icons.filter((i) => i.source === "nerd-fonts")
      expect(nerdFontIcons.length).toBeGreaterThan(0)
      expect(nerdFontIcons[0].source).toBe("nerd-fonts")
    })

    it("includes both sources when both available", () => {
      const icons = buildIconList(true, true)
      expect(icons.length).toBeGreaterThan(10)
      const codiconCount = icons.filter((i) => i.source === "codicons").length
      const nerdFontCount = icons.filter((i) => i.source === "nerd-fonts").length
      expect(codiconCount).toBeGreaterThan(0)
      expect(nerdFontCount).toBeGreaterThan(0)
    })

    it("returns sorted icons by label", () => {
      const icons = buildIconList(true, true)
      for (let i = 0; i < icons.length - 1; i++) {
        expect(icons[i].label.localeCompare(icons[i + 1].label)).toBeLessThanOrEqual(0)
      }
    })

    it("codicon option has correct structure", () => {
      const icons = buildIconList(true, false)
      const check = icons.find((i) => i.value === "$(check)")
      expect(check).toBeDefined()
      expect(check?.label).toContain("$(check)")
      expect(check?.description).toContain("codicons")
      expect(check?.detail).toContain('"icon"')
      expect(check?.themeAware).toBe(true)
    })

    it("nerd font option has correct structure", () => {
      const icons = buildIconList(false, true)
      const fileIcon = icons.find((i) => i.source === "nerd-fonts" && i.label.includes("File"))
      expect(fileIcon).toBeDefined()
      expect(fileIcon?.description).toContain("nerd-fonts")
      expect(fileIcon?.detail).toContain('"icon"')
      expect(fileIcon?.themeAware).toBe(false)
    })

    it("supports both $(name) and name formats for codicons in detail", () => {
      const icons = buildIconList(true, false)
      const check = icons.find((i) => i.value === "$(check)")
      expect(check?.detail).toContain("$(check)")
      expect(check?.detail).toContain("check")
    })
  })

  it("shows icons initialized through the main runtime", async () => {
    const runtime = ManagedRuntime.make(MainLayer)

    try {
      await runtime.runPromise(initializeDefaultIconSources)

      const result = runtime.runPromise(
        Effect.gen(function* () {
          const picker = yield* IconPickerUI
          return yield* picker.show()
        })
      )

      await vi.waitFor(() => expect(vscodeShim.window.lastQuickPick).not.toBeNull())

      const quickPick = vscodeShim.window.lastQuickPick!
      expect(quickPick.items.length).toBeGreaterThan(0)

      quickPick._onDidHideEmitter.fire(undefined)
      await expect(result).resolves.toBeUndefined()
    } finally {
      await runtime.dispose()
    }
  })
})
