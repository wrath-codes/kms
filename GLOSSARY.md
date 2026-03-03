# Glossary

Effect-TS and VS Code extension development terminology.

---

## Effect-TS Concepts

### Effect

A data type representing a computation that may fail, require services, or be asynchronous. The fundamental building block.

```typescript
// Effect with no error, no requirements
Effect.sync(() => 1)

// Effect that may fail
Effect.fail(new Error("oops"))

// Effect with service dependency
Effect.gen(function* () {
  const service = yield* MyService
  return yield* service.doThing()
})
```

**Key property**: Effects are lazy. They don't run until you call `Effect.runPromise()`, `Effect.runSync()`, or `Effect.runFork()`.

---

### Fiber

A lightweight thread managed by Effect. Represents a running effect.

```typescript
const fiber = Effect.fork(someEffect)  // start computation
const result = yield* Fiber.join(fiber)  // wait for result
```

**Use case**: Concurrent work without blocking.

---

### Layer

Dependency injection for services. Describes how to construct and initialize a service, along with its lifecycle (startup/shutdown).

```typescript
export const ConfigServiceLive = Layer.scoped(
  ConfigService,
  Effect.gen(function* () {
    const disposable = vscode.workspace.onDidChangeConfiguration(...)
    yield* Effect.addFinalizer(() => Effect.sync(() => disposable.dispose()))
    
    return ConfigService.of({ /* ... */ })
  })
)
```

**Key property**: Layers handle resource cleanup automatically via `Scope`.

---

### Context

A service registry. Used to resolve service dependencies.

```typescript
// Define a service context
export const MyService = Context.GenericTag<MyService>("MyService")

// In an effect, request the service
const service = yield* MyService
```

---

### Ref

A mutable reference that can be read and updated atomically.

```typescript
const counter = yield* Ref.make(0)
const current = yield* Ref.get(counter)
const updated = yield* Ref.update(counter, (n) => n + 1)
```

**Use case**: Shared mutable state that's safe for concurrent access.

---

### Stream

A composable, asynchronous sequence of values that can be transformed and consumed.

```typescript
const numbers = Stream.range(1, 10)
const doubled = numbers.pipe(Stream.map((n) => n * 2))
yield* doubled.pipe(Stream.runCollect)  // [2, 4, 6, 8, ...]
```

**Key property**: Supports `flatMapLatest` for cancellation (kills previous stream on new event).

---

### Queue

A bounded FIFO queue for passing messages between fibers.

```typescript
const queue = yield* Queue.unbounded<Message>()
yield* Queue.offer(queue, { type: "search", query: "go" })
const msg = yield* Queue.take(queue)
```

**Use case**: Decoupling producer from consumer, backpressure.

---

### Semaphore

Controls access to a resource with a limited number of permits. Used for rate limiting and concurrency bounds.

```typescript
const sem = yield* Semaphore.make(4)  // max 4 concurrent
yield* Semaphore.withPermits(sem, 1)(slowOperation)
```

**Use case**: Limiting concurrent IPC calls, database connections, etc.

---

### Schedule

Describes a policy for retrying or repeating effects. Examples: exponential backoff, fixed intervals, debounce.

```typescript
// Retry with exponential backoff
yield* effect.pipe(Effect.retry(Schedule.exponential("1 millis")))

// Debounce (batch operations that happen within 10ms)
yield* effect.pipe(Effect.schedule(Schedule.debounce(Duration.millis(10))))
```

**Use case**: Batching, retry logic, rate limiting.

---

### Scope

Manages resource lifecycle. When a scope exits, all resources (file handles, connections, subscriptions) are cleaned up.

```typescript
// Create a scoped effect
const program = Effect.gen(function* () {
  const resource = yield* acquireResource
  yield* Effect.addFinalizer(() => releaseResource(resource))
  // ... use resource
  // releaseResource called automatically on exit
})

yield* Effect.scoped(program)
```

**Use case**: Ensuring cleanup happens (no resource leaks).

---

### Cause

An error description that tracks the root cause, error chain, and context.

```typescript
const result = yield* someEffect.pipe(
  Effect.catch((cause) => {
    console.log(Cause.pretty(cause))  // human-readable error
    return Effect.fail(new MyError({ cause }))
  })
)
```

---

### TestClock

Fake clock for testing. Allows advancing time without actually waiting.

```typescript
import { TestClock } from "effect"

yield* Effect.fork(Effect.sleep(Duration.seconds(10)))
yield* TestClock.adjust(Duration.seconds(10))  // time jumps forward instantly
```

**Use case**: Testing time-dependent behavior without slow waits.

---

### Exit

The result of running an effect. Either `Success` or `Failure`.

```typescript
const exit = yield* Effect.runExit(someEffect)

if (Exit.isSuccess(exit)) {
  console.log("Success:", exit.value)
} else if (Exit.isFailure(exit)) {
  console.log("Failure:", exit.cause)
}
```

---

## VS Code Concepts

### Extension Host

The Node.js process where your extension code runs. Separate from the VS Code UI process.

**Key point**: IPC between extension host and UI is expensive.

---

### QuickPick

VS Code's built-in UI for showing a list of items and letting the user select one.

```typescript
const qp = vscode.window.createQuickPick()
qp.items = [{ label: "Item 1" }, { label: "Item 2" }]
qp.show()

qp.onDidAccept(() => {
  console.log("Selected:", qp.selectedItems[0])
  qp.hide()
})
```

---

### Command

