import * as vscode from "vscode";
import { Effect } from "effect";

export function activate(context: vscode.ExtensionContext) {
  console.log("KMS Extension activated");

  const disposable = vscode.commands.registerCommand(
    "kms.helloWorld",
    () => {
      vscode.window.showInformationMessage("Hello from KMS!");
    }
  );

  context.subscriptions.push(disposable);
  return {
    activate,
    deactivate,
  };
}

export function deactivate() {
  console.log("KMS Extension deactivated");
}
