import { Context, Effect, Layer, Queue } from "effect"
import { DispatchAction } from "../domain/types"

/**
 * Dispatch queue service for UI state management.
 * 
 * Queues and processes dispatch actions sequentially to ensure consistent state updates.
 * Subscribers are notified of each action in order.
 */
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
    const scope = yield* Effect.scope

    return {
      dispatch: (action: DispatchAction) =>
        Queue.offer(queue, action).pipe(Effect.asVoid),
      subscribe: (handler: (action: DispatchAction) => Effect.Effect<void>) =>
        Effect.gen(function* () {
          yield* Queue.take(queue).pipe(
            Effect.flatMap(handler),
            Effect.forever,
            Effect.forkIn(scope)
          )
        }).pipe(Effect.asVoid),
    }
  })
)
