# KMS Architectural Conventions

Evidence-based conventions extracted from the KMS codebase. These patterns have been validated across 11 services, 76 tests, and production use.

---

## 1. Service Structure

### Pattern: Context.Tag + Layer

Every service follows this structure:

```typescript
// Define the service interface
export class MyService extends Context.Tag("MyService")<
  MyService,
  {
    readonly method1: (...args: A) => Effect.Effect<B, E, R>
    readonly method2: (...args: C) => Effect.Effect<D>
  }
>() {}

// Provide the implementation as a Layer
export const MyServiceLive = Layer.effect(
  MyService,
  Effect.gen(function* () {
    const dep = yield* SomeDependency
    
    return {
      method1: (arg) => Effect.gen(function* () { ... }),
      method2: (arg) => Effect.gen(function* () { ... }),
    }
  })
)
```

**Examples in KMS:**
- `ContextService` (batched operations)
- `ConfigService` (cached configuration)
- `SearchService` (query scoring)
- `CommandService` (semaphore-gated execution)

### Decision: All methods return Effect

**Rule**: All service methods return `Effect.Effect<A, E, R>`, never sync values.

**Why**:
- Uniform interface composition with `Layer.mergeAll(...)`
- Async operations (VS Code APIs, workers) require Effect handling
- Testing becomes uniform (all effects can be run in tests)
- Dependency injection is consistent

**Example**:
```typescript
// ✅ CORRECT: Always Effect
readonly search: (query: string) => Effect.Effect<readonly SearchResult[]>
readonly execute: (cmd: string) => Effect.Effect<unknown, VscodeError>

// ❌ AVOID: Returning sync values
readonly getCached: (key: string) => ConfigSnapshot  // Use Effect instead
readonly validate: (data: unknown) => boolean  // Use Effect<boolean> or fail with Error
```

**Exceptions**: 
- Helper functions (pure logic, not service methods) can be sync
- E.g., `scoreMatch()` in SearchService is a pure `(query, cmd) => SearchResult | null`
- Export these separately for testing

---

## 2. Dependency Management

### Pattern: Explicit via `yield*`

Services declare dependencies by yielding from Context.Tag in the Layer initializer:

```typescript
export const MyServiceLive = Layer.effect(
  MyService,
  Effect.gen(function* () {
    const dep1 = yield* Dependency1  // Declare first
    const dep2 = yield* Dependency2
    
    return {
      method: () => Effect.gen(function* () {
        yield* dep1.doSomething()  // Use in methods
      }),
    }
  })
)
```

**Why this works**:
- Dependencies are declared once, at layer construction time
- Methods capture them in closure
- Type system tracks what layers are required to run a service
- Easy to see dependencies: just read the `yield*` statements

**Example from KMS**:

```typescript
// SearchService depends on RegistryService
export const SearchServiceLive = Layer.effect(
  SearchService,
  Effect.gen(function* () {
    const registry = yield* RegistryService  // Explicit dependency
    
    return {
      search: (query: string) =>
        Effect.gen(function* () {
          const snap = yield* registry.snapshot
          // ... search logic
        })
    }
  })
)
```

### Rule: Organize dependencies by concern

If a service depends on multiple services, group them:

```typescript
// ✅ CORRECT: Grouped by role
export const CommandServiceLive = Layer.effect(
  CommandService,
  Effect.gen(function* () {
    // I/O service
    const vscode = yield* VscodeService
    
    // Concurrency primitives (internal)
    const sem = yield* Effect.makeSemaphore(4)
    
    return { ... }
  })
)
```

---

## 3. Scoped vs Effect Layers

### Rule: Use `Layer.scoped` when the service manages resources

**Scoped**: Manages a resource with cleanup (file handles, subscriptions, refs)
**Effect**: Stateless or uses internal references with automatic cleanup

**Examples in KMS**:

