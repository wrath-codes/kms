import { Context, Effect, Layer, Ref } from "effect"
import { RenderItem, RenderModel, SearchResult } from "../domain/types"

export const PAGE_SIZE = 200

// ---------------------------------------------------------------------------
// toRenderItem (pure, exported for testing)
// ---------------------------------------------------------------------------

export const toRenderItem = (result: SearchResult): RenderItem =>
  new RenderItem({
    label: result.command.keybinding
      ? `$(key) ${result.command.label}`
      : result.command.label,
    description: result.command.category,
    detail: result.command.description,
    command: result.command,
  })

// ---------------------------------------------------------------------------
// Service Interface
// ---------------------------------------------------------------------------

export class RenderModelService extends Context.Tag("RenderModelService")<
  RenderModelService,
  {
    readonly render: (results: readonly SearchResult[], query: string, version: number) => Effect.Effect<RenderModel>
    readonly renderPage: (results: readonly SearchResult[], query: string, version: number, page: number) => Effect.Effect<RenderModel>
    readonly clearCache: Effect.Effect<void>
  }
>() {}

// ---------------------------------------------------------------------------
// Live Implementation
// ---------------------------------------------------------------------------

export const RenderModelServiceLive = Layer.effect(
  RenderModelService,
  Effect.gen(function* () {
    const cacheRef = yield* Ref.make<Map<string, RenderModel>>(new Map())

    return {
      render: (results: readonly SearchResult[], query: string, version: number) =>
        Effect.gen(function* () {
          const cacheKey = `${version}:${query}`
          const cache = yield* Ref.get(cacheRef)

          const cached = cache.get(cacheKey)
          if (cached !== undefined) return cached

          const items = results.map(toRenderItem)
          const model = new RenderModel({ items, version, query })

          yield* Ref.update(cacheRef, (m) => {
            const next = new Map(m)
            next.set(cacheKey, model)
            if (next.size > 50) {
              const firstKey = next.keys().next().value
              if (firstKey !== undefined) next.delete(firstKey)
            }
            return next
          })

          return model
        }).pipe(Effect.withSpan("RenderModelService.render")),
      renderPage: (results: readonly SearchResult[], query: string, version: number, page: number) =>
        Effect.gen(function* () {
          const cacheKey = `${version}:${query}:p${page}`
          const cache = yield* Ref.get(cacheRef)

          const cached = cache.get(cacheKey)
          if (cached !== undefined) return cached

          const start = page * PAGE_SIZE
          const pageResults = results.slice(start, start + PAGE_SIZE)
          const items = pageResults.map(toRenderItem)
          const model = new RenderModel({ items, version, query })

          yield* Ref.update(cacheRef, (m) => {
            const next = new Map(m)
            next.set(cacheKey, model)
            if (next.size > 50) {
              const firstKey = next.keys().next().value
              if (firstKey !== undefined) next.delete(firstKey)
            }
            return next
          })

          return model
        }).pipe(Effect.withSpan("RenderModelService.renderPage")),
      clearCache: Ref.set(cacheRef, new Map()),
    }
  })
)
