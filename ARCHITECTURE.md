# High-Performance VS Code Extension with Effect-TS and Bun

Complete architecture, setup guide, implementation plan, and testing strategy for building a fast, scalable VS Code extension.

---

## Table of Contents

1. [Status: Setup Complete](#status-setup-complete)
2. [Architecture Overview](#architecture-overview)
3. [Why Effect-TS](#why-effect-ts)
4. [Setup with Bun](#setup-with-bun)
5. [Simple Path (Typical Registries)](#simple-path-typical-registries)
6. [Advanced Path (50k+ Commands)](#advanced-path-50k-commands)
7. [Implementation Plan & Tasks](#implementation-plan--tasks)
8. [Code Examples](#code-examples)
9. [Testing Strategy](#testing-strategy)
10. [Performance Targets](#performance-targets)
11. [Deployment & CI/CD](#deployment--cicd)

---

## Status: Setup Complete

### ✅ What's Done (2025-03-03)

**Project initialized and verified working:**

#### Core Files Created
- `package.json` — Bun scripts, deps (effect, vscode, vitest, mocha)
- `tsconfig.json` — Strict TS, types restricted to `["node", "vscode"]` (prevents Bun types from leaking)
- `bunfig.toml` — Bun build config
- `vitest.config.ts` — Unit test config with vscode shim alias
- `.vscode-test.mjs` — Extension test runner config

#### VS Code Debug Configuration
- `.vscode/launch.json` — Debug + test configs
- `.vscode/tasks.json` — Bun watch/compile tasks (default: `bun: watch`)
- `.vscode/settings.json` — macOS shell fix for zsh PATH (login + interactive)

#### Project Structure
```
src/
├── extension.ts              # Entry point (activate/deactivate)
├── domain/                   # Type definitions (NEXT)
├── services/                 # Effect-TS services (NEXT)
├── layers/                   # MainLayer composition (NEXT)
└── test/
    ├── shims/vscodeShim.ts   # Mock vscode module for tests
    ├── unit/                 # Unit tests (Vitest)
    └── integration/suite/     # Integration tests (Mocha)
```

#### Build & Test Verification
- **Build**: `bun run compile` ✅ (2.7KB bundled, CommonJS, sourcemap)
- **Watch**: `bun run watch` ✅ (background rebuild)
- **Unit Tests**: `bun run test:unit` ✅ (2 tests passing)
- **Debug**: F5 in VS Code ✅ (launches extension host)

#### Key Design Decisions
1. **Bun is tooling, Node is runtime** — Extension runs in VS Code's Node extension host, not Bun
   - `--target=node` correct (Node.js extension host)
   - `--format=cjs` correct (CommonJS for VS Code)
   - `--external=*` correct (all node_modules are external)

2. **Type safety** — `tsconfig.json` restricted to `["node", "vscode"]`
   - Prevents accidental use of Bun-only APIs (`Bun.file`, etc.)
   - `@types/bun` only available in scripts, not src/

3. **macOS compatibility** — Automation profile set to login zsh
   - Ensures `bun run` works from VS Code tasks
   - Works around zsh non-login shell limitation

### 🚀 Ready for Phase 1

Next: Implement [Phase 1: Foundation](#implementation-plan--tasks) tasks.

---

## Architecture Overview

### Problem Statement

The current VS Code which-key extension suffers from **8 major bottlenecks**:

1. **Excessive `setContext` IPC round-trips** (3–5 per keystroke)
2. **Forced `await hide()` before command execution** (blocking hot path)
3. **Serial command execution** (each IPC call blocks the next)
4. **Repeated config reads** (no caching, 4 reads per keystroke)
5. **O(n) rendering with no memoization** (filter + reduce + map on every submenu)
6. **Full-tree rebuilds on search** (no precomputation)
7. **Dispatch queue serialization lock** (one slow op blocks all keypresses)
8. **Inefficient search at scale** (no inverted index for 50k+ commands)

### Solution: Effect-TS Layered Services

Replace ad-hoc promise choreography with structured, composable services built on Effect-TS layers.

```
┌─────────────────────────────────────────────────┐
│         VS Code Extension Host (Node)           │
├─────────────────────────────────────────────────┤
│                   MainLayer                      │
│  (Layer.mergeAll of 7 services below)           │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ 1. ContextService                        │  │
│  │    • Batch setContext calls              │  │
│  │    • Dedupe unchanged values             │  │
│  │    • Flush on 10ms schedule              │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ 2. ConfigService                         │  │
│  │    • Cache config snapshot               │  │
│  │    • Invalidate on onDidChangeConfig     │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ 3. RegistryService                       │  │
│  │    • Precompute tokenized index          │  │
│  │    • Stable command IDs + metadata       │  │
│  │    (Advanced: inverted index in worker)  │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ 4. SearchService                         │  │
│  │    • Stream.flatMapLatest for cancellation  │
│  │    • Debounce 30ms per keystroke        │  │
│  │    • (Advanced: worker-backed scoring)   │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ 5. CommandService                        │  │
│  │    • Semaphore(4) for bounded concurrency  │
│  │    • Fire-and-forget UI hide             │  │
│  │    • runExclusive for serial ops         │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ 6. RenderModelService                    │  │
│  │    • Memoize by (registryVersion, query) │  │
│  │    • Cap cache at 50 items               │  │
│  │    • (Advanced: pagination support)      │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ 7. DispatchQueue                         │  │
│  │    • effect/Queue with worker fiber      │  │
│  │    • Batch + reduce actions              │  │
│  │    • No lock contention                  │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────┐
│         VS Code UI (QuickPick / TreeView)       │
│    (Minimal updates, only deltas sent)          │
└─────────────────────────────────────────────────┘
```

### Key Principles

1. **Minimize IPC**: Batch `setContext`, cache config, precompute indices
2. **Don't await UI**: Fire-and-forget `hide()`, never block commands on animation
3. **Memoize aggressively**: Cache renders, search results, computed fields
4. **Concurrency with bounds**: Semaphores, queues, cancellation
5. **Stream-based events**: Cancellable, composable, backpressure-aware
6. **Separate layers for testing**: Same service interface, swap implementations

---

## Why Effect-TS

### What Effect Gives You

- **Structured concurrency** — fibers + cancellation (no orphan promises)
- **Layers** — dependency injection + resource lifecycle (Scope)
- **Streams** — composable, cancellable event processing (`.flatMapLatest` cancels old work)
- **Ref** — mutable state with atomic updates
- **Queue** — bounded work queues with backpressure
- **Semaphore** — scoped concurrency control
- **TestClock** — fake time (tests run in milliseconds, not seconds)
- **@effect/vitest** — native integration with test runner

### What You Avoid

- ❌ Callback hell (use generators)
- ❌ Race conditions (structured concurrency)
- ❌ Resource leaks (automatic cleanup via Scope)
- ❌ Ad-hoc error handling (unified Cause system)
- ❌ Slow tests (TestClock skips time)

---

## Setup with Bun

### Important: Bun = Tooling, Node = Runtime

**Bun** is used for:
- Package management (`bun install`)
- Build/bundling (`bun build`)
- Test running (`vitest` via Bun)
- Dev tasks (`bun run watch`)

**Node.js** is the actual runtime:
- VS Code runs extensions in a **Node.js Extension Host** (not Bun)
- Your bundled code must be CommonJS compatible with Node
- `--target=node` and `--format=cjs` are correct choices

This is why `tsconfig.json` restricts types to `["node", "vscode"]` — it prevents accidentally using Bun-only APIs that won't exist at runtime.

### 1. Initialize Project

```bash
mkdir my-vscode-extension && cd my-vscode-extension

# Initialize as Bun project
bun init

# Install dependencies
bun add \
  vscode \
  effect@latest \
  @effect/platform@latest

bun add --dev \
  @types/vscode \
  @types/bun \
  bun-types \
  typescript \
  @vscode/test-cli@latest \
  @vscode/test-electron@latest \
  vitest@latest \
  @effect/vitest@latest \
  mocha@latest \
  @types/mocha@latest \
  c8
```

### 2. Project Structure

```
my-vscode-extension/
├── .vscode/
│   ├── launch.json                 # Debugging configs
│   └── tasks.json                  # Build tasks
├── .vscode-test.mjs                # @vscode/test-cli config
├── vitest.config.ts                # Vitest unit test config
├── bunfig.toml                      # Bun config
├── tsconfig.json
├── package.json
│
├── src/
│   ├── extension.ts                # activate/deactivate entry
│   ├── domain/
│   │   └── types.ts                # Command, RegistrySnapshot, etc.
│   ├── services/
│   │   ├── VscodeEffect.ts         # Shared error handling
│   │   ├── ContextService.ts       # Batched setContext
│   │   ├── ConfigService.ts        # Cached config
│   │   ├── RegistryService.ts      # Precomputed index (simple path)
│   │   ├── RegistryServiceAdvanced.ts  # Inverted index (advanced)
│   │   ├── SearchService.ts        # Streaming search
│   │   ├── CommandService.ts       # Semaphore-gated execution
│   │   ├── RenderModelService.ts   # Memoized renders
│   │   └── DispatchQueue.ts        # Batched action reducer
│   ├── layers/
│   │   ├── MainLayer.ts            # Layer.mergeAll(...)
│   │   └── MainLayerAdvanced.ts    # Swap RegistryService for Advanced
│   ├── worker/
│   │   └── indexWorker.ts          # Background index builder (advanced)
│   ├── ui/
│   │   └── whichKeyMenu.ts         # QuickPick integration
│   └── test/
│       ├── shims/
│       │   └── vscodeShim.ts       # vscode module mock
│       ├── unit/
│       │   ├── contextService.spec.ts
│       │   ├── registryService.spec.ts
│       │   ├── searchService.spec.ts
│       │   └── renderModelService.spec.ts
│       └── integration/
│           ├── suite/
│           │   ├── index.ts         # Mocha entry
│           │   └── extension.test.ts
│           └── runTest.ts
│
├── dist/                           # Compiled output
├── out/                            # Built output
└── scripts/
    └── build-registry-index.ts     # Bun-powered pre-indexing
```

### 3. `package.json` Scripts

```json
{
  "name": "kms",
  "version": "0.1.0",
  "description": "Knowledge Management System - VS Code Extension",
  "scripts": {
    "compile": "bun build src/extension.ts --outdir out --target=node --format=cjs --external=* --sourcemap=linked",
    "watch": "bun build src/extension.ts --outdir out --target=node --format=cjs --external=* --sourcemap=inline --watch",
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:unit:coverage": "vitest run --coverage",
    "test:extension": "vscode-test",
    "test:extension:watch": "vscode-test --watch",
    "test": "npm run test:unit && npm run test:extension",
    "pretest": "npm run compile",
    "vscode:prepublish": "npm run compile"
  },
  "dependencies": {
    "effect": "^3.16.0"
  },
  "devDependencies": {
    "@effect/vitest": "^0.19.0",
    "@types/bun": "latest",
    "@types/mocha": "^10.0.10",
    "@types/node": "^25.3.0",
    "@types/vscode": "^1.100.0",
    "@vscode/test-cli": "latest",
    "@vscode/test-electron": "latest",
    "bun-types": "latest",
    "mocha": "^11.0.0",
    "typescript": "^5.5.0",
    "vitest": "^3.1.0",
    "c8": "^10.0.0",
    "vscode": "*"
  },
  "engines": {
    "vscode": "^1.90.0"
  }
}
```

### 4. `tsconfig.json`

**Key addition**: `"types": ["node", "vscode"]` restricts TypeScript from using Bun-only types.

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./out",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["node", "vscode"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.spec.ts", "**/*.test.ts"]
}
```

### 5. `bunfig.toml`

```toml
[build]
# CommonJS for VS Code compatibility
target = "node"
format = "cjs"

[test]
# Use Bun's native test runner, but compatible with Vitest API
preload = []
timeout = 30000
```

### 6. `vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts", "src/**/*.test.ts"],
    exclude: ["node_modules", "dist", "out"],
    globals: true,
    environment: "node",
    testTimeout: 10_000,
    hookTimeout: 10_000,
    // Module alias: redirect 'vscode' to our shim for tests
    alias: {
      vscode: path.resolve(__dirname, "src/test/shims/vscodeShim.ts"),
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/**/*.test.ts", "src/test/**"],
    },
  },
});
```

### 7. `.vscode-test.mjs`

```javascript
import { defineConfig } from "@vscode/test-cli";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig([
  {
    label: "unit",
    files: `${__dirname}/out/test/unit/**/*.test.js`,
    // Unit tests don't need the extension host
    runnerEnvironment: "node",
  },
  {
    label: "extension",
    files: `${__dirname}/out/test/integration/suite/**/*.test.js`,
    version: "insiders", // or 'stable'
    workspaceFolder: `${__dirname}/fixtures/sample-workspace`,
    mocha: {
      ui: "tdd",
      timeout: 20_000,
      forbidOnly: !!process.env.CI,
      color: true,
    },
    launchArgs: ["--disable-extensions", "--profile-temp"],
  },
]);
```

### 8. `.vscode/settings.json` (macOS)

Ensures Bun is available in VS Code terminal tasks:

```json
{
  "terminal.integrated.automationProfile.osx": {
    "path": "/bin/zsh",
    "args": ["--login", "--interactive"]
  }
}
```

### 9. `.vscode/tasks.json` (Bun Tasks)

Reference: [pyk.sh blog on Bun + VS Code](https://pyk.sh/blog/2025-10-23-building-vscode-extension-with-bun-and-mise)

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "bun: watch",
      "type": "shell",
      "command": "bun",
      "args": ["run", "watch"],
      "isBackground": true,
      "problemMatcher": "$tsc-watch",
      "presentation": {
        "reveal": "never"
      },
      "group": {
        "kind": "build",
        "isDefault": true
      }
    },
    {
      "label": "bun: compile",
      "type": "shell",
      "command": "bun",
      "args": ["run", "build"],
      "problemMatcher": "$tsc",
      "group": "build"
    }
  ]
}
```

### 10. `.vscode/launch.json` (Debug Configs)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "outFiles": ["${workspaceFolder}/out/**/*.js"],
      "preLaunchTask": "${defaultBuildTask}"
    },
    {
      "name": "Extension Tests",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "--extensionTestsPath=${workspaceFolder}/out/test/integration"
      ],
      "outFiles": ["${workspaceFolder}/out/**/*.js"],
      "preLaunchTask": "${defaultBuildTask}"
    }
  ]
}
```

**Usage**: Press `F5` to launch the extension with hot-reload.

---

## Simple Path: Typical Registries

For extensions with ~1000 commands or fewer.

### Services Summary

| Service                | Fixes               | Key Behavior                                                |
| ---------------------- | ------------------- | ----------------------------------------------------------- |
| **ContextService**     | IPC rounds          | Batch + dedupe `setContext`, flush on 10ms schedule         |
| **ConfigService**      | Config reads        | Cache snapshot, invalidate on `onDidChangeConfiguration`    |
| **RegistryService**    | O(n) render + index | Precompute tokenized metadata once at load                  |
| **SearchService**      | Tree rebuild        | Stream with `flatMapLatest` for cancellation, debounce 30ms |
| **CommandService**     | Serial commands     | Semaphore(4), `hideQuickPick` as daemon                     |
| **RenderModelService** | Render memoization  | Memoize by `(registryVersion, query)`, cap at 50 items      |
| **DispatchQueue**      | Dispatch lock       | Effect Queue + worker fiber, batch + reduce                 |

### Expected Performance

- Query latency: **30–80ms** (including debounce)
- Render latency: **<16ms** for 200 items
- Context flush: **~10–20ms** (batched, deduped)
- Memory overhead: ~5–10MB

### When to Use

- Extension has < 1000 commands
- No need for sub-10ms search latency
- Simple registry model (no fuzzy matching required)

---

## Advanced Path: 50k+ Commands

For large registries requiring sub-10ms search latency and efficient rendering of thousands.

### Additional Components

1. **Inverted Index (token → posting lists)**

   - Compact `Uint32Array` of document IDs
   - IDF-based scoring
   - Incremental top-K heap selection (no sort all)
   - Prefix expansion capped at 64 tokens

2. **Worker Thread for Index Building**

   - Node `worker_threads` backend
   - RPC protocol (Build, Search, Dispose)
   - Keeps index hot in worker (zero transfer)

3. **Pagination in UI**
   - QuickPick: first 200 items, stream next chunks
   - TreeView: virtualization with "Load more" sentinel
   - Cancellation on each keystroke

### Expected Performance

- Query tokenization: ~0.05–0.2ms
- Postings fetch + scoring: **<10ms** (typical interactive queries)
- Worker RPC overhead: ~0.2–2ms
- UI render: <16ms for 200 items
- Total E2E: **<15ms** (excluding debounce)

### When to Use

- > 5000 commands
- Need <10ms search latency guarantee
- Can tolerate worker thread complexity

---

## Implementation Plan & Tasks

### Phase 1: Foundation (Days 1–2)

**Goal**: Get basic Effect layer infrastructure working, unit tested.

#### Task 1.1: Project Setup

- [ ] Initialize Bun project, install dependencies
- [ ] Configure `tsconfig.json`, `vitest.config.ts`, `.vscode-test.mjs`
- [ ] Create directory structure
- [ ] Verify `bun build` works: `bun build src/extension.ts --outdir out --target=node`

**Time**: ~30m

#### Task 1.2: VscodeEffect Utility + ConfigService

- [ ] Implement `src/services/VscodeEffect.ts` (error handling wrappers)
- [ ] Implement `src/services/ConfigService.ts` (caching + invalidation)
- [ ] Write tests: `src/test/unit/configService.spec.ts`
- [ ] Verify: `bun run test:unit`

**Time**: ~1h

#### Task 1.3: ContextService (Batching)

- [ ] Implement `src/services/ContextService.ts` (batch + coalesce)
- [ ] Write tests with `TestClock.adjust()` to verify debounce logic
- [ ] Verify: `bun run test:unit`

**Time**: ~1.5h

#### Task 1.4: RegistryService (Simple)

- [ ] Implement `src/services/RegistryService.ts` (precompute index)
- [ ] Write tests for tokenization + snapshot building
- [ ] Verify: `bun run test:unit`

**Time**: ~1h

#### Task 1.5: Search + Render Services

- [ ] Implement `src/services/SearchService.ts` (Stream + scoring)
- [ ] Implement `src/services/RenderModelService.ts` (memoization)
- [ ] Write unit tests
- [ ] Verify: `bun run test:unit`

**Time**: ~2h

**End of Phase 1**: All services compiling, unit tests passing. ~6 hours.

---

### Phase 2: Integration (Days 2–3)

**Goal**: Wire services together, test in extension host, basic UI working.

#### Task 2.1: CommandService + DispatchQueue

- [ ] Implement `src/services/CommandService.ts` (Semaphore)
- [ ] Implement `src/services/DispatchQueue.ts` (Queue worker)
- [ ] Write unit tests
- [ ] Verify: `bun run test:unit`

**Time**: ~1.5h

#### Task 2.2: MainLayer Composition

- [ ] Create `src/layers/MainLayer.ts` (Layer.mergeAll)
- [ ] Create `src/extension.ts` (activate/deactivate with Effect)
- [ ] Verify: `bun run compile` succeeds

**Time**: ~45m

#### Task 2.3: Basic UI Integration (QuickPick)

- [ ] Create `src/ui/whichKeyMenu.ts` (Effect-based QuickPick controller)
- [ ] Wire SearchService → RenderModelService → QuickPick items
- [ ] Wire DispatchQueue for state updates
- [ ] Verify: manual testing in VS Code

**Time**: ~2h

#### Task 2.4: Integration Tests

- [ ] Set up Mocha test suite in `src/test/integration/suite/`
- [ ] Write basic extension activation test
- [ ] Write command execution test (CommandService)
- [ ] Verify: `bun run test:extension`

**Time**: ~1h

**End of Phase 2**: Extension loads, UI works, integration tests pass. ~5 hours.

---

### Phase 3: Optimization (Days 3–4)

**Goal**: Profile, optimize hot paths, hit performance targets.

#### Task 3.1: Performance Profiling

- [ ] Add instrumentation: `Effect.withSpan()`, timers for each service
- [ ] Profile in VS Code DevTools
- [ ] Identify bottlenecks (expected: IPC, render, search)
- [ ] Document baseline metrics

**Time**: ~1h

#### Task 3.2: Hot-Path Optimization

- [ ] Tune debounce times (Config, Search, Context flush)
- [ ] Verify IPC batching reduces calls per keystroke
- [ ] Cache config reads
- [ ] Verify render memoization avoids O(n) recalculations

**Time**: ~1.5h

#### Task 3.3: Coverage & Edge Cases

- [ ] Achieve >80% unit test coverage
- [ ] Add integration tests for error paths
- [ ] Test cancellation (search interrupted by new keystroke)
- [ ] Test resource cleanup (layers finalized on deactivate)

**Time**: ~1h

**End of Phase 3**: Performance targets hit, >80% coverage. ~3.5 hours.

---

### Phase 4: Advanced Path (Optional, Days 4–5)

**Goal**: Support 50k+ commands with sub-10ms latency.

#### Task 4.1: Inverted Index + Worker

- [ ] Implement `src/services/RegistryServiceAdvanced.ts`
- [ ] Build token postings, implement IDF scoring
- [ ] Implement `src/worker/indexWorker.ts` (Node worker_threads)
- [ ] Write unit tests (mock worker, test scoring)

**Time**: ~3h

#### Task 4.2: Worker RPC Integration

- [ ] Implement `IndexWorkerRunnerLive` layer (Effect service wrapping worker)
- [ ] Update `SearchService` to delegate to worker
- [ ] Write integration tests (worker lifecycle, RPC messages)
- [ ] Verify: `bun run test:extension` with 50k commands

**Time**: ~2h

#### Task 4.3: UI Pagination

- [ ] Update `RenderModelService` to support paging
- [ ] Modify `whichKeyMenu.ts` for incremental rendering
- [ ] Add "Load more" handling
- [ ] Test with large result sets

**Time**: ~1.5h

#### Task 4.4: Advanced Performance Testing

- [ ] Benchmark search latency @ 50k commands
- [ ] Verify sub-10ms p50, <20ms p95
- [ ] Test cancellation under load
- [ ] Document scaling characteristics

**Time**: ~1h

**End of Phase 4**: Advanced path fully working, all performance targets hit. ~7.5 hours.

---

### Phase 5: Polish & Deploy (Days 5–6)

**Goal**: Documentation, CI/CD, publish.

#### Task 5.1: Documentation

- [ ] Write service API docs (JSDoc comments)
- [ ] Update this ARCHITECTURE.md with final details
- [ ] Create CONTRIBUTING.md
- [ ] Add inline code comments for tricky sections

**Time**: ~1h

#### Task 5.2: CI/CD Setup

- [ ] Create `.github/workflows/ci.yml` (unit + integration tests, coverage)
- [ ] Add `xvfb-run -a` for Linux
- [ ] Set up codecov upload
- [ ] Verify on Linux, macOS, Windows

**Time**: ~1h

#### Task 5.3: Package & Publish

- [ ] Bundle extension with `bun build`
- [ ] Create `.vscodeignore`
- [ ] Generate CHANGELOG.md
- [ ] Publish to VS Code Marketplace

**Time**: ~1h

**End of Phase 5**: Ready for production. ~3 hours.

---

## Code Examples

### Full Example: ContextService

See the oracle section above for the complete, copy-pasteable implementation. Key points:

```typescript
// Deferred flush on 10ms schedule (not per-keystroke)
const FlushSchedule = Schedule.debounce(Duration.millis(10));

// Only send IPC for changed values
for (const [k, v] of pending.entries()) {
  if (!current.has(k) || current.get(k) !== v) {
    toApply.push([k, v]);
  }
}

// Parallelize IPC safely (8 concurrent calls)
yield *
  Effect.forEach(toApply, ([k, v]) => execSetContext(k, v), { concurrency: 8 });
```

**Result**: From 5 IPC calls per keystroke → 1 call every ~10ms, deduped.

### Full Example: SearchService with Stream.flatMapLatest

```typescript
// Stream.flatMapLatest automatically cancels previous search
const results = Stream.fromSubscriptionRef(queryRef).pipe(
  Stream.debounce(Duration.millis(30)),
  Stream.distinctUntilChanged,
  Stream.flatMapLatest((q) => run(q)), // ← cancels old search on new query
);
```

**Result**: User types fast → new keystroke kills old search fiber → responsive UI.

### Full Example: CommandService with Semaphore

```typescript
const sem = yield * Semaphore.make(4); // max 4 concurrent commands

const run: CommandService["run"] = (command, ...args) =>
  Semaphore.withPermits(sem, 1)(exec(command, args));
// ↑ acquire 1 permit, execute, release permit
```

**Result**: Commands run in parallel (bounded), no starvation.

### Full Example: Inverted Index Search (Advanced)

```typescript
// Tokenize query → fetch postings → incremental scoring → top-K
const hits = searchIndex(index, "go to definition", 500);

// Expected: <10ms for 50k commands
// - tokenization: 0.05ms
// - postings merge: 2–5ms (depending on df)
// - top-K heap: 1–3ms
```

---

## Testing Strategy

### Unit Tests (Vitest, no extension host)

**Location**: `src/test/unit/**/*.spec.ts`

**Run with**: `bun run test:unit`

**What to test**:

- Service business logic (ConfigService caching, ContextService batching, scoring)
- Error handling + recovery
- Memoization correctness
- Effect composition (Stream cancellation, Semaphore permits, etc.)

**Example**:

```typescript
import { describe, it, expect } from "vitest";
import { Effect, TestClock, Duration } from "effect";
import { it as effectIt } from "@effect/vitest";

describe("ContextService", () => {
  effectIt("batches setContext on 10ms schedule", () =>
    Effect.gen(function* () {
      const ctx = yield* ContextService;

      // Three rapid sets
      yield* ctx.set("a", 1);
      yield* ctx.set("b", 2);
      yield* ctx.set("a", 3);

      // Jump time forward
      yield* TestClock.adjust(Duration.millis(10));

      // Should have made 2 IPC calls (a and b), deduped to final values
      // Verify via mock or inspection of state
      expect(true).toBe(true);
    }),
  );
});
```

### Snapshot Tests (Vitest)

**Location**: `src/test/unit/**/*.spec.ts`

**What to snapshot**:

- Rendered output (QuickPickItem labels, descriptions)
- Serialized diagnostic formats
- Search result ranking

**Example**:

```typescript
it("renders completion item", () => {
  const item = formatCompletionItem({ label: "myFunc", kind: "function" });
  expect(item).toMatchSnapshot();
});
```

Update with: `bun run test:unit -- --update-snapshots`

### Property-Based Tests (Effect + fast-check)

**Location**: `src/test/unit/**/*.spec.ts`

**What to test**:

- Invariants (e.g., scored items always ranked correctly)
- Tokenization (split on any whitespace)
- Index rebuilds (idempotent, consistent)

**Example**:

```typescript
import { describe, it } from "@effect/vitest";
import { Schema } from "effect";
import { fc } from "fast-check";

describe("SearchService", () => {
  it.effect.prop("scores items consistently", [Schema.String], ([query]) =>
    Effect.gen(function* () {
      const search = yield* SearchService;
      const hits1 = yield* search.run(query);
      const hits2 = yield* search.run(query);

      // Same query always produces same ranking
      expect(hits1.map((h) => h.id)).toEqual(hits2.map((h) => h.id));
      return true;
    }),
  );
});
```

### Integration Tests (Mocha inside extension host)

**Location**: `src/test/integration/suite/**/*.test.ts`

**Run with**: `bun run test:extension`

**What to test**:

- Extension activation + deactivation
- Full service lifecycle
- VS Code API integration (real workspace, commands)
- E2E user flows

**Example**:

```typescript
suite("Extension Integration", () => {
  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension("publisher.extension-id");
    await ext?.activate();
  });

  test("command executes successfully", async () => {
    await vscode.commands.executeCommand("myExt.whichKey");
    // Assert side effects
  });

  test("search returns results within 100ms", async () => {
    const start = Date.now();
    const items = await vscode.commands.executeCommand("myExt.search", "test");
    const elapsed = Date.now() - start;

    assert.ok(items.length > 0);
    assert.ok(elapsed < 100);
  });
});
```

### Performance Tests

**Location**: `src/test/unit/performance.spec.ts` (Vitest benches)

**Run with**: `bun run test:unit` (Vitest includes bench output)

**Example**:

```typescript
import { bench, describe } from "vitest";

describe("Performance", () => {
  bench(
    "searchIndex on 50k commands",
    () => {
      searchIndex(index, "go definition", 500);
    },
    { warmupIterations: 3, iterations: 100 },
  );
});
```

**Expected output**:

```
searchIndex on 50k commands  2.35ms ±0.15ms
```

### CI/CD Pipeline

**File**: `.github/workflows/ci.yml`

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-22.04, windows-2022, macos-14]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22.x"

      - name: Install Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Unit tests
        run: bun run test:unit:coverage

      - name: Extension tests (Linux)
        if: runner.os == 'Linux'
        run: xvfb-run -a bun run test:extension

      - name: Extension tests (macOS/Windows)
        if: runner.os != 'Linux'
        run: bun run test:extension

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
```

---

## Performance Targets

### Simple Path

| Metric             | Target | Typical   | Notes                     |
| ------------------ | ------ | --------- | ------------------------- |
| Search latency     | <150ms | 30–80ms   | includes 30ms debounce    |
| Keystroke latency  | <16ms  | 5–10ms    | time from key to render   |
| Config read        | <1ms   | 0.1–0.5ms | cached, single lookup     |
| Context batch      | <50ms  | 10–20ms   | flushed once per debounce |
| Render (200 items) | <16ms  | 2–5ms     | memoized                  |
| Memory             | <50MB  | 10–15MB   | services + cache          |

### Advanced Path

| Metric                        | Target | Typical  | Notes                  |
| ----------------------------- | ------ | -------- | ---------------------- |
| Search latency (50k commands) | <100ms | 15–40ms  | includes 30ms debounce |
| Query scoring                 | <10ms  | 2–8ms    | postings + IDF         |
| Worker RPC                    | <5ms   | 0.2–2ms  | depends on payload     |
| Keystroke latency             | <16ms  | 5–12ms   | from key to render     |
| Index build (50k commands)    | <5s    | 1–3s     | one-time, in worker    |
| Memory (extension host)       | <100MB | 20–30MB  | index kept in worker   |
| Memory (worker)               | <200MB | 50–100MB | compact postings       |

### Verification

Run with instrumentation enabled:

```bash
# Profile a single search (will show timings)
bun run test:unit -- --reporter=verbose

# Measure keystroke latency in real extension
# Open VS Code DevTools (F1 → Developer: Open DevTools)
# Type in search, watch Console for "[SearchService] Query took XXms"
```

---

## Deployment & CI/CD

### Building the Extension

```bash
# Compile with Bun
bun run compile

# Or watch mode
bun run watch

# Verify output
ls -la out/
# → extension.js, extension.js.map
```

### Testing Before Deploy

```bash
# Full test suite (unit + integration, coverage)
bun run test
# or separately:
bun run test:unit:coverage && bun run test:extension:coverage
```

### Packaging for VS Code Marketplace

1. **Prepare `package.json`**:

   ```json
   {
     "name": "my-vscode-extension",
     "displayName": "My VS Code Extension",
     "description": "High-performance extension built with Effect-TS",
     "version": "1.0.0",
     "publisher": "myorg",
     "engines": { "vscode": "^1.90.0" },
     "main": "./out/extension.js"
   }
   ```

2. **Create `.vscodeignore`**:

   ```
   .vscode/
   .github/
   src/
   **/*.spec.ts
   **/*.test.ts
   vitest.config.ts
   .vscode-test.mjs
   fixtures/
   coverage/
   .git
   .gitignore
   bunfig.toml
   ```

3. **Create `CHANGELOG.md`**:

   ```markdown
   # Changelog

   ## [1.0.0] - 2026-01-XX

   ### Added

   - Initial release
   - Effect-TS layered services
   - Batched IPC + memoized rendering
   - Support for up to 50k commands

   ### Fixed

   - Resolved which-key performance issues
   ```

4. **Install VSCE and publish**:

   ```bash
   npm install -g @vscode/vsce
   vsce package
   # → my-vscode-extension-1.0.0.vsix

   vsce publish --pat <your-pat>
   ```

### GitHub Actions Workflow

See CI/CD section above for full workflow. Key points:

- Run `bun run test:unit` (fast, always)
- Run `xvfb-run -a bun run test:extension` on Linux (needs virtual display)
- Upload coverage to codecov
- Prevent merges if tests fail

---

## Troubleshooting

### Build Issues

**"Cannot find module 'vscode'"**
→ Add `--external=vscode` to bun build command (already done in scripts)

**"@effect/vitest not found in unit tests"**
→ Ensure `vitest.config.ts` alias is set correctly

### Test Issues

**"vscode module is not mocked"**
→ Verify `vscode` alias in `vitest.config.ts` points to `src/test/shims/vscodeShim.ts`

**"Mocha test timeout"**
→ Increase `timeout` in `.vscode-test.mjs` (especially for integration tests)

**"xvfb-run: command not found"**
→ On Linux, install with: `sudo apt-get install xvfb`

### Performance Issues

**"Search is slow"**
→ Check if using simple path with >5k commands → consider advanced path

**"IPC batching not working"**
→ Verify `ContextService.flushNow()` is awaited before state transitions

**"Memory keeps growing"**
→ Check cache bounds in `RenderModelService` (cap at 50 items)

---

## Resources

- [Effect-TS Documentation](https://effect.website/docs)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [@vscode/test-cli](https://github.com/microsoft/vscode-test-cli)
- [Bun Documentation](https://bun.sh/docs)
- [Vitest Documentation](https://vitest.dev)
- [which-key Performance Analysis](./LIBRARIAN_FINDINGS.md) (reference)

---

## License

MIT

---

**Last updated**: 2026-02-24
**Status**: Ready for implementation
**Recommended start**: Phase 1, Task 1.1
