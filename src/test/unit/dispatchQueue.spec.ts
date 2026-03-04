import { describe, expect } from "vitest"
import { it } from "@effect/vitest"
import { Effect, Ref, Fiber } from "effect"
import { DispatchQueueService, DispatchQueueServiceLive } from "../../services/DispatchQueue"
import { DispatchAction } from "../../domain/types"

it.layer(DispatchQueueServiceLive)("DispatchQueueService", (it) => {
  it.effect("dispatches actions to queue", () =>
    Effect.gen(function* () {
      const dq = yield* DispatchQueueService
      yield* dq.dispatch(DispatchAction.SetQuery({ query: "test" }))
    })
  )

  it.scoped("subscribe processes dispatched actions", () =>
    Effect.gen(function* () {
      const dq = yield* DispatchQueueService
      const received = yield* Ref.make<string[]>([])

      yield* dq.subscribe((action) =>
        Effect.gen(function* () {
          if (action._tag === "SetQuery") {
            yield* Ref.update(received, (arr) => [...arr, action.query])
          }
        })
      )

      yield* dq.dispatch(DispatchAction.SetQuery({ query: "hello" }))

      // Allow the subscriber fiber to process all pending queue items
      yield* Effect.yieldNow()
      yield* Effect.yieldNow()
      yield* Effect.yieldNow()

      const items = yield* Ref.get(received)
      expect(items).toContain("hello")
    })
  )
})
