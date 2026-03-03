# Examples & Code Patterns

Real-world usage patterns and code snippets for common tasks.

---

## Table of Contents

1. [Creating a Service](#creating-a-service)
2. [Using Services](#using-services)
3. [Testing Services](#testing-services)
4. [Streams & Cancellation](#streams--cancellation)
5. [Concurrency & Semaphores](#concurrency--semaphores)
6. [Memoization & Caching](#memoization--caching)
7. [Error Handling](#error-handling)
8. [UI Integration](#ui-integration)
9. [Performance Optimization](#performance-optimization)

---

## Creating a Service

### Basic Service with Effect

```typescript
// src/services/TextProcessorService.ts
import { Context, Data, Effect, Layer } from "effect"

// 1. Error type
export class TextProcessorError extends Data.TaggedError("TextProcessorError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

// 2. Service interface
export interface TextProcessorService {
  readonly uppercase: (text: string) => Effect.Effect<string, TextProcessorError>
  readonly tokenize: (text: string) => Effect.Effect<ReadonlyArray<string>, TextProcessorError>
}

// 3. Context tag
export const TextProcessorService = Context.GenericTag<TextProcessorService>(
  "app/TextProcessorService"
)

// 4. Implementation (Live)
export const TextProcessorServiceLive = Layer.succeed(
  TextProcessorService,
  TextProcessorService.of({
    uppercase: (text) =>
      Effect.try({
        try: () => text.toUpperCase(),
        catch: (cause) => new TextProcessorError({ message: "Failed to uppercase", cause })
      }),

    tokenize: (text) =>
      Effect.try({
        try: () => text.toLowerCase().split(/\s+/).filter(Boolean),
        catch: (cause) => new TextProcessorError({ message: "Failed to tokenize", cause })
      })
  })
)
```

### Service with Dependencies

```typescript
// src/services/EnrichedTextService.ts
import { Context, Effect, Layer } from "effect"
import { ConfigService } from "./ConfigService"
import { TextProcessorService } from "./TextProcessorService"

export interface EnrichedTextService {
  readonly process: (text: string) => Effect.Effect<string, TextProcessorError>
}

export const EnrichedTextService = Context.GenericTag<EnrichedTextService>(
  "app/EnrichedTextService"
)

export const EnrichedTextServiceLive = Layer.effect(
  EnrichedTextService,
  Effect.gen(function* () {
    const cfg = yield* ConfigService
    const processor = yield* TextProcessorService

    const maxLength = yield* cfg.get("app", "maxLength", 1000)

    const process = (text: string) =>
      Effect.gen(function* () {
        if (text.length > maxLength) {
          return yield* Effect.fail(
            new TextProcessorError({ message: `Text exceeds max length ${maxLength}` })
          )
        }

        return yield* processor.uppercase(text)
      })

    return EnrichedTextService.of({ process })
  })
)

// Wire dependencies
export const mainLayer = Layer.mergeAll(
  ConfigServiceLive,
  TextProcessorServiceLive,
  EnrichedTextServiceLive
)
```

---

## Using Services

### Basic Service Usage

```typescript
import { Effect } from "effect"
import { TextProcessorService, TextProcessorServiceLive } from "./services/TextProcessorService"

// Simple program using the service
const program = Effect.gen(function* () {
  const processor = yield* TextProcessorService

  const upper = yield* processor.uppercase("hello")
  console.log(upper)  // "HELLO"

  const tokens = yield* processor.tokenize("hello world test")
  console.log(tokens)  // ["hello", "world", "test"]
})

// Run the program
const result = yield* Effect.runPromise(program.pipe(Effect.provide(TextProcessorServiceLive)))
console.log(result)
```

### Service in Command Handler

```typescript
// src/extension.ts
import { vscode } from "vscode"
import { MainLayer } from "./layers/MainLayer"
import { Effect } from "effect"

export function activate(context: vscode.ExtensionContext) {
  // Register a command that uses services
  context.subscriptions.push(
    vscode.commands.registerCommand("myext.processText", () => {
      const program = Effect.gen(function* () {
        const editor = vscode.window.activeTextEditor
        if (!editor) {
          return yield* Effect.fail(new Error("No active editor"))
        }

        const processor = yield* TextProcessorService
        const text = editor.document.getText()
        const upper = yield* processor.uppercase(text)

        // Replace content
        editor.edit((editBuilder) => {
          editBuilder.replace(
            new vscode.Range(
              editor.document.positionAt(0),
              editor.document.positionAt(text.length)
            ),
            upper
          )
        })
      })

      Effect.runPromise(program.pipe(Effect.provide(MainLayer))).catch((err) => {
        vscode.window.showErrorMessage(`Error: ${err.message}`)
      })
    })
  )
}
```

---

## Testing Services

### Unit Test with Effect

```typescript
// src/test/unit/textProcessorService.spec.ts
import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { TextProcessorService, TextProcessorServiceLive } from "../../services/TextProcessorService"

describe("TextProcessorService", () => {
  it("converts text to uppercase", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const processor = yield* TextProcessorService
        return yield* processor.uppercase("hello")
      }).pipe(Effect.provide(TextProcessorServiceLive))
    )

    expect(result).toBe("HELLO")
  })

  it("tokenizes text correctly", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const processor = yield* TextProcessorService
        return yield* processor.tokenize("hello world test")
      }).pipe(Effect.provide(TextProcessorServiceLive))
    )

    expect(result).toEqual(["hello", "world", "test"])
  })

  it("handles empty strings", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const processor = yield* TextProcessorService
        return yield* processor.tokenize("")
      }).pipe(Effect.provide(TextProcessorServiceLive))
    )

    expect(result).toEqual([])
  })
})
```

### Test Double / Mock Service

```typescript
// src/test/unit/enrichedTextService.spec.ts
import { describe, it, expect, layer } from "@effect/vitest"
import { Context, Effect, Layer } from "effect"

// Mock implementation
const mockConfigService = Layer.succeed(ConfigService, {
  get: () => Effect.succeed(500)
})

const mockTextProcessorService = Layer.succeed(TextProcessorService, {
  uppercase: (text) => Effect.succeed(text.toUpperCase()),
  tokenize: (text) => Effect.succeed(text.split(" "))
})

// Test layer with mocks
const testLayer = Layer.mergeAll(
  mockConfigService,
  mockTextProcessorService,
  EnrichedTextServiceLive
)

// Use the test layer
layer(testLayer)("EnrichedTextService (mocked)", (it) => {
  it.effect("respects maxLength config", () =>
    Effect.gen(function* () {
      const service = yield* EnrichedTextService
      const veryLongText = "x".repeat(1000)

      const result = yield* service.process(veryLongText).pipe(
        Effect.flip  // convert failure to success for assertion
      )

      expect(result).toBeInstanceOf(Error)
    })
  )
})
```

---

## Streams & Cancellation

### Basic Stream Usage

```typescript
import { Stream, Effect } from "effect"

// Create a stream from an array
const numbers = Stream.fromIterable([1, 2, 3, 4, 5])

// Transform the stream
const program = Effect.gen(function* () {
  yield* numbers.pipe(
    Stream.map((n) => n * 2),
    Stream.filter((n) => n > 4),
    Stream.tap((n) => Effect.sync(() => console.log(`Emitted: ${n}`))),
    Stream.runDrain  // consume the stream
  )
})

yield* Effect.runPromise(program)
// Output:
// Emitted: 6
// Emitted: 8
// Emitted: 10
```

### Cancellable Search with flatMapLatest

```typescript
// src/services/SearchServiceWithCancellation.ts
import { Stream, SubscriptionRef, Duration, Effect } from "effect"

export const SearchServiceAdvanced = Effect.gen(function* () {
  const queryRef = yield* SubscriptionRef.make<string>("")

  // Stream that cancels previous search on new query
  const results = Stream.fromSubscriptionRef(queryRef).pipe(
    Stream.debounce(Duration.millis(30)),
    Stream.distinctUntilChanged,
    Stream.flatMapLatest((query) => {
      // This stream is canceled if queryRef emits a new value before it completes
      return Stream.unwrap(
        Effect.gen(function* () {
          console.log(`Searching for: ${query}`)
          // Simulate search work
          yield* Effect.sleep(Duration.millis(100))
          return Stream.fromIterable([
            { id: "1", title: `Result for ${query}` },
            { id: "2", title: `Result for ${query}` }
          ])
        })
      )
    })
  )

  const setQuery = (q: string) => SubscriptionRef.set(queryRef, q)

  return { results, setQuery }
})

// Usage
const program = Effect.gen(function* () {
  const search = yield* SearchServiceAdvanced

  // Start consuming results
  yield* search.results.pipe(
    Stream.tap((result) => Effect.sync(() => console.log("Got:", result.title))),
    Stream.take(10)  // limit to first 10
  )

  // Update query (cancels previous search if still running)
  yield* search.setQuery("go definition")

  // ... results stream continues with new query
})
```

---

## Concurrency & Semaphores

### Rate Limiting with Semaphore

```typescript
import { Semaphore, Effect } from "effect"

const program = Effect.gen(function* () {
  // Create semaphore with 3 permits (max 3 concurrent operations)
  const sem = yield* Semaphore.make(3)

  // Simulate 10 expensive operations
  const operations = Array.from({ length: 10 }, (_, i) => i)

  yield* Effect.forEach(
    operations,
    (id) =>
      Semaphore.withPermits(sem, 1)(
        Effect.gen(function* () {
          console.log(`Task ${id} started`)
          yield* Effect.sleep(Duration.millis(500))
          console.log(`Task ${id} done`)
        })
      ),
    { concurrency: "unbounded" }  // acquire as needed, but semaphore limits to 3
  )
})

// Output (3 tasks run in parallel, limited by semaphore):
// Task 0 started
// Task 1 started
// Task 2 started
// Task 0 done
// Task 3 started
// Task 1 done
// Task 4 started
// ...
```

### Fan-Out / Fan-In Pattern

```typescript
import { Effect, Fiber } from "effect"

const program = Effect.gen(function* () {
  // Start multiple operations concurrently
  const fiber1 = yield* Effect.fork(expensiveOperation1())
  const fiber2 = yield* Effect.fork(expensiveOperation2())
  const fiber3 = yield* Effect.fork(expensiveOperation3())

  // Wait for all to complete and collect results
  const [result1, result2, result3] = yield* Effect.all([
    Fiber.join(fiber1),
    Fiber.join(fiber2),
    Fiber.join(fiber3)
  ])

  return { result1, result2, result3 }
})
```

---

## Memoization & Caching

### Simple Memoization with Map

```typescript
import { Ref, Effect } from "effect"

const memoizedSearch = Effect.gen(function* () {
  const cache = yield* Ref.make<Map<string, SearchResult[]>>(new Map())

  const search = (query: string): Effect.Effect<SearchResult[]> =>
    Effect.gen(function* () {
      const c = yield* Ref.get(cache)

      // Return cached result if available
      if (c.has(query)) {
        return c.get(query)!
      }

      // Compute and cache
      const results = yield* expensiveSearch(query)

      yield* Ref.update(cache, (m) => {
        const next = new Map(m)
        next.set(query, results)

        // Evict oldest if cache too large
        if (next.size > 50) {
          const first = next.keys().next().value
          next.delete(first)
        }

        return next
      })

      return results
    })

  return { search }
})
```

### Memoized Selectors (Derived State)

```typescript
import { Ref, Effect } from "effect"

interface State {
  query: string
  results: SearchResult[]
  selectedIndex: number
}

const selectors = (stateRef: Ref.Ref<State>) => {
  // Memoized selector: only recompute when results or selectedIndex change
  let prevResults: SearchResult[] | null = null
  let prevSelectedIndex = -1
  let memoizedSelected: SearchResult | null = null

  const getSelectedResult = Effect.gen(function* () {
    const state = yield* Ref.get(stateRef)

    if (state.results === prevResults && state.selectedIndex === prevSelectedIndex) {
      return memoizedSelected  // cache hit
    }

    prevResults = state.results
    prevSelectedIndex = state.selectedIndex
    memoizedSelected = state.results[state.selectedIndex] ?? null

    return memoizedSelected
  })

  return { getSelectedResult }
}
```

---

## Error Handling

### Try-Catch Pattern

```typescript
import { Effect, Cause } from "effect"

const program = Effect.gen(function* () {
  const result = yield* risky().pipe(
    Effect.try({
      try: () => riskyOperation(),
      catch: (err) => new MyError({ message: "Operation failed", cause: err })
    })
  )
})
```

### Catchall Handler

```typescript
import { Effect, Exit } from "effect"

const program = Effect.gen(function* () {
  yield* someEffect.pipe(
    Effect.catchAll((error) => {
      if (error instanceof ConfigReadError) {
        return Effect.sync(() => {
          console.error("Config error:", error.message)
          return defaultConfig
        })
      } else {
        return Effect.fail(error)
      }
    })
  )
})
```

### Retry with Backoff

```typescript
import { Schedule, Duration, Effect } from "effect"

const program = Effect.gen(function* () {
  yield* unreliableOperation().pipe(
    Effect.retry(
      Schedule.exponential(Duration.millis(100)).pipe(
        Schedule.union(Schedule.recurs(5))  // max 5 retries
      )
    )
  )
})
```

### Error Logging

```typescript
import { Effect, Cause } from "effect"

const withLogging = <A, E>(effect: Effect.Effect<A, E>) =>
  effect.pipe(
    Effect.catchAll((error) => {
      console.error("Error occurred:", Cause.pretty(error))
      return Effect.fail(error)
    })
  )

yield* withLogging(someEffect)
```

---

## UI Integration

### QuickPick with Search

```typescript
import * as vscode from "vscode"
import { Stream, Effect } from "effect"
import { SearchService } from "./services/SearchService"

const showSearch = Effect.gen(function* () {
  const search = yield* SearchService

  const qp = vscode.window.createQuickPick<vscode.QuickPickItem & { id: string }>()
  qp.placeholder = "Search commands..."
  qp.show()

  let currentFiber: Fiber.RuntimeFiber<any, any> | null = null

  qp.onDidChangeValue((value) => {
    // Cancel previous search
    if (currentFiber) {
      currentFiber.interrupt()
    }

    qp.busy = true

    // Start new search
    currentFiber = Effect.runFork(
      Effect.gen(function* () {
        const results = yield* search.search(value)
        qp.items = results.map((r) => ({
          label: r.title,
          detail: r.keys,
          id: r.id
        }))
        qp.busy = false
      }).pipe(Effect.catchAll(() => Effect.void))
    )
  })

  qp.onDidAccept(() => {
    const selected = qp.selectedItems[0]
    if (selected) {
      qp.hide()
      console.log("Selected:", selected.id)
    }
  })
})
```

### Status Bar with Live Updates

```typescript
import * as vscode from "vscode"
import { Effect, Ref } from "effect"

const statusBar = Effect.gen(function* () {
  const status = yield* Ref.make("Ready")
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right)

  // Update UI when status changes
  const updateUI = Effect.gen(function* () {
    const text = yield* Ref.get(status)
    statusBarItem.text = `$(loading~spin) ${text}`
    statusBarItem.show()
  })

  // Simulate work
  yield* Ref.set(status, "Indexing...")
  yield* updateUI
  yield* Effect.sleep(Duration.millis(500))

  yield* Ref.set(status, "Ready")
  yield* updateUI

  statusBarItem.dispose()
})
```

---

## Performance Optimization

### Batch Operations with Schedule

```typescript
import { Schedule, Duration, Ref, Effect } from "effect"

const batchedUpdate = Effect.gen(function* () {
  const pending = yield* Ref.make<Update[]>([])

  // Collect updates
  const enqueue = (update: Update) =>
    Ref.update(pending, (updates) => [...updates, update])

  // Batch flush
  const flush = Schedule.debounce(Duration.millis(10))

  const flushPending = Effect.gen(function* () {
    const updates = yield* Ref.getAndSet(pending, [])
    if (updates.length === 0) return

    // Process all updates at once
    yield* applyUpdates(updates)
  }).pipe(Effect.schedule(flush))

  return { enqueue, flushPending }
})
```

### Incremental Processing with Chunks

```typescript
import { Stream, Effect } from "effect"

const processInChunks = (items: Item[], chunkSize = 100) =>
  Effect.gen(function* () {
    const chunks = Stream.fromIterable(items).pipe(
      Stream.chunksOf(chunkSize),
      Stream.tap((chunk) =>
        Effect.gen(function* () {
          // Process chunk
          yield* processChunk(chunk)
          // Yield to allow interruption
          yield* Effect.yieldNow()
        })
      )
    )

    yield* chunks.pipe(Stream.runDrain)
  })
```

### Lazy Evaluation (Generators)

```typescript
// DON'T: eager evaluation (all items computed immediately)
const allResults = items.map((item) => expensiveCompute(item))

// DO: lazy evaluation (computed on-demand)
const lazyResults = Effect.gen(function* () {
  for (const item of items) {
    yield* expensiveCompute(item)
  }
})
```

---

**Last updated**: 2026-02-24