```typescript
// ✅ Layer.scoped: Manages a ref + VS Code subscription
export const ContextServiceLive = Layer.scoped(
  ContextService,
  Effect.gen(function* () {
    const pendingRef = yield* Ref.make(new Map())
    
    const disposable = vscode.workspace.onDidChangeConfiguration(() => {
      // React to config changes
    })
    
    yield* Effect.addFinalizer(() => 
      Effect.sync(() => disposable.dispose())  // Clean up subscription
    )
    
    return { ... }
  })
)

// ✅ Layer.scoped: Manages a Queue
export const DispatchQueueServiceLive = Layer.scoped(
  DispatchQueueService,
  Effect.gen(function* () {
    const queue = yield* Queue.bounded<DispatchAction>(64)
    // Queue is automatically cleaned up when the layer is finalized
    
    return { ... }
  })
)

// ✅ Layer.effect: Stateless computation
export const SearchServiceLive = Layer.effect(
  SearchService,
  Effect.gen(function* () {
    const registry = yield* RegistryService
    
    return {
      search: (query) => Effect.gen(function* () {
        // No resources to manage, just logic
      })
    }
  })
)
```

---

## 4. Error Handling

### Pattern: Typed errors via Data.TaggedError

Every error domain has a dedicated error type:

```typescript
export class VscodeError extends Data.TaggedError("VscodeError")<{
  readonly op: string
  readonly cause: unknown
}> {}
```

### Rule: Service errors are specific to the service's domain

```typescript
// ✅ CORRECT: Specific, domain-relevant errors
export class RegistryError extends Data.TaggedError("RegistryError")<{
  readonly reason: "not_loaded" | "corrupted"
}> {}

export class SearchError extends Data.TaggedError("SearchError")<{
  readonly query: string
}> {}

// ❌ AVOID: Generic errors
Effect.fail(new Error("something went wrong"))  // Not catchable by type
Effect.fail("error")  // Not an Error type
```

### Rule: Use Effect helper for async boundaries

Wrap VS Code APIs and promises with a helper:

```typescript
export const fromVscode = <A>(
  op: string,
  f: () => Thenable<A>
): Effect.Effect<A, VscodeError> =>
  Effect.tryPromise({
    try: () => f() as Promise<A>,
    catch: (cause) => new VscodeError({ op, cause }),
  })

// Usage:
const execCommand = (command: string, ...args: unknown[]) =>
  fromVscode("executeCommand", () =>
    vscode.commands.executeCommand(command, ...args)
  )
```

**Why**: Uniform error handling, clear causality chain, typed recovery

---

## 5. Async Boundaries

### Rule: Use `Effect.tryPromise` for external async APIs

```typescript
// ✅ CORRECT: VS Code APIs
const fromVscode = <A>(
  op: string,
  f: () => Thenable<A>
): Effect.Effect<A, VscodeError> =>
  Effect.tryPromise({
    try: () => f() as Promise<A>,
    catch: (cause) => new VscodeError({ op, cause }),
  })

// ✅ CORRECT: Fetch/HTTP
const fetchJson = <A>(url: string): Effect.Effect<A, FetchError> =>
  Effect.tryPromise({
    try: () => fetch(url).then(r => r.json()),
    catch: (cause) => new FetchError({ url, cause }),
  })

// ✅ CORRECT: Sync code that might throw
const parseJson = <A>(data: string): Effect.Effect<A, ParseError> =>
  Effect.try({
    try: () => JSON.parse(data),
    catch: (cause) => new ParseError({ data, cause }),
  })
```

### Rule: Use `Effect.sync` for pure, side-effect-free code

```typescript
// ✅ CORRECT: Pure config read
export const getConfig = <A>(
  section: string,
  key: string,
  fallback: A
): Effect.Effect<A> =>
  Effect.sync(() =>
    vscode.workspace.getConfiguration(section).get<A>(key, fallback)
  )

// Note: This is pure synchronous access, no errors to handle
```

---

## 6. Concurrency & Synchronization

### Pattern: Semaphores for limiting concurrent access