An action that can be triggered by the user (via menu, keybinding, command palette, etc.).

```typescript
// Register a command
context.subscriptions.push(
  vscode.commands.registerCommand("myext.test", () => {
    vscode.window.showInformationMessage("Hello!")
  })
)

// Execute a command
await vscode.commands.executeCommand("editor.action.goToDefinition")
```

---

### Context Key

A VS Code variable that controls visibility of commands, menus, and keybindings.

```typescript
// Set a context key
await vscode.commands.executeCommand("setContext", "myext.mode", "search")

// Use in when clause (package.json)
{
  "command": "myext.search",
  "when": "myext.mode == 'search'"
}
```

**Key point**: `setContext` is IPC and expensive. Batch calls.

---

### Workspace

VS Code's concept of the open folder/folders and all their files, settings, and state.

```typescript
// Get open folders
const folders = vscode.workspace.workspaceFolders

// Watch files
const watcher = vscode.workspace.createFileSystemWatcher("**/*.ts")
watcher.onDidChange((uri) => { /* ... */ })

// Get configuration
const cfg = vscode.workspace.getConfiguration("myext")
const value = cfg.get("key", defaultValue)
```

---

### Language Server Protocol (LSP)

Standard protocol for communication between editor and a language server. Used for diagnostics, completions, etc.

**Key point**: Many VS Code features (GoToDefinition, Find References) delegate to language servers via LSP.

---

### Extension Context

Metadata provided to `activate()` function. Includes storage paths, subscriptions list, etc.

```typescript
export function activate(context: vscode.ExtensionContext) {
  // context.globalStoragePath — user data directory
  // context.workspaceState — workspace-local storage
  // context.globalState — global storage
  // context.subscriptions — list of disposables to clean up
}
```

---

## Common Abbreviations

| Term | Meaning |
|------|---------|
| **IPC** | Inter-Process Communication (between extension host and UI) |
| **API** | Application Programming Interface |
| **LSP** | Language Server Protocol |
| **UI** | User Interface |
| **DevTools** | Developer Tools (debugger, profiler) |
| **RPC** | Remote Procedure Call (like IPC but over network) |
| **TTL** | Time To Live (cache expiration) |
| **FIFO** | First In, First Out (queue ordering) |
| **CJS** | CommonJS (Node.js module format) |
| **ESM** | ECMAScript Modules (JavaScript module format) |

---

## Performance Terms

### Latency

Time from input to output. Example: "Search latency is 50ms" = time from user typing to results appearing.

**Target**: <100ms for interactive operations.

---

### Throughput

Number of operations per unit time. Example: "IPC throughput is 1000 calls/second".

**Not as critical as latency for user-facing operations.**

---

### Jank

Noticeable stutter or lag in the UI. Usually caused by a frame taking >16ms to render (can't hit 60 FPS).

**Target**: <16ms per frame (1000ms / 60 FPS).

---

### Debounce

Delay an action until a quiet period (e.g., user stops typing for 30ms).

```typescript
// Debounce a stream
stream.pipe(Stream.debounce(Duration.millis(30)))

// Equivalent: only emit after 30ms of silence
```

**Use case**: Avoid redundant updates, batch operations.

---

### Throttle

Limit frequency of an action (e.g., at most 10 times per second).

```typescript
// Throttle via a schedule
effect.pipe(Effect.schedule(Schedule.spaced(Duration.millis(100))))
```

**Use case**: Prevent overload, reduce IPC volume.

---

### Cache Hit

Returning a value from cache (no recomputation).

**Target**: >80% hit rate for hot paths.

---

### IPC Round-Trip

A call from extension host to UI that waits for a response. Example: `setContext` or `executeCommand`.

**Cost**: 0.5–2ms per round-trip.

**Target**: <1 IPC call per 10ms.

---

## Testing Terms

### Unit Test

Tests a single function or module in isolation. Fast, deterministic.

**Example**: Test `tokenize()` function with various inputs.

---

### Integration Test

Tests multiple modules together, including VS Code APIs.

**Example**: Test that opening a file and running a command works end-to-end.

---

### End-to-End (E2E) Test

Tests the entire system from user perspective.

**Example**: User opens VS Code, types in search, selects a result, command executes.

---

### Fixture

Test data or setup that's reused across tests.

**Example**: A fake `TextDocument` that multiple tests use.

---

### Mock

A fake implementation of a service for testing.

**Example**: Mock `vscode.workspace` so tests don't need a real workspace.

---

### Snapshot Test

Captures output at a point in time, then asserts future output matches.

**Example**: Capture formatted diagnostic output, assert it doesn't change unexpectedly.

---

### Property-Based Test

Generates random inputs and asserts properties hold for all inputs.

**Example**: "For any query string, search results are sorted by score."

---

## Acronyms

| Acronym | Meaning |
|---------|---------|
| **CI/CD** | Continuous Integration / Continuous Deployment |
| **JSON** | JavaScript Object Notation |
| **URI** | Uniform Resource Identifier |
| **VSCode** | Visual Studio Code |
| **VSIX** | VS Code extension package format |
| **PR** | Pull Request |
| **npm** | Node.js package manager |
| **Bun** | Fast JavaScript runtime |
| **Vitest** | Unit testing framework (Vite + Jest) |
| **Mocha** | Test framework used in extension host |
| **Effect** | Effect-TS library (functional programming) |
| **Fiber** | Lightweight concurrency unit in Effect |
| **Stream** | Reactive stream (like RxJS Observable) |

---

**Last updated**: 2026-02-24
