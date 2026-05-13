import * as vscode from "vscode"
import { Effect, ManagedRuntime } from "effect"
import { MainLayer } from "./layers/MainLayer"
import { WhichKeyMenu } from "./ui/whichKeyMenu"
import { IconPickerUI } from "./ui/iconPicker"
import { initializeDefaultIconSources } from "./services/iconSources"

// Log error with consistent formatting
const logError = (context: string, error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error)
  console.error(`[KMS:${context}] ${msg}`)
}

let runtime: ManagedRuntime.ManagedRuntime<
  ManagedRuntime.ManagedRuntime.Context<typeof MainLayer>,
  never
> | null = null

export async function activate(context: vscode.ExtensionContext) {
  console.log("[KMS] Activating...")

  runtime = ManagedRuntime.make(MainLayer)

  // Initialize icon sources (codicons, nerd fonts, etc.)
  runtime.runPromise(initializeDefaultIconSources).catch((e) => logError("initializeIconSources", e))

  context.subscriptions.push(
    vscode.commands.registerCommand("kms.whichKey", (args?: { menu?: string }) => {
      if (!runtime) return
      runtime.runPromise(
        Effect.gen(function* () {
          const menu = yield* WhichKeyMenu
          yield* menu.show(args?.menu)
        })
      ).catch((e) => logError("whichKey", e))
    }),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand("kms.pickIcon", () => {
      if (!runtime) return
      runtime.runPromise(
        Effect.gen(function* () {
          const picker = yield* IconPickerUI
          const icon = yield* picker.show()
          if (icon) {
            yield* vscode.env.clipboard.writeText(icon)
            yield* Effect.promise(() =>
              vscode.window.showInformationMessage(
                `✓ Icon copied to clipboard: ${icon}\nPaste into your kms.bindings config.`
              )
            )
          }
        })
      ).catch((e) => logError("pickIcon", e))
    }),
  )

  console.log("[KMS] Activated — press Alt+Space to open which-key menu")
}

export async function deactivate() {
  if (runtime) {
    await runtime.dispose()
    runtime = null
  }
  console.log("[KMS] Deactivated")
}