Use `Effect.makeSemaphore(n)` to limit concurrent operations:

```typescript
// CommandService limits concurrent VS Code command execution
export const CommandServiceLive = Layer.effect(
  CommandService,
  Effect.gen(function* () {
    const sem = yield* Effect.makeSemaphore(4)          // 4 concurrent
    const exclusiveSem = yield* Effect.makeSemaphore(1)  // 1 at a time
    
    return {
      execute: (cmd, ...args) =>
        sem.withPermits(1)(execCommand(cmd, ...args)),
      
      executeExclusive: (cmd, ...args) =>
        exclusiveSem.withPermits(1)(execCommand(cmd, ...args)),
    }
  })
)
```

**Why**: Prevent VS Code from being flooded with concurrent commands

### Pattern: Queues for batching & coordination

Use `Queue.bounded()` to batch related operations:

```typescript
// DispatchQueueService batches UI state changes
export const DispatchQueueServiceLive = Layer.scoped(
  DispatchQueueService,
  Effect.gen(function* () {
    const queue = yield* Queue.bounded<DispatchAction>(64)
    
    return {
      dispatch: (action) =>
        Queue.offer(queue, action).pipe(Effect.asVoid),
      
      subscribe: (handler) =>
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
```

**Why**: Ensures ordered processing, prevents race conditions in state updates

### Pattern: Refs for mutable state

Use `Ref.make()` for shared mutable state across fibers:

```typescript
// ContextService batches pending context changes
export const ContextServiceLive = Layer.scoped(
  ContextService,
  Effect.gen(function* () {
    const pendingRef = yield* Ref.make<Map<string, ContextValue>>(new Map())
    const currentRef = yield* Ref.make<Map<string, ContextValue>>(new Map())
    
    return {
      set: (key, value) =>
        Ref.update(pendingRef, (m) => {
          const next = new Map(m)
          next.set(key, value)
          return next
        }),
      
      flushNow: Effect.gen(function* () {
        const pending = yield* Ref.get(pendingRef)
        // ... apply pending changes
      }),
    }
  })
)
```

**Why**: Type-safe, fiber-safe mutable state without locks

---

## 7. Pure Logic Extraction

### Rule: Export pure functions alongside services

Keep algorithmic logic separate from Effect orchestration:

```typescript
// ✅ CORRECT: Pure function exported separately
export const scoreMatch = (
  query: string,
  command: Command
): SearchResult | null => {
  // Pure logic, testable in isolation
  const queryTokens = tokenize(query)
  // ... scoring algorithm
  return new SearchResult({ command, score, matches })
}

// Effect-based service uses it
export const SearchServiceLive = Layer.effect(
  SearchService,
  Effect.gen(function* () {
    const registry = yield* RegistryService
    
    return {
      search: (query: string) =>
        Effect.gen(function* () {
          const snap = yield* registry.snapshot
          const results = snap.commands
            .map(cmd => scoreMatch(query, cmd))  // Use pure function
            .filter((r) => r !== null)
          return results as readonly SearchResult[]
        })
    }
  })
)
```

**Why**: 
- Pure functions are easier to test (no Effect machinery)
- Reusable in different contexts (CLI, UI, workers)
- Easier to profile and reason about performance

**Examples in KMS**:
- `tokenize()` in RegistryService
- `scoreMatch()` in SearchService
- `bm25()` in InvertedIndex

---

## 8. Instrumentation & Observability

### Rule: Add spans to public methods

Use `Effect.withSpan()` for tracing:

```typescript
export const SearchServiceLive = Layer.effect(
  SearchService,
  Effect.gen(function* () {
    const registry = yield* RegistryService
    
    return {
      search: (query: string) =>
        Effect.gen(function* () {
          // ... search logic
        }).pipe(Effect.withSpan("SearchService.search")),  // Add span
    }
  })
)
```

**Why**: Built-in tracing for performance profiling, error investigation

---

## 9. Testing Patterns

### Pattern: Service interface with mock implementation

