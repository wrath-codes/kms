# Development Workflow

Daily commands, debugging tips, and development patterns.

---

## Table of Contents

1. [Development Commands](#development-commands)
2. [Debugging](#debugging)
3. [Testing Workflows](#testing-workflows)
4. [Code Patterns](#code-patterns)
5. [Performance Profiling](#performance-profiling)
6. [Common Tasks](#common-tasks)

---

## Development Commands

### Watch Mode (Recommended for Development)

```bash
# Terminal 1: Watch & rebuild on changes
bun run watch

# Terminal 2: Run tests on changes
bun run test:unit:watch

# Terminal 3: Debug in VS Code
# Press F5 to launch extension with debugger
```

This gives you:
- ✅ Auto-compilation on every file save
- ✅ Auto-test re-run (Vitest watches)
- ✅ Hot reload in VS Code (press `Cmd+R` in test window)

### One-Shot Commands

```bash
# Compile once
bun run compile

# Run all tests once
bun run test

# Run only unit tests
bun run test:unit

# Run only integration tests
bun run test:extension

# Run with coverage
bun run test:unit:coverage
```

### Build Variants

```bash
# Development build (sourcemaps, larger)
bun build src/extension.ts --outdir out --sourcemap=inline

# Production build (minified, smaller)
bun build src/extension.ts --outdir out --minify

# With bundler analysis
bun build src/extension.ts --outdir out --analyze
```

---

## Debugging

### In VS Code (Extension Host Debugging)

1. **Set up breakpoints**:
   - Click line number in editor to add breakpoint
   - Conditions: right-click breakpoint → "Edit Breakpoint" → add condition (e.g., `query.length > 10`)

2. **Launch debugger**:
   - Press `F5` (or Debug → Start Debugging)
   - A new VS Code window opens with your extension

3. **Debug actions**:
   - Step over: `F10`
   - Step into: `F11`
   - Step out: `Shift+F11`
   - Continue: `F5`
   - Restart: `Ctrl+Shift+F5`

4. **Inspect state**:
   - Hover over variables to see values
   - Use Debug Console to evaluate expressions: `Effect.runSync(someEffect)`
   - Check "Variables" panel for current scope

5. **Hot reload**:
   - After making changes to source, press `Cmd+R` (or `Ctrl+Shift+F5`)
   - Extension reloads without restarting VS Code

### VS Code DevTools (Renderer Process)

```bash
# In the test extension window:
# Press: F12 (or Help → Toggle Developer Tools)
```

Shows:
- Network (IPC calls to/from extension host)
- Performance (timeline of operations)
- Console (extension logs)

### Node Inspector (Extension Host Process)

For low-level debugging:

```bash
# In launch.json, add to config:
"runtimeArgs": ["--inspect-brk=9229"]

# Then run:
# F5 to launch

# In a separate terminal, attach Chrome DevTools:
# Open chrome://inspect
# Find your extension process
# Click "Inspect"
```

Shows:
- Full Node call stack
- V8 profiler
- Memory heap snapshots

---

## Testing Workflows

### Unit Tests (Vitest)

```bash
# Run all unit tests
bun run test:unit

# Run specific test file
bun test src/test/unit/contextService.spec.ts

# Run tests matching pattern
bun test --grep "ContextService"

# Watch mode (re-run on changes)
bun run test:unit:watch

# Update snapshots
bun test src/test/unit --update-snapshots

# Generate coverage
bun run test:unit:coverage
```

**Where to add tests**: `src/test/unit/**/*.spec.ts`

### Integration Tests (Mocha)

```bash
# Run all integration tests
bun run test:extension

# Run with coverage
bun run test:extension --coverage

# Watch mode
bun run test:extension:watch

# Specific test file
bun run test:extension -- --grep "Extension Integration"
```

**Where to add tests**: `src/test/integration/suite/**/*.test.ts`

### Test-Driven Development (TDD)

```typescript
// 1. Write a test first
describe("MyService", () => {
  it("should do the thing", () => {
    expect(doTheThing()).toEqual(expectedResult)
  })
})

// 2. Run test (fails)
// bun test src/test/unit/myService.spec.ts

// 3. Implement the service
// src/services/MyService.ts

// 4. Re-run test (passes)
```

### Debugging Tests

```typescript
// In test file, add .only to run just one test:
it.only("specific test", () => {
  // This test runs; others are skipped
})

// Add console.log for debugging:
it("test with logging", () => {
  console.log("Debugging info:", value)
  expect(value).toEqual(expected)
})

// Increase timeout for slow tests:
it("slow async test", async () => {
  // ...
}, 10000)  // 10 second timeout
```

---

## Code Patterns

### Creating a New Service

**Template**:

```typescript
// src/services/MyService.ts
import { Context, Data, Effect, Layer } from "effect"

// 1. Define error type
export class MyServiceError extends Data.TaggedError("MyServiceError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

// 2. Define interface
export interface MyService {
  readonly doThing: (input: string) => Effect.Effect<string, MyServiceError>
}

export const MyService = Context.GenericTag<MyService>("vscode-which-key/MyService")

// 3. Implement live layer
export const MyServiceLive = Layer.effect(MyService, Effect.gen(function* () {
  // Initialize resources if needed

  const doThing: MyService["doThing"] = (input) =>
    Effect.try({
      try: () => {
        // Do work synchronously
        return input.toUpperCase()
      },
      catch: (cause) => new MyServiceError({ message: "Failed to do thing", cause })
    })

  return MyService.of({ doThing })
}))
```

**Unit test**:

```typescript
// src/test/unit/myService.spec.ts
import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { MyService, MyServiceLive } from "../../services/MyService"

describe("MyService", () => {
  it("does the thing", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* MyService
        return yield* service.doThing("hello")
      }).pipe(Effect.provide(MyServiceLive))
    )
    expect(result).toBe("HELLO")
  })
})
```

### Working with Refs (Mutable State)

```typescript
const program = Effect.gen(function* () {
  // Create a mutable reference
  const counter = yield* Ref.make(0)

  // Read current value
  const current = yield* Ref.get(counter)
  console.log(`Current: ${current}`)

  // Update and return new value
  const next = yield* Ref.update(counter, (n) => n + 1)
  console.log(`After increment: ${next}`)

  // Set new value
  yield* Ref.set(counter, 100)

  // Atomic compare-and-swap
  const swapped = yield* Ref.compareAndSet(counter, 100, 200)
  console.log(`Swapped: ${swapped}`)
})
```

### Working with Streams

```typescript
import { Stream } from "effect"

const program = Effect.gen(function* () {
  // Create a stream from an async iterable
  const stream = Stream.fromAsyncIterable(
    async function* () {
      for (let i = 0; i < 5; i++) {
        yield i
      }
    }
  )

  // Transform the stream
  const squared = stream.pipe(
    Stream.map((n) => n * n),
    Stream.filter((n) => n > 10)
  )

  // Consume the stream
  yield* squared.pipe(
    Stream.tap((n) => Effect.sync(() => console.log(n))),
    Stream.runDrain
  )
})
```

### Working with Semaphores (Concurrency Control)

```typescript
const program = Effect.gen(function* () {
  // Create a semaphore with 4 permits
  const sem = yield* Semaphore.make(4)

  // Run multiple tasks with bounded concurrency
  yield* Effect.forEach(
    Array.from({ length: 100 }, (_, i) => i),
    (i) =>
      Semaphore.withPermits(sem, 1)(
        Effect.delay(Effect.sync(() => console.log(`Task ${i}`)), "100 millis")
      ),
    { concurrency: "unbounded" } // acquire as many permits as needed, but semaphore limits to 4
  )
})
```

### Working with TestClock

```typescript
// src/test/unit/timing.spec.ts
import { it } from "@effect/vitest"
import { Effect, TestClock, Duration } from "effect"

it.effect("schedules work on a timer", () =>
  Effect.gen(function* () {
    // Skip time forward without actually waiting
    const fiber = yield* Effect.fork(
      Effect.sleep(Duration.seconds(10)).pipe(
        Effect.tap(() => Effect.sync(() => console.log("Done!")))
      )
    )

    // Nothing printed yet (time hasn't advanced)

    // Jump ahead 10 seconds
    yield* TestClock.adjust(Duration.seconds(10))

    // Now the fiber completes and prints
    yield* Fiber.join(fiber)
  })
)
```

---

## Performance Profiling

### Measure a Single Operation

```typescript
// Inline measurement
const start = performance.now()
// ... do work
const elapsed = performance.now() - start
console.log(`Operation took ${elapsed.toFixed(2)}ms`)
```

### Add Instrumentation to Services

```typescript
// In your service, wrap operations with timers:
const doThing = (input: string) =>
  Effect.gen(function* () {
    const start = performance.now()
    try {
      // ... do work
      const result = process(input)
      const elapsed = performance.now() - start
      console.log(`[MyService.doThing] ${elapsed.toFixed(2)}ms`)
      return result
    } catch (cause) {
      const elapsed = performance.now() - start
      console.error(`[MyService.doThing] FAILED after ${elapsed.toFixed(2)}ms`)
      throw cause
    }
  })
```

### Profile with DevTools

**Extension host process**:

```bash
# 1. Press F5 to launch with debugger
# 2. Open DevTools (Cmd+Opt+I)
# 3. Go to "Performance" tab
# 4. Click "Record"
# 5. Do your action (type in search, press keys)
# 6. Click "Stop"
# 7. Analyze the timeline
```

**VS Code process** (DevTools):

```bash
# In the extension test window:
# 1. Press F12
# 2. Go to "Performance" tab
# 3. Record and analyze
```

### Benchmark with Vitest

```typescript
import { bench, describe } from "vitest"

describe("Performance", () => {
  bench("search with 50k commands", () => {
    searchIndex(index, "go definition", 500)
  }, { warmupIterations: 3, iterations: 100 })
})
```

Run with: `bun run test:unit`

Output:
```
search with 50k commands  2.35ms ±0.15ms
```

---

## Common Tasks

### Add a New Command

1. **Define the command** in `package.json`:
   ```json
   "commands": [
     {
       "command": "myext.myCommand",
       "title": "My Command",
       "category": "My Category"
     }
   ]
   ```

2. **Implement the handler**:
   ```typescript
   const myCommand = Effect.gen(function* () {
     const cmd = yield* CommandService
     yield* cmd.run("editor.action.goToDefinition")
   })
   ```

3. **Register in activation**:
   ```typescript
   context.subscriptions.push(
     vscode.commands.registerCommand("myext.myCommand", () =>
       Effect.runPromise(myCommand.pipe(Effect.provide(MainLayer)))
     )
   )
   ```

### Update Configuration Schema

1. **Add to `package.json`**:
   ```json
   "configuration": {
     "title": "My Extension",
     "properties": {
       "myext.delay": {
        "type": "number",
        "default": 0,
        "description": "Delay in ms"
       }
     }
   }
   ```

2. **Read in code**:
   ```typescript
   const delay = yield* ConfigService.get("myext", "delay", 0)
   ```

3. **Test caching**:
   ```typescript
   it("caches config reads", async () => {
     const cfg = yield* ConfigService
     const val1 = yield* cfg.get("myext", "delay", 0)
     const val2 = yield* cfg.get("myext", "delay", 0)  // cached
     expect(val1).toBe(val2)
   })
   ```

### Run a Specific Integration Test

```bash
# Run tests matching a pattern
bun run test:extension -- --grep "command executes"

# Run a specific suite
bun run test:extension -- --grep "Extension Integration"
```

### Generate Coverage Report

```bash
# Generate HTML coverage report
bun run test:unit:coverage

# Open in browser
open coverage/index.html
```

### Update TypeScript Definitions

If you update type definitions, rebuild:

```bash
bun run compile

# Or with type checking:
bunx tsc --noEmit
```

### Publish a New Version

```bash
# 1. Update version in package.json
# 2. Update CHANGELOG.md
# 3. Commit and tag
git tag v1.0.1
git push origin v1.0.1

# 4. Publish to Marketplace
npm install -g @vscode/vsce
vsce publish --pat <your-pat>
```

### Debug Flaky Tests

```typescript
// Add retry logic to integration tests
it("sometimes slow command", async () => {
  // ... test code
}).timeout(10000)  // increase timeout

// Or use Vitest retry:
it.each([1, 2, 3])("flaky test (attempt %i)", async () => {
  // ...
})
```

---

## Keyboard Shortcuts (VS Code)

| Shortcut | Action |
|----------|--------|
| `F5` | Start/Continue debugging |
| `F10` | Step over |
| `F11` | Step into |
| `Shift+F11` | Step out |
| `Ctrl+Shift+F5` | Restart debugger |
| `Cmd+R` | Reload extension (test window only) |
| `F12` | Toggle DevTools |
| `Cmd+Shift+P` | Command Palette |
| `Ctrl+Opt+J` | Open Console in DevTools |

---

## Troubleshooting Development Issues

### "Module not found: vscode"

**Cause**: Aliasing not set up correctly for tests.

**Fix**: Check `vitest.config.ts` has correct alias:
```typescript
alias: {
  'vscode': path.resolve(__dirname, 'src/test/shims/vscodeShim.ts'),
}
```

### "Tests hanging"

**Cause**: Effect is waiting for a resource that never completes.

**Fix**: Add timeout to test:
```typescript
it("my test", async () => {
  // ...
}, 5000)  // 5 second timeout
```

### "Hot reload not working"

**Cause**: Build is stale.

**Fix**:
1. Kill watch process (`Ctrl+C`)
2. Run `bun run compile`
3. Restart watch: `bun run watch`
4. Press `Cmd+R` in test window

### "Test fails in CI but passes locally"

**Cause**: Timing issue, environment difference.

**Fix**:
- Increase timeout for flaky tests
- Use `TestClock.adjust()` instead of `setTimeout`
- Check OS differences (Linux vs. macOS vs. Windows)

---

**Last updated**: 2026-02-24
