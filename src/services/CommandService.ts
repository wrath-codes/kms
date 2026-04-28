import { Context, Effect, Layer } from "effect"
import { CommandError, execCommand } from "./VscodeEffect"

// Limits concurrent command execution to prevent flooding VS Code IPC
const MAX_CONCURRENT_COMMANDS = 4

/**
 * Command execution service for VS Code commands.
 * 
 * Limits concurrent command execution via semaphores to prevent flooding VS Code.
 * Supports both concurrent and exclusive (serialized) command execution.
 */
export class CommandService extends Context.Tag("CommandService")<
  CommandService,
  {
    readonly execute: (command: string, ...args: readonly unknown[]) => Effect.Effect<unknown, CommandError>
    readonly executeExclusive: (command: string, ...args: readonly unknown[]) => Effect.Effect<unknown, CommandError>
  }
>() {}

export const CommandServiceLive = Layer.effect(
  CommandService,
  Effect.gen(function* () {
    const sem = yield* Effect.makeSemaphore(MAX_CONCURRENT_COMMANDS)
    const exclusiveSem = yield* Effect.makeSemaphore(1)

    return {
      execute: (command: string, ...args: readonly unknown[]) =>
        sem.withPermits(1)(execCommand(command, ...args)).pipe(Effect.withSpan("CommandService.execute")),
      executeExclusive: (command: string, ...args: readonly unknown[]) =>
        exclusiveSem.withPermits(1)(execCommand(command, ...args)).pipe(Effect.withSpan("CommandService.executeExclusive")),
    }
  })
)
