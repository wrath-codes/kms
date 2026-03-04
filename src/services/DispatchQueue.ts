import { Context, Effect, Layer, Queue } from "effect"
import { DispatchAction } from "../domain/types"

export class DispatchQueueService extends Context.Tag("DispatchQueueService")<
  DispatchQueueService,
  {
    readonly dispatch: (action: DispatchAction) => Effect.Effect<void>
    readonly subscribe: (handler: (action: DispatchAction) => Effect.Effect<void>) => Effect.Effect<void>
  }
>() {}

export const DispatchQueueServiceLive = Layer.scoped(
  DispatchQueueService,
  Effect.gen(function* () {
    const queue = yield* Queue.bounded<DispatchAction>(64)

    return {
      dispatch: (action: DispatchAction) =>
        Queue.offer(queue, action).pipe(Effect.asVoid),
      subscribe: (handler: (action: DispatchAction) => Effect.Effect<void>) =>
        Effect.gen(function* () {
          yield* Queue.take(queue).pipe(
            Effect.flatMap(handler),
            Effect.forever,
            Effect.forkScoped
          )
        }).pipe(Effect.asVoid),
    }
  })
)
