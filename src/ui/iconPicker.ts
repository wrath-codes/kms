import * as vscode from "vscode"
import { Context, Effect, Layer } from "effect"
import { IconService } from "../services/IconService"

// ---------------------------------------------------------------------------
// Icon Option Type
// ---------------------------------------------------------------------------

export interface IconOption {
  readonly label: string // Display: icon + name
  readonly description: string // Icon value + source
  readonly detail: string // Usage example
  readonly value: string // The actual icon identifier to use
  readonly source: string // "codicons" | "nerd-fonts" | etc.
  readonly themeAware: boolean
}

// ---------------------------------------------------------------------------
// Curated Icon Lists
// ---------------------------------------------------------------------------

const KNOWN_CODICONS = [
  "add",
  "plus",
  "close",
  "x",
  "edit",
  "pencil",
  "check",
  "verified",
  "delete",
  "trash",
  "search",
  "find",
  "replace",
  "file",
  "file-add",
  "folder",
  "folder-open",
  "folder-opened",
  "settings",
  "gear",
  "debug",
  "terminal",
  "code",
  "git-branch",
  "git-commit",
  "git-merge",
  "git-pull",
  "git-push",
  "warning",
  "error",
  "info",
  "question",
  "bell",
  "bookmark",
  "tag",
  "run",
  "refresh",
  "sync",
  "eye",
  "eye-closed",
  "home",
  "circle",
  "menu",
  "tools",
  "server",
  "database",
  "cloud",
  "archive",
  "server-environment",
  "sync-ignored",
]

const POPULAR_NERD_FONTS = [
  { glyph: "󰊢", name: "File" },
  { glyph: "󰍉", name: "Search" },
  { glyph: "󰒓", name: "Settings" },
  { glyph: "󰔨", name: "Build" },
  { glyph: "󰆍", name: "Terminal" },
  { glyph: "󰅲", name: "Comment" },
  { glyph: "󰉋", name: "Folder" },
  { glyph: "󰃤", name: "Debug" },
  { glyph: "󰏓", name: "Package" },
  { glyph: "󰚀", name: "Rocket" },
  { glyph: "󰋽", name: "Help" },
  { glyph: "󰅙", name: "Close" },
  { glyph: "󰄬", name: "Check" },
  { glyph: "󰔰", name: "Git" },
]

// ---------------------------------------------------------------------------
// Icon List Builder (pure, exported for testing)
// ---------------------------------------------------------------------------

export const buildIconList = (
  hasCodeicons: boolean,
  hasNerdFonts: boolean
): readonly IconOption[] => {
  const options: IconOption[] = []

  if (hasCodeicons) {
    for (const name of KNOWN_CODICONS) {
      options.push({
        label: `$(${name}) ${name}`,
        description: `$(${name}) · codicons`,
        detail: `"icon": "$(${name})" or "icon": "${name}"`,
        value: `$(${name})`,
        source: "codicons",
        themeAware: true,
      })
    }
  }

  if (hasNerdFonts) {
    for (const { glyph, name } of POPULAR_NERD_FONTS) {
      options.push({
        label: `${glyph} ${name}`,
        description: `${glyph} · nerd-fonts`,
        detail: `"icon": "${glyph}"`,
        value: glyph,
        source: "nerd-fonts",
        themeAware: false,
      })
    }
  }

  return options
    .sort((a, b) => a.label.localeCompare(b.label))
}

// ---------------------------------------------------------------------------
// Service Interface
// ---------------------------------------------------------------------------

/**
 * Icon picker UI service for selecting icons from available sources.
 * Shows interactive grid with search and preview.
 */
export class IconPickerUI extends Context.Tag("IconPickerUI")<
  IconPickerUI,
  {
    readonly show: () => Effect.Effect<string | undefined>
  }
>() {}

// ---------------------------------------------------------------------------
// Live Implementation
// ---------------------------------------------------------------------------

export const IconPickerUILive = Layer.effect(
  IconPickerUI,
  Effect.gen(function* () {
    const iconService = yield* IconService

    return {
      show: () =>
        Effect.gen(function* () {
          const sources = yield* iconService.listSources()

          const hasCodeicons = sources.some((s) => s.id === "codicons")
          const hasNerdFonts = sources.some((s) => s.id === "nerd-fonts")

          const allIcons = buildIconList(hasCodeicons, hasNerdFonts)

          if (allIcons.length === 0) {
            vscode.window.showWarningMessage("No icon sources registered")
            return undefined
          }

          // Create QuickPick
          const quickPick = vscode.window.createQuickPick<IconOption>()
          quickPick.title = "KMS: Pick Icon"
          quickPick.placeholder =
            "Search icons by name or source... (or paste an icon directly)"
          quickPick.items = allIcons
          quickPick.canSelectMany = false
          quickPick.matchOnDescription = true
          quickPick.matchOnDetail = true

          return yield* Effect.async<string | undefined>((resume) => {
            let settled = false
            let acceptDisposable: vscode.Disposable | undefined
            let hideDisposable: vscode.Disposable | undefined

            const cleanup = (hide: boolean) => {
              acceptDisposable?.dispose()
              hideDisposable?.dispose()
              if (hide) quickPick.hide()
              quickPick.dispose()
            }

            const finish = (value: string | undefined, hide: boolean) => {
              if (settled) return
              settled = true
              cleanup(hide)
              resume(Effect.succeed(value))
            }

            acceptDisposable = quickPick.onDidAccept(() => {
              const selected = quickPick.selectedItems[0]
              const pasted = quickPick.value.trim()
              finish(selected?.value ?? (pasted || undefined), true)
            })

            hideDisposable = quickPick.onDidHide(() => finish(undefined, false))

            quickPick.show()

            return Effect.sync(() => {
              settled = true
              cleanup(true)
            })
          })
        }),
    }
  })
)
