import * as vscode from "vscode";
import { Data, Effect } from "effect";

export class VscodeError extends Data.TaggedError("VscodeError")<{
  readonly op: string;
  readonly cause: unknown;
}> {}

export const fromVscode = <A>(op: string, f: () => Thenable<A>): Effect.Effect<A, VscodeError> =>
  Effect.tryPromise({
    try: () => f() as Promise<A>,
    catch: (cause) => new VscodeError({ op, cause }),
  });

export const execCommand = (command: string, ...args: readonly unknown[]): Effect.Effect<unknown, VscodeError> =>
  fromVscode("executeCommand", () => vscode.commands.executeCommand(command, ...args));

export const execSetContext = (key: string, value: unknown): Effect.Effect<void, VscodeError> =>
  fromVscode("setContext", () => vscode.commands.executeCommand("setContext", key, value)).pipe(Effect.asVoid);

export const getConfig = <A>(section: string, key: string, fallback: A): Effect.Effect<A> =>
  Effect.sync(() => vscode.workspace.getConfiguration(section).get<A>(key, fallback));
