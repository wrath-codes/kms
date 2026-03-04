import { Context, Effect, Layer, Ref } from "effect"
import { Worker } from "worker_threads"
import * as path from "path"
import type { ScoredHit } from "./InvertedIndex"

// Worker RPC error
import { Data } from "effect"

export class IndexWorkerError extends Data.TaggedError("IndexWorkerError")<{
  readonly op: string
  readonly cause: unknown
}> {}

export class IndexWorkerService extends Context.Tag("IndexWorkerService")<
  IndexWorkerService,
  {
    readonly build: (commands: { id: string; label: string }[]) => Effect.Effect<{ documentCount: number; avgDocLength: number }, IndexWorkerError>
    readonly search: (query: string, topK: number) => Effect.Effect<ScoredHit[], IndexWorkerError>
    readonly dispose: Effect.Effect<void, IndexWorkerError>
  }
>() {}

export const IndexWorkerServiceLive = Layer.scoped(
  IndexWorkerService,
  Effect.gen(function* () {
    const idRef = yield* Ref.make(0)
    const pendingRef = yield* Ref.make<Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>>(new Map())

    // Resolve worker path relative to the built output
    const workerPath = path.join(__dirname, "worker", "indexWorker.js")
    const worker = new Worker(workerPath)

    worker.on("message", (msg: { id: number; type: string; data?: any; error?: string }) => {
      Effect.runSync(
        Effect.gen(function* () {
          const pending = yield* Ref.get(pendingRef)
          const entry = pending.get(msg.id)
          if (!entry) return
          yield* Ref.update(pendingRef, (m) => {
            const next = new Map(m)
            next.delete(msg.id)
            return next
          })
          if (msg.type === "error") {
            entry.reject(new Error(msg.error ?? "Unknown worker error"))
          } else {
            entry.resolve(msg.data)
          }
        })
      )
    })

    yield* Effect.addFinalizer(() =>
      Effect.promise(() => worker.terminate().then(() => {}))
    )

    const rpc = <T>(type: string, payload: Record<string, unknown>): Effect.Effect<T, IndexWorkerError> =>
      Effect.gen(function* () {
        const id = yield* Ref.getAndUpdate(idRef, (n) => n + 1)
        return yield* Effect.async<T, IndexWorkerError>((resume) => {
          Effect.runSync(
            Ref.update(pendingRef, (m) => {
              const next = new Map(m)
              next.set(id, {
                resolve: (data: T) => resume(Effect.succeed(data)),
                reject: (err: Error) => resume(Effect.fail(new IndexWorkerError({ op: type, cause: err }))),
              })
              return next
            })
          )
          worker.postMessage({ type, id, ...payload })
        })
      })

    return {
      build: (commands) => rpc("build", { commands }),
      search: (query, topK) => rpc("search", { query, topK }),
      dispose: rpc<void>("dispose", {}),
    }
  })
)
