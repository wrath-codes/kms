import * as vscode from "vscode"
import { Effect, ManagedRuntime } from "effect"
import { MainLayer } from "./layers/MainLayer"
import { WhichKeyMenu } from "./ui/whichKeyMenu"

let runtime: ManagedRuntime.ManagedRuntime<
  ManagedRuntime.ManagedRuntime.Context<typeof MainLayer>,
  never
> | null = null

export async function activate(context: vscode.ExtensionContext) {
  console.log("[KMS] Activating...")

  runtime = ManagedRuntime.make(MainLayer)

  context.subscriptions.push(
    vscode.commands.registerCommand("kms.whichKey", (args?: { menu?: string }) => {
      if (!runtime) return
      runtime.runPromise(
        Effect.gen(function* () {
          const menu = yield* WhichKeyMenu
          yield* menu.show(args?.menu)
        })
      ).catch((e) => console.error("[KMS] whichKey error:", e))
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
