import { Context, Effect, Layer } from "effect"
import { VscodeError, execCommand } from "./VscodeEffect"

export class CommandService extends Context.Tag("CommandService")<
  CommandService,
  {
    readonly execute: (command: string, ...args: readonly unknown[]) => Effect.Effect<unknown, VscodeError>
    readonly executeExclusive: (command: string, ...args: readonly unknown[]) => Effect.Effect<unknown, VscodeError>
  }
>() {}

export const CommandServiceLive = Layer.effect(
  CommandService,
  Effect.gen(function* () {
    const sem = yield* Effect.makeSemaphore(4)
    const exclusiveSem = yield* Effect.makeSemaphore(1)

    return {
      execute: (command: string, ...args: readonly unknown[]) =>
        sem.withPermits(1)(execCommand(command, ...args)).pipe(Effect.withSpan("CommandService.execute")),
      executeExclusive: (command: string, ...args: readonly unknown[]) =>
        exclusiveSem.withPermits(1)(execCommand(command, ...args)).pipe(Effect.withSpan("CommandService.executeExclusive")),
    }
  })
)
