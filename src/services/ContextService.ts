import { Context, Effect, Layer, Ref } from "effect";
import { ContextValue } from "../domain/types";
import { VscodeError, execSetContext } from "./VscodeEffect";

export class ContextService extends Context.Tag("ContextService")<
  ContextService,
  {
    readonly set: (key: string, value: ContextValue) => Effect.Effect<void>
    readonly flushNow: Effect.Effect<void, VscodeError>
    readonly pending: Effect.Effect<ReadonlyMap<string, ContextValue>>
  }
>() {}

export const ContextServiceLive = Layer.scoped(
  ContextService,
  Effect.gen(function* () {
    const pendingRef = yield* Ref.make<Map<string, ContextValue>>(new Map())
    const currentRef = yield* Ref.make<Map<string, ContextValue>>(new Map())

    const flushNow = Effect.gen(function* () {
      const pending = yield* Ref.get(pendingRef)
      if (pending.size === 0) return

      const current = yield* Ref.get(currentRef)
      const toApply: Array<[string, ContextValue]> = []

      for (const [k, v] of pending.entries()) {
        if (!current.has(k) || current.get(k) !== v) {
          toApply.push([k, v])
        }
      }

      if (toApply.length > 0) {
        yield* Effect.forEach(
          toApply,
          ([k, v]) => execSetContext(k, v),
          { concurrency: 8 }
        )
      }

      yield* Ref.update(currentRef, (cur) => {
        const next = new Map(cur)
        for (const [k, v] of toApply) {
          next.set(k, v)
        }
        return next
      })
      yield* Ref.set(pendingRef, new Map())
    }).pipe(Effect.withSpan("ContextService.flushNow"))

    return {
      set: (key: string, value: ContextValue) =>
        Ref.update(pendingRef, (m) => {
          const next = new Map(m)
          next.set(key, value)
          return next
        }),
      flushNow,
      pending: Ref.get(pendingRef) as Effect.Effect<ReadonlyMap<string, ContextValue>>,
    }
  })
)
