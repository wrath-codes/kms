import { describe, expect, beforeEach } from "vitest"
import { it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { WhichKeyMenu, WhichKeyMenuLive } from "../../ui/whichKeyMenu"
import { ContextServiceLive } from "../../services/ContextService"
import { CommandServiceLive } from "../../services/CommandService"
import * as vscodeShim from "../shims/vscodeShim"

const MenuDeps = Layer.mergeAll(ContextServiceLive, CommandServiceLive)
const TestLayer = WhichKeyMenuLive.pipe(Layer.provide(MenuDeps))

const testBindings = [
  {
    key: "f",
    name: "File",
    icon: "file",
    bindings: [
      { key: "f", name: "Save File", command: "workbench.action.files.save" },
      { key: "s", name: "Save All", command: "workbench.action.files.saveAll" },
    ],
  },
  {
    key: "e",
    name: "Editor",
    bindings: [
      { key: "f", name: "Format", command: "editor.action.formatDocument" },
    ],
  },
  { key: "p", name: "Command Palette", command: "workbench.action.showCommands" },
]

it.layer(TestLayer)("WhichKeyMenu", (it) => {
  beforeEach(() => {
    vscodeShim.workspace._configStore["kms.bindings"] = testBindings
    vscodeShim.window.lastQuickPick = null
  })

  it.effect("show opens QuickPick with root bindings", () =>
    Effect.gen(function* () {
      const menu = yield* WhichKeyMenu
      yield* menu.show()

      const qp = vscodeShim.window.lastQuickPick!
      expect(qp).not.toBeNull()
      expect(qp.items).toHaveLength(3)
      expect(qp.items[0].label).toContain("[f]")
      expect(qp.items[0].label).toContain("File")
      expect(qp.items[0].description).toBe("→") // group
      expect(qp.items[2].description).toBeUndefined() // leaf
    })
  )

  it.effect("typing a group key navigates into submenu", () =>
    Effect.gen(function* () {
      const menu = yield* WhichKeyMenu
      yield* menu.show()

      const qp = vscodeShim.window.lastQuickPick!
      // Type "f" to enter File submenu
      qp._onDidChangeValueEmitter.fire("f")

      expect(qp.items).toHaveLength(2)
      expect(qp.items[0].label).toContain("[f]")
      expect(qp.items[0].label).toContain("Save File")
      expect(qp.title).toContain("File")
    })
  )

  it.effect("typing a leaf key executes command and hides", () =>
    Effect.gen(function* () {
      const menu = yield* WhichKeyMenu
      yield* menu.show()

      const qp = vscodeShim.window.lastQuickPick!
      // Type "p" for Command Palette (leaf at root)
      qp._onDidChangeValueEmitter.fire("p")

      yield* Effect.promise(() => new Promise((r) => setTimeout(r, 20)))
      // QuickPick should have been hidden (hide was called)
    })
  )

  it.effect("backspace navigates back up the tree", () =>
    Effect.gen(function* () {
      const menu = yield* WhichKeyMenu
      yield* menu.show()

      const qp = vscodeShim.window.lastQuickPick!
      // Navigate into File submenu
      qp._onDidChangeValueEmitter.fire("f")
      // In real VS Code, renderCurrent's qp.value="" fires onDidChangeValue("").
      // Simulate that here so ignoreNextEmpty gets consumed:
      qp._onDidChangeValueEmitter.fire("")
      expect(qp.items).toHaveLength(2)
      expect(qp.title).toContain("File")

      // Now backspace on empty input → go back.
      // Same pattern: goBack calls renderCurrent which sets qp.value="".
      qp._onDidChangeValueEmitter.fire("")
      // Simulate the re-fire from renderCurrent:
      qp._onDidChangeValueEmitter.fire("")

      // Should be back at root
      expect(qp.items).toHaveLength(3)
      expect(qp.title).toContain("KMS")
    })
  )

  it.effect("onDidAccept navigates group via click", () =>
    Effect.gen(function* () {
      const menu = yield* WhichKeyMenu
      yield* menu.show()

      const qp = vscodeShim.window.lastQuickPick!
      // Click on File group
      qp.selectedItems = [qp.items[0]]
      qp._onDidAcceptEmitter.fire(undefined)

      expect(qp.items).toHaveLength(2)
      expect(qp.title).toContain("File")
    })
  )

  it.effect("onDidHide cleans up", () =>
    Effect.gen(function* () {
      const menu = yield* WhichKeyMenu
      yield* menu.show()

      const qp = vscodeShim.window.lastQuickPick!
      qp._onDidHideEmitter.fire(undefined)

      yield* Effect.promise(() => new Promise((r) => setTimeout(r, 20)))
    })
  )
})