```typescript
// Production implementation
export const MyServiceLive = Layer.effect(MyService, ...)

// Mock for testing
export const MyServiceMock = Layer.succeed(
  MyService,
  {
    method1: () => Effect.succeed(testValue),
    method2: () => Effect.fail(new TestError()),
  }
)

// Test
it("handles errors", () => {
  const eff = Effect.gen(function* () {
    const service = yield* MyService
    yield* service.method2()  // Will fail with TestError
  })
  
  const result = Effect.runSync(
    eff.pipe(Effect.provide(MyServiceMock))
  )
})
```

### Rule: Use `Effect.runSync()` for unit tests

```typescript
import { describe, it, expect } from "vitest"

describe("SearchService", () => {
  it("scores exact matches highest", () => {
    const result = scoreMatch("open file", new Command({
      id: CommandId("editor.action.openFile"),
      label: "Open File",
      // ...
    }))
    
    expect(result?.score).toBeGreaterThan(0.8)
  })
})
```

---

## 10. Naming Conventions

### Services

- **Class name**: `PascalCase` + `Service` suffix (e.g., `SearchService`)
- **Context.Tag**: Same as class name
- **Live implementation**: `<Name>Live` (e.g., `SearchServiceLive`)
- **Mock**: `<Name>Mock` (e.g., `SearchServiceMock`)

### Error Types

- **Class name**: `PascalCase` + `Error` suffix (e.g., `VscodeError`)
- **Tag in TaggedError**: Descriptive string (e.g., `"VscodeError"`)

### Domain Types

- **Value Objects**: `PascalCase` extending `Data.Class` (e.g., `Command`, `SearchResult`)
- **Branded Types**: `PascalCase` with `Brand` suffix implicit (e.g., `CommandId`)
- **Tagged Enums**: `PascalCase` extending `Data.TaggedEnum` (e.g., `DispatchAction`)

---

## 11. Layer Composition

### Pattern: Hierarchical layer merging

```typescript
// Step 1: Group related services
const ConfigLayer = ConfigServiceLive
const ContextLayer = ContextServiceLive

// Step 2: Merge independent layers
const BaseLayer = Layer.mergeAll(ConfigLayer, ContextLayer)

// Step 3: Compose with dependencies
const SearchLayer = SearchServiceLive.pipe(
  Layer.provide(RegistryServiceLive)
)

// Step 4: Final composition
export const MainLayer = Layer.mergeAll(BaseLayer, SearchLayer)
```

### Rule: Layers should be composable at different levels

```typescript
// Simple mode (typical registries)
export const MainLayer = Layer.mergeAll(
  ConfigServiceLive,
  ContextServiceLive,
  RegistryServiceLive,
  SearchServiceLive,
  // ...
)

// Advanced mode (50k+ commands, swap RegistryService)
export const MainLayerAdvanced = Layer.mergeAll(
  ConfigServiceLive,
  ContextServiceLive,
  RegistryServiceAdvancedLive,  // Swap: different implementation
  SearchServiceLive,  // SearchService works unchanged
  // ...
)
```

**Why**: Makes it easy to swap implementations (e.g., simple → advanced)

---

## Summary Checklist

When adding a new service to KMS:

- [ ] Define `class <Name>Service extends Context.Tag(...)`
- [ ] All methods return `Effect.Effect<A, E, R>`
- [ ] Implement `<Name>ServiceLive` as `Layer.effect` or `Layer.scoped`
- [ ] Declare dependencies via `yield*` in the layer initializer
- [ ] Use `Effect.tryPromise` for async boundaries, `Effect.sync` for pure code
- [ ] Define domain-specific error types via `Data.TaggedError`
- [ ] Add `Effect.withSpan()` to public methods for observability
- [ ] Extract pure logic as separate, exported functions
- [ ] Add unit tests with both pure functions and Effect services
- [ ] Ensure layer can be composed with `Layer.mergeAll(...)`
- [ ] Document service interface with JSDoc comments

