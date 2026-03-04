import * as vscode from "vscode"
import { Context, Effect, Layer } from "effect"
import { BindingGroup, BindingLeaf, type BindingNode } from "../domain/types"
import { ContextService } from "../services/ContextService"
import { CommandService } from "../services/CommandService"

// ---------------------------------------------------------------------------
// QuickPick item carrying a binding node
// ---------------------------------------------------------------------------

interface WhichKeyItem extends vscode.QuickPickItem {
  readonly node: BindingNode
}

// ---------------------------------------------------------------------------
// Parse raw JSON from settings into typed BindingNode[]
// ---------------------------------------------------------------------------

const parseBindings = (raw: unknown): BindingNode[] => {
  if (!Array.isArray(raw)) return []
  return raw.map((entry: any): BindingNode => {
    if (Array.isArray(entry.bindings)) {
      return new BindingGroup({
        key: String(entry.key ?? ""),
        name: String(entry.name ?? ""),
        icon: entry.icon ?? undefined,
        bindings: parseBindings(entry.bindings),
      })
    }
    return new BindingLeaf({
      key: String(entry.key ?? ""),
      name: String(entry.name ?? ""),
      icon: entry.icon ?? undefined,
      command: String(entry.command ?? ""),
      args: entry.args ?? undefined,
    })
  })
}

// ---------------------------------------------------------------------------
// Render a level of the binding tree as QuickPick items
// ---------------------------------------------------------------------------

const renderLevel = (nodes: readonly BindingNode[]): WhichKeyItem[] =>
  nodes.map((node) => {
    const prefix = node.icon ? `${node.icon} [${node.key}]` : `[${node.key}]`
    const isGroup = node instanceof BindingGroup
    return {
      label: `${prefix}  ${node.name}`,
      description: isGroup ? "→" : undefined,
      node,
    }
  })

// ---------------------------------------------------------------------------
// WhichKeyMenu — tree navigator with backspace undo
// ---------------------------------------------------------------------------

export class WhichKeyMenu extends Context.Tag("WhichKeyMenu")<
  WhichKeyMenu,
  {
    readonly show: (menuId?: string) => Effect.Effect<void>
  }
>() {}

export const WhichKeyMenuLive = Layer.effect(
  WhichKeyMenu,
  Effect.gen(function* () {
    const contextService = yield* ContextService
    const commandService = yield* CommandService

    const show = (menuId?: string) =>
      Effect.gen(function* () {
        const config = vscode.workspace.getConfiguration("kms")

        // Resolve bindings: check kms.menus[menuId] first, fall back to kms.bindings
        let rootBindings: BindingNode[] = []
        let menuTitle = "KMS"

        if (menuId) {
          const menus = config.get<Record<string, any>>("menus") ?? {}
          const menu = menus[menuId]
          if (menu) {
            rootBindings = parseBindings(menu.bindings)
            menuTitle = menu.title ?? menuId
          }
        }

        // Fall back to default bindings if no menu found
        if (rootBindings.length === 0 && !menuId) {
          rootBindings = parseBindings(config.get("bindings"))
        }

        if (rootBindings.length === 0) {
          const target = menuId ? `menu "${menuId}"` : "kms.bindings"
          vscode.window.showWarningMessage(`KMS: No bindings found for ${target}. Check your settings.`)
          return
        }

        yield* contextService.set("kms.active", true)
        if (menuId) yield* contextService.set("kms.menu", menuId)
        yield* contextService.flushNow

        // Navigation state: stack for backspace undo
        const stack: { title: string; nodes: readonly BindingNode[] }[] = []
        let currentNodes = rootBindings
        let currentTitle = menuTitle

        const qp = vscode.window.createQuickPick<WhichKeyItem>()
        qp.placeholder = "Press a key… (Backspace to go back)"
        qp.matchOnDescription = false
        qp.matchOnDetail = false

        const renderCurrent = () => {
          const breadcrumb = stack.map((s) => s.title).concat(currentTitle).join(" › ")
          qp.title = breadcrumb
          qp.items = renderLevel(currentNodes)
          qp.value = ""
        }

        const navigateTo = (group: BindingGroup) => {
          stack.push({ title: currentTitle, nodes: currentNodes })
          currentTitle = group.name
          currentNodes = group.bindings
          renderCurrent()
        }

        const goBack = (): boolean => {
          const parent = stack.pop()
          if (!parent) return false
          currentTitle = parent.title
          currentNodes = parent.nodes
          renderCurrent()
          return true
        }

        const executeLeaf = (leaf: BindingLeaf) => {
          qp.hide()
          const args = leaf.args ?? []
          Effect.runPromise(
            commandService.execute(leaf.command, ...args)
          ).catch((e) => console.error("[KMS] Command error:", e))
        }

        renderCurrent()

        // We detect backspace by checking if the value becomes empty
        // while we are inside a submenu (stack.length > 0).
        // Key matching: any single character typed is checked against bindings.
        let ignoreNextEmpty = false

        const valueDisposable = qp.onDidChangeValue((value) => {
          if (value === "") {
            if (ignoreNextEmpty) {
              ignoreNextEmpty = false
              return
            }
            // Backspace on empty input — go back if in submenu
            if (stack.length > 0) {
              ignoreNextEmpty = true // goBack → renderCurrent sets qp.value=""
              goBack()
            }
            return
          }

          const key = value.slice(-1)
          const match = currentNodes.find((n) => n.key === key)

          if (match) {
            if (match instanceof BindingGroup) {
              ignoreNextEmpty = true // renderCurrent sets qp.value="" which re-fires this handler
              navigateTo(match)
            } else if (match instanceof BindingLeaf) {
              executeLeaf(match)
            }
          } else {
            // No matching key — clear input without triggering goBack
            ignoreNextEmpty = true
            qp.value = ""
          }
        })

        // Also handle mouse click / Enter selection
        const acceptDisposable = qp.onDidAccept(() => {
          const selected = qp.selectedItems[0]
          if (!selected) return
          if (selected.node instanceof BindingGroup) {
            ignoreNextEmpty = true
            navigateTo(selected.node)
          } else if (selected.node instanceof BindingLeaf) {
            executeLeaf(selected.node)
          }
        })

        // Dismiss
        const hideDisposable = qp.onDidHide(() => {
          Effect.runPromise(
            Effect.gen(function* () {
              yield* contextService.set("kms.active", false)
              yield* contextService.flushNow
            })
          ).catch((e) => console.error("[KMS] Cleanup error:", e))
          valueDisposable.dispose()
          acceptDisposable.dispose()
          hideDisposable.dispose()
          qp.dispose()
        })

        qp.show()
      })

    return { show }
  })
)
