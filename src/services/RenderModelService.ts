import { Context, Effect, Layer, Ref } from "effect"
import { RenderItem, RenderModel, SearchResult } from "../domain/types"

// Render 200 items per page. Balances render latency (<5ms) vs scrolling burden
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
    icon: result.command.icon,
    command: result.command,
  })

// ---------------------------------------------------------------------------
// Service Interface
// ---------------------------------------------------------------------------

/**
 * Render model service for UI item construction.
 * 
 * Transforms search results into quick-pick items with caching.
 * Supports pagination for large result sets.
 */
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

// LRU cache with max 50 entries
class LRUCache<K, V> {
  private cache: Map<K, V> = new Map()
  private accessOrder: K[] = []
  readonly maxSize: number

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      // Move to end of access order (most recently used)
      this.accessOrder = this.accessOrder.filter((k) => k !== key)
      this.accessOrder.push(key)
      return this.cache.get(key)
    }
    return undefined
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // Update existing key
      this.cache.set(key, value)
      this.accessOrder = this.accessOrder.filter((k) => k !== key)
      this.accessOrder.push(key)
    } else {
      // Add new key
      this.cache.set(key, value)
      this.accessOrder.push(key)

      // Evict least recently used if at max size
      if (this.cache.size > this.maxSize) {
        const lru = this.accessOrder.shift()
        if (lru !== undefined) {
          this.cache.delete(lru)
        }
      }
    }
  }

  clear(): void {
    this.cache.clear()
    this.accessOrder = []
  }
}

export const RenderModelServiceLive = Layer.effect(
  RenderModelService,
  Effect.gen(function* () {
    const cacheRef = yield* Ref.make<LRUCache<string, RenderModel>>(new LRUCache(50))

    return {
      render: (results: readonly SearchResult[], query: string, version: number) =>
        Effect.gen(function* () {
          const cacheKey = `${version}:${query}`
          const cache = yield* Ref.get(cacheRef)

          const cached = cache.get(cacheKey)
          if (cached !== undefined) return cached

          const items = results.map(toRenderItem)
          const model = new RenderModel({ items, version, query })

          yield* Ref.update(cacheRef, (c) => {
            c.set(cacheKey, model)
            return c
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

          yield* Ref.update(cacheRef, (c) => {
            c.set(cacheKey, model)
            return c
          })

          return model
        }).pipe(Effect.withSpan("RenderModelService.renderPage")),
      clearCache: Ref.update(cacheRef, (c) => {
        c.clear()
        return c
      }),
    }
  })
)
