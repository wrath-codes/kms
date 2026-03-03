# API Reference

Complete TypeScript interfaces and method signatures for all 7 Effect-TS services.

---

## Table of Contents

1. [Shared Types](#shared-types)
2. [ContextService](#contextservice)
3. [ConfigService](#configservice)
4. [RegistryService](#registryservice)
5. [SearchService](#searchservice)
6. [CommandService](#commandservice)
7. [RenderModelService](#rendermodelservice)
8. [DispatchQueue](#dispatchqueue)
9. [Layers](#layers)

---

## Shared Types

### Error Types

All services export their error types. They extend `Data.TaggedError`:

```typescript
// VscodeEffect.ts
export class VscodeIpcError extends Data.TaggedError("VscodeIpcError")<{
  readonly op: string
  readonly cause: unknown
}> {}

// ConfigService.ts
export class ConfigReadError extends Data.TaggedError("ConfigReadError")<{
  readonly key: string
  readonly cause: unknown
}> {}

// ContextService.ts
export class ContextFlushError extends Data.TaggedError("ContextFlushError")<{
  readonly cause: VscodeIpcError
}> {}

// etc.
```

**Usage**:
```typescript
const result = yield* service.doSomething().pipe(
  Effect.catchAll((err) => {
    if (err instanceof ConfigReadError) {
      // handle config error
    } else {
      // handle other errors
    }
  })
)
```

### Domain Types

```typescript
// domain/types.ts

export type CommandId = string & { readonly __CommandId: unique symbol }

export interface Command {
  readonly id: CommandId
  readonly title: string
  readonly keys?: string                 // e.g. "ctrl+k ctrl+s"
  readonly category?: string             // e.g. "editor"
  readonly description?: string
  readonly when?: string                 // VS Code "when" clause
  readonly args?: ReadonlyArray<unknown>
}

export type RegistrySnapshot = ReadonlyArray<Command>
```

---

## ContextService

### Purpose

Batch and deduplicate `setContext` calls. Flush on a 10ms schedule to reduce IPC overhead.

### Interface

```typescript
export interface ContextService {
  /**
   * Set a single context key.
   * Coalesced until the next flush window (typically 10–20ms).
   * 
   * @param key - Context key (e.g., "whichkey.active")
   * @param value - Value to set (boolean, string, number, null)
   * @returns Effect that completes immediately (IPC happens asynchronously)
   */
  readonly set: (key: string, value: unknown) => Effect.Effect<void, never>

  /**
   * Set multiple context keys at once.
   * Equivalent to calling `set(key, val)` for each entry.
   * 
   * @param patch - Record of key-value pairs
   * @returns Effect that completes immediately
   */
  readonly setMany: (patch: Readonly<Record<string, unknown>>) => Effect.Effect<void, never>

  /**
   * Force an immediate flush of pending context updates.
   * Skips unchanged values. Parallelizes IPC calls (up to 8 concurrent).
   * 
   * @returns Effect that completes when all IPC calls finish
   * @throws ContextFlushError if IPC fails
   */
  readonly flushNow: Effect.Effect<void, ContextFlushError>
}

export const ContextService = Context.GenericTag<ContextService>(
  "vscode-which-key/ContextService"
)

export const ContextServiceLive = Layer.effect(ContextService, /* ... */)
```

### Example

```typescript
const program = Effect.gen(function* () {
  const ctx = yield* ContextService
  
  // Set keys (coalesced)
  yield* ctx.set("whichkey.active", true)
  yield* ctx.set("whichkey.mode", "search")
  
  // Force flush immediately (e.g., before critical operation)
  yield* ctx.flushNow
}).pipe(Effect.provide(ContextServiceLive))

yield* Effect.runPromise(program)
```

---

## ConfigService

### Purpose

Cache configuration values and invalidate on `workspace.onDidChangeConfiguration` events.

### Interface

```typescript
export interface ConfigService {
  /**
   * Get a single configuration value.
   * Cached by `section.key`. Returns immediately for cached values.
   * Invalidates only when the setting actually changes.
   * 
   * @param section - Configuration section (e.g., "whichkey")
   * @param key - Configuration key (e.g., "delay")
   * @param defaultValue - Default if key is not set
   * @returns Cached or freshly read value
   * @throws ConfigReadError if read fails
   * 
   * @example
   * ```typescript
   * const delay = yield* config.get("whichkey", "delay", 0)
   * ```
   */
  readonly get: <A>(section: string, key: string, defaultValue: A) => Effect.Effect<A, ConfigReadError>

  /**
   * Get an entire configuration section as an object.
   * Cached by section name.
   * 
   * @param section - Section name
   * @returns Section object
   * @throws ConfigReadError if read fails
   */
  readonly getSection: <A extends object>(section: string) => Effect.Effect<A, ConfigReadError>

  /**
   * Manually invalidate all cached configuration.
   * Called automatically on `workspace.onDidChangeConfiguration`.
   * Useful for testing or forced refreshes.
   * 
   * @returns Effect that completes synchronously
   */
  readonly invalidateAll: Effect.Effect<void>
}

export const ConfigService = Context.GenericTag<ConfigService>(
  "vscode-which-key/ConfigService"
)

export const ConfigServiceLive = Layer.scoped(ConfigService, /* ... */)
```

### Example

```typescript
const program = Effect.gen(function* () {
  const cfg = yield* ConfigService
  
  const delay = yield* cfg.get("whichkey", "delay", 0)
  const showIcons = yield* cfg.get("whichkey", "showIcons", true)
  
  // Both are cached; subsequent calls return immediately
  const delayAgain = yield* cfg.get("whichkey", "delay", 0)  // instant
})
```

---

## RegistryService

### Purpose

Store and precompute command metadata (tokenized index, search fields).

### Interface

```typescript
export interface RegistryIndexItem {
  readonly id: CommandId
  readonly title: string
  readonly keys: string
  readonly keysLower: string
  readonly titleLower: string
  readonly tokens: ReadonlyArray<string>
  readonly searchTextLower: string      // joined: keys + title + category
  readonly category?: string
}

export interface RegistrySnapshot {
  readonly version: number
  readonly commands: ReadonlyArray<Command>
  readonly index: ReadonlyArray<RegistryIndexItem>
  readonly byId: ReadonlyMap<CommandId, Command>
  readonly idsByCategory: ReadonlyMap<string, ReadonlyArray<CommandId>>
}

export interface RegistryService {
  /**
   * Get the current registry snapshot.
   * Includes precomputed indices for fast search and rendering.
   * 
   * @returns Current snapshot
   */
  readonly get: Effect.Effect<RegistrySnapshot, never>

  /**
   * Load and index a new set of commands.
   * Increments the version number.
   * Invalidates dependent caches (RenderModelService, SearchService).
   * 
   * @param commands - Array of commands to index
   * @returns Effect that completes after indexing
   * @throws RegistryError if indexing fails
   * 
   * @example
   * ```typescript
   * yield* registry.reload([
   *   { id: "cmd1" as CommandId, title: "Go to Line", keys: "ctrl+g" },
   *   { id: "cmd2" as CommandId, title: "Find", keys: "ctrl+f" },
   * ])
   * ```
   */
  readonly reload: (commands: ReadonlyArray<Command>) => Effect.Effect<void, RegistryError>
}

export const RegistryService = Context.GenericTag<RegistryService>(
  "vscode-which-key/RegistryService"
)

export const RegistryServiceLive = Layer.effect(RegistryService, /* ... */)
```

### Example

```typescript
const program = Effect.gen(function* () {
  const registry = yield* RegistryService
  
  // Load commands
  const commands: Command[] = [/* ... */]
  yield* registry.reload(commands)
  
  // Get snapshot
  const snap = yield* registry.get
  console.log(`Loaded ${snap.commands.length} commands`)
  console.log(`Index version: ${snap.version}`)
  
  // Access precomputed indices
  snap.index.forEach(item => {
    console.log(`${item.id}: ${item.title}`)
  })
})
```

---

## SearchService

### Purpose

Stream search results in real-time, canceling previous searches on new queries.

### Interface

```typescript
export interface SearchMatch {
  readonly id: CommandId
  readonly score: number
}

export interface SearchService {
  /**
   * Update the active search query.
   * Cancels any previous search. Emits results on `results` stream.
   * Debounced by 30ms.
   * 
   * @param query - Search query (e.g., "go definition")
   * @returns Effect that completes immediately
   */
  readonly setQuery: (query: string) => Effect.Effect<void, never>

  /**
   * Stream of search results for the current query.
   * Emits progressively (first 50 results fast, then remainder).
   * Cancels automatically when query changes.
   * 
   * @returns Stream of matches, sorted by score (descending)
   */
  readonly results: Stream.Stream<SearchMatch, SearchError>

  /**
   * Run a one-off search (separate from active query).
   * Useful for testing or independent queries.
   * 
   * @param query - Search query
   * @returns Stream of matches
   */
  readonly run: (query: string) => Stream.Stream<SearchMatch, SearchError>
}

export const SearchService = Context.GenericTag<SearchService>(
  "vscode-which-key/SearchService"
)

export const SearchServiceLive = Layer.effect(SearchService, /* ... */)
```

### Example

```typescript
const program = Effect.gen(function* () {
  const search = yield* SearchService
  
  // Set query (cancels previous)
  yield* search.setQuery("go definition")
  
  // Consume results
  yield* search.results.pipe(
    Stream.take(10),  // top 10
    Stream.tap(m => Effect.sync(() => {
      console.log(`${m.id}: score ${m.score}`)
    })),
    Stream.runDrain
  )
})
```

---

## CommandService

### Purpose

Execute VS Code commands with bounded concurrency and fire-and-forget UI operations.

### Interface

```typescript
export interface CommandService {
  /**
   * Execute a VS Code command with bounded concurrency (default pool: 4).
   * Safe for commands that can run in parallel.
   * 
   * @param command - Command ID (e.g., "editor.action.goToDefinition")
   * @param args - Command arguments
   * @returns Result of the command (generic, typically void)
   * @throws CommandError if command execution fails
   * 
   * @example
   * ```typescript
   * const result = yield* commands.run("editor.action.goToDefinition", editor, position)
   * ```
   */
  readonly run: <A = unknown>(command: string, ...args: ReadonlyArray<unknown>) => Effect.Effect<A, CommandError>

  /**
   * Execute a command exclusively (one at a time).
   * Use for commands that must not overlap (e.g., file I/O).
   * 
   * @param command - Command ID
   * @param args - Command arguments
   * @returns Result of the command
   * @throws CommandError if command execution fails
   * 
   * @example
   * ```typescript
   * // Ensures only one file operation at a time
   * yield* commands.runExclusive("files.save")
   * ```
   */
  readonly runExclusive: <A = unknown>(command: string, ...args: ReadonlyArray<unknown>) => Effect.Effect<A, CommandError>

  /**
   * Hide a VS Code QuickPick without blocking.
   * Forks as a daemon fiber (fire-and-forget).
   * Never awaited; command execution proceeds immediately.
   * 
   * @param qp - QuickPick instance
   * @returns Effect that completes immediately (hide happens asynchronously)
   * 
   * @example
   * ```typescript
   * yield* commands.hideQuickPick(quickPick)
   * // QuickPick hides in background; execution continues
   * yield* commands.run("myCommand")  // runs immediately, no wait
   * ```
   */
  readonly hideQuickPick: (qp: vscode.QuickPick<any>) => Effect.Effect<void, never>
}

export const CommandService = Context.GenericTag<CommandService>(
  "vscode-which-key/CommandService"
)

export const CommandServiceLive = Layer.effect(CommandService, /* ... */)
```

### Example

```typescript
const program = Effect.gen(function* () {
  const commands = yield* CommandService
  
  // Run command with bounded concurrency (up to 4 in parallel)
  yield* commands.run("editor.action.goToDefinition")
  
  // Run multiple commands in parallel
  yield* Effect.all([
    commands.run("editor.action.formatDocument"),
    commands.run("editor.action.organizeImports"),
  ])
  
  // Run exclusive command (one at a time)
  yield* commands.runExclusive("files.save")
  
  // Hide UI without blocking
  yield* commands.hideQuickPick(quickPick)
  // execution continues immediately
})
```

---

## RenderModelService

### Purpose

Compute memoized render models (display-ready item lists) keyed by registry version and query.

### Interface

```typescript
export type RenderRow = {
  readonly label: string
  readonly detail?: string
  readonly commandId: CommandId
}

export interface RenderModel {
  readonly registryVersion: number
  readonly query: string
  readonly rows: ReadonlyArray<RenderRow>
  readonly total: number  // total matches (may exceed `rows.length` if paginated)
}

export interface RenderModelService {
  /**
   * Build a render model for a query.
   * Memoized by (registryVersion, query). Returns cached model if available.
   * Cache is bounded at 50 items; oldest entries are evicted.
   * 
   * @param query - Search query
   * @param maxResults - Max rows to include (default: 200)
   * @returns Render model with rows ready for QuickPick.items
   * @throws RenderModelError if model building fails
   * 
   * @example
   * ```typescript
   * const model = yield* render.buildModel("go definition")
   * console.log(`${model.rows.length} / ${model.total} results`)
   * quickPick.items = model.rows.map(r => ({
   *   label: r.label,
   *   detail: r.detail,
   *   commandId: r.commandId,
   * }))
   * ```
   */
  readonly buildModel: (query: string, maxResults?: number) => Effect.Effect<RenderModel, RenderModelError>

  /**
   * Clear the memoization cache.
   * Useful when the registry changes or you want to force a recompute.
   * 
   * @returns Effect that completes synchronously
   */
  readonly clearCache: Effect.Effect<void>
}

export const RenderModelService = Context.GenericTag<RenderModelService>(
  "vscode-which-key/RenderModelService"
)

export const RenderModelServiceLive = Layer.effect(RenderModelService, /* ... */)
```

### Example

```typescript
const program = Effect.gen(function* () {
  const render = yield* RenderModelService
  
  const model = yield* render.buildModel("go definition", 200)
  console.log(`Rendering ${model.rows.length} of ${model.total} results`)
  
  // Use model for UI
  quickPick.items = model.rows.map(row => ({
    label: row.label,
    detail: row.detail,
  }))
})
```

---

## DispatchQueue

### Purpose

Queue and batch user actions (key presses, selections) into a single in-memory state store.

### Interface

```typescript
export type AppState = {
  readonly query: string
  readonly selectedId: CommandId | null
  readonly visibleIds: ReadonlyArray<CommandId>
}

export type Action =
  | { readonly _tag: "SetQuery"; readonly query: string }
  | { readonly _tag: "SetVisibleIds"; readonly ids: ReadonlyArray<CommandId> }
  | { readonly _tag: "Select"; readonly id: CommandId | null }
  | { readonly _tag: "Reset" }

export interface DispatchQueue {
  /**
   * Get the current application state.
   * Updated asynchronously as actions are processed.
   * 
   * @returns Effect that returns current state synchronously
   */
  readonly state: Effect.Effect<AppState, never>

  /**
   * Dispatch an action.
   * Queued and coalesced with other actions.
   * Returns immediately (action is processed asynchronously).
   * 
   * @param action - Action to dispatch
   * @returns Effect that completes immediately
   * 
   * @example
   * ```typescript
   * yield* dispatch.dispatch({ _tag: "SetQuery", query: "go" })
   * yield* dispatch.dispatch({ _tag: "SetQuery", query: "go d" })
   * // Both coalesced into one state update
   * ```
   */
  readonly dispatch: (action: Action) => Effect.Effect<void, never>

  /**
   * Shutdown the dispatch queue worker.
   * Called automatically on deactivation.
   * 
   * @returns Effect that completes when worker stops
   */
  readonly shutdown: Effect.Effect<void, never>
}

export const DispatchQueue = Context.GenericTag<DispatchQueue>(
  "vscode-which-key/DispatchQueue"
)

export const DispatchQueueLive = Layer.scoped(DispatchQueue, /* ... */)
```

### Example

```typescript
const program = Effect.gen(function* () {
  const dispatch = yield* DispatchQueue
  
  // Dispatch actions
  yield* dispatch.dispatch({ _tag: "SetQuery", query: "go definition" })
  yield* dispatch.dispatch({ _tag: "SetVisibleIds", ids: ["cmd1", "cmd2"] })
  yield* dispatch.dispatch({ _tag: "Select", id: "cmd1" })
  
  // Get current state
  const state = yield* dispatch.state
  console.log(`Query: ${state.query}`)
  console.log(`Selected: ${state.selectedId}`)
})
```

---

## Layers

### Composition

Combine all services into a single `MainLayer`:

```typescript
// src/layers/MainLayer.ts
import { Layer } from "effect"
import { ContextServiceLive } from "../services/ContextService"
import { ConfigServiceLive } from "../services/ConfigService"
import { RegistryServiceLive } from "../services/RegistryService"
import { SearchServiceLive } from "../services/SearchService"
import { CommandServiceLive } from "../services/CommandService"
import { RenderModelServiceLive } from "../services/RenderModelService"
import { DispatchQueueLive } from "../services/DispatchQueue"

export const MainLayer = Layer.mergeAll(
  ContextServiceLive,
  ConfigServiceLive,
  RegistryServiceLive,
  SearchServiceLive,
  CommandServiceLive,
  RenderModelServiceLive,
  DispatchQueueLive
)
```

### Advanced Path (50k+ commands)

Swap `RegistryService` for advanced variant:

```typescript
export const MainLayerAdvanced = Layer.mergeAll(
  ContextServiceLive,
  ConfigServiceLive,
  RegistryServiceAdvancedLive,  // ← inverted index + worker
  SearchServiceAdvancedLive,     // ← worker-backed search
  CommandServiceLive,
  RenderModelServiceLive,
  DispatchQueueLive
)
```

### Extension Activation

```typescript
// src/extension.ts
import { Effect, Layer, Runtime } from "effect"
import { MainLayer } from "./layers/MainLayer"

export function activate(context: vscode.ExtensionContext) {
  const program = Effect.gen(function* () {
    // Load commands
    const registry = yield* RegistryService
    const commands = loadCommandsFromVSCode()
    yield* registry.reload(commands)
    
    // Register command handlers
    yield* registerCommandHandlers()
  })

  const runtime = Runtime.defaultRuntime
  const fiber = Effect.runFork(
    Layer.launch(MainLayer).pipe(
      Effect.zipRight(program)
    )
  )

  context.subscriptions.push({
    dispose: () => {
      fiber.interrupt()
    }
  })
}
```

---

## Error Handling Pattern

All services use Effect's error system. Handle with `.pipe(Effect.catchAll)`:

```typescript
const program = Effect.gen(function* () {
  const ctx = yield* ContextService
  
  const result = yield* ctx.flushNow.pipe(
    Effect.matchEffect(
      {
        onFailure: (err: ContextFlushError) => {
          // Handle error
          console.error("Context flush failed:", Cause.pretty(err))
          return Effect.fail(err)
        },
        onSuccess: (val) => {
          console.log("Context flushed successfully")
          return Effect.succeed(val)
        },
      }
    )
  )
})
```

Or use `.pipe(Effect.catchAll)` for generic error handling:

```typescript
yield* ctx.flushNow.pipe(
  Effect.catchAll((err) => {
    console.error(Cause.pretty(err))
    return Effect.void
  })
)
```

---

**Last updated**: 2026-02-24
