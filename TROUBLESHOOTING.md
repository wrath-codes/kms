# Troubleshooting

Common issues and solutions.

---

## Build Issues

### "Cannot find module 'vscode'"

**Symptom**: `bun run compile` fails with "Cannot find module 'vscode'"

**Cause**: `vscode` module is external and should not be bundled.

**Fix**:
```bash
# Ensure build command includes --external=vscode
bun build src/extension.ts --outdir out --external=vscode

# Or check package.json script:
"compile": "bun build src/extension.ts --outdir out --target=node --format=cjs --external=vscode --sourcemap=linked"
```

---

### "Module not found: effect"

**Symptom**: `bun run compile` fails with "Module not found: effect"

**Cause**: Effect-TS not installed.

**Fix**:
```bash
bun add effect @effect/platform
```

---

### "TypeScript compilation errors"

**Symptom**: `bun run compile` or IDE shows red squiggles

**Cause**: Type errors in source code.

**Fix**:
```bash
# Check errors
bunx tsc --noEmit

# Fix specific error
# Go to file, hover over error, use VS Code quick fix (Cmd+.)

# Or regenerate types
bun add -d typescript
bunx tsc --init
```

---

## Test Issues

### "Module alias not working in tests"

**Symptom**: Tests fail with "Cannot find module 'vscode'"

**Cause**: `vitest.config.ts` alias not set correctly.

**Fix**:
```typescript
// vitest.config.ts
import path from 'path'

export default defineConfig({
  test: {
    alias: {
      'vscode': path.resolve(__dirname, 'src/test/shims/vscodeShim.ts'),
    }
  }
})
```

---

### "Tests hang or timeout"

**Symptom**: Test hangs indefinitely or times out after 10 seconds.

**Cause**: Effect waiting on a resource that never completes (e.g., infinite stream, blocked Ref).

**Fix**:

1. **Check for infinite loops**:
   ```typescript
   // BAD: infinite loop
   while (true) {
     yield* someEffect
   }

   // GOOD: use Stream or proper termination
   yield* Stream.repeat(someEffect).pipe(Stream.take(10))
   ```

2. **Increase timeout**:
   ```typescript
   it("slow test", async () => {
     // ...
   }, 15000)  // 15 second timeout
   ```

3. **Use TestClock**:
   ```typescript
   // Instead of real delays
   yield* Effect.sleep(Duration.seconds(10))  // actual 10 sec wait

   // Use fake time
   yield* TestClock.adjust(Duration.seconds(10))  // instant
   ```

4. **Debug with console logs**:
   ```typescript
   it("debug test", async () => {
     console.log("Test starting")
     const result = yield* someEffect
     console.log("Test completed:", result)
     expect(result).toEqual(expected)
   })
   ```

---

### "Snapshot mismatch"

**Symptom**: `expect(...).toMatchSnapshot()` fails

**Cause**: Code changed, snapshot is outdated.

**Fix**:
```bash
# Review the diff, then update:
bun test src/test/unit --update-snapshots

# Or in Vitest watch mode, press 'u' to update
```

---

### "Tests pass locally but fail in CI"

**Symptom**: Tests fail on GitHub Actions / CI but pass on local machine.

**Cause**: Environment differences (timing, OS, Node version, randomness).

**Fix**:

1. **Use deterministic ordering**:
   ```typescript
   it.each([1, 2, 3])("deterministic test", (n) => {
     expect(n).toBeLessThanOrEqual(3)
   })
   ```

2. **Mock randomness**:
   ```typescript
   import { Random } from "effect"

   it.effect("reproducible random", () =>
     Effect.gen(function* () {
       const rand = yield* Random.next  // uses seeded RNG in tests
       expect(rand).toBeDefined()
     })
   )
   ```

3. **Use TestClock for timing**:
   ```typescript
   // DON'T: real setTimeout
   await new Promise(r => setTimeout(r, 1000))

   // DO: TestClock
   yield* TestClock.adjust(Duration.seconds(1))
   ```

4. **Increase timeout in CI**:
   ```javascript
   // .vscode-test.mjs
   mocha: {
     timeout: 20_000,  // 20 seconds for CI
   }
   ```

---

## VS Code Extension Issues

### "Extension doesn't activate"

**Symptom**: Extension appears in Extensions list but commands don't work.

**Cause**: Activation event not triggered or activation code failed.

**Fix**:

1. **Check activation events** in `package.json`:
   ```json
   "activationEvents": [
     "onCommand:myext.myCommand",
     "onStartupFinished"
   ]
   ```

2. **Check output channel**:
   - Press `F1` → "Output"
   - Select your extension's output channel
   - Look for errors

3. **Check launch.json**:
   ```json
   {
     "type": "extensionHost",
     "request": "launch",
     "args": ["--extensionDevelopmentPath=${workspaceFolder}"]
   }
   ```

---

### "Command doesn't execute"

**Symptom**: Command runs but nothing happens.

**Cause**: Handler not registered or command ID mismatch.

**Fix**:

1. **Verify command ID** matches in `package.json` and registration:
   ```json
   "commands": [
     {
       "command": "myext.goToDefinition",
       "title": "Go to Definition"
     }
   ]
   ```

   ```typescript
   context.subscriptions.push(
     vscode.commands.registerCommand("myext.goToDefinition", () => {
       // handler
     })
   )
   ```

2. **Check handler is called**:
   ```typescript
   vscode.commands.registerCommand("myext.test", () => {
     console.log("Handler called")  // check output
     return Effect.runPromise(testEffect)
   })
   ```

3. **Verify "when" clause** (if specified):
   ```json
   {
     "command": "myext.edit",
     "when": "editorFocus"  // only available when editor has focus
   }
   ```

---

### "Menu items don't appear"

**Symptom**: Command palette shows command but menus don't have the item.

**Cause**: Menu configuration missing in `package.json`.

**Fix**:

1. **Add to menus**:
   ```json
   "menus": {
     "commandPalette": [
       {
         "command": "myext.test",
         "when": "true"
       }
     ],
     "editor/context": [
       {
         "command": "myext.test",
         "when": "editorFocus"
       }
     ]
   }
   ```

2. **Reload extension** (`Cmd+R` in test window) and check again.

---

### "Settings not saved"

**Symptom**: Configuration changes don't persist.

**Cause**: Settings written to wrong scope (workspace vs. user).

**Fix**:

1. **Write to user settings**:
   ```typescript
   const cfg = vscode.workspace.getConfiguration("myext")
   await cfg.update("delay", 100, vscode.ConfigurationTarget.Global)
   ```

2. **Or workspace settings**:
   ```typescript
   await cfg.update("delay", 100, vscode.ConfigurationTarget.Workspace)
   ```

3. **Verify in settings**:
   - `Cmd+,` (Settings)
   - Search for your setting
   - Check User vs. Workspace tabs

---

## Performance Issues

### "Extension is slow"

**Symptom**: Typing, command execution, or search is sluggish.

**Cause**: One or more bottlenecks from [LIBRARIAN_FINDINGS.md](./LIBRARIAN_FINDINGS.md).

**Fix**:

1. **Profile with DevTools**:
   - F12 → Performance tab
   - Record 5 seconds of activity
   - Check timeline for slow operations

2. **Check ContextService batching**:
   ```typescript
   // Should batch multiple setContext calls
   yield* ctx.setMany({ a: 1, b: 2, c: 3 })
   // Not: yield* ctx.set("a", 1); yield* ctx.set("b", 2); ...
   ```

3. **Verify ConfigService caching**:
   ```typescript
   // Should be instant on second call
   const val1 = yield* cfg.get("myext", "key", default)
   const val2 = yield* cfg.get("myext", "key", default)  // cached
   ```

4. **Check SearchService debouncing**:
   - Query should debounce 30ms before search starts
   - Previous search should cancel on new keystroke

5. **Verify render memoization**:
   - Same query should return cached model
   - No re-computation unless registry version changed

---

### "IPC calls are slow"

**Symptom**: Profile shows many IPC round-trips.

**Cause**: Batching not working, or calling setContext too frequently.

**Fix**:

1. **Enable IPC batching**:
   ```typescript
   // Check ContextService is batching
   yield* ctx.flushNow  // should only happen once per debounce window
   ```

2. **Reduce setContext calls**:
   ```typescript
   // BAD: 5 separate calls
   yield* ctx.set("a", 1)
   yield* ctx.set("b", 2)
   yield* ctx.set("c", 3)

   // GOOD: 1 batch call
   yield* ctx.setMany({ a: 1, b: 2, c: 3 })
   ```

3. **Profile IPC volume**:
   - DevTools → Network tab
   - Filter by "executeCommand"
   - Should see <1 call per 10ms

---

### "Memory usage is high"

**Symptom**: Extension uses >100MB RAM.

**Cause**: Unbounded cache or large index in memory.

**Fix**:

1. **Cap RenderModelService cache**:
   ```typescript
   // In RenderModelService, evict oldest when cache > 50:
   if (cache.size > 50) {
     const oldest = cache.keys().next().value
     cache.delete(oldest)
   }
   ```

2. **Check for memory leaks**:
   - Chrome DevTools → Memory tab
   - Heap snapshot
   - Look for objects not being garbage collected

3. **Use weak references for caches** (advanced):
   ```typescript
   const cache = new WeakMap<Command, RenderRow>()
   // Automatically garbage collected when command is no longer referenced
   ```

---

## Deployment Issues

### "VSIX file is too large"

**Symptom**: Published extension is >10MB.

**Cause**: Unnecessary files bundled.

**Fix**:

1. **Update `.vscodeignore`**:
   ```
   # Exclude unnecessary files
   src/
   test/
   *.spec.ts
   *.test.ts
   node_modules/
   coverage/
   .git/
   .vscode/
   bunfig.toml
   vitest.config.ts
   ```

2. **Minify build**:
   ```bash
   bun build src/extension.ts --outdir out --minify
   ```

3. **Check size**:
   ```bash
   ls -lh out/extension.js
   ```

---

### "Extension fails to activate in Marketplace"

**Symptom**: Extension works locally but not after publishing.

**Cause**: Missing dependencies, wrong bundle format, or missing entry point.

**Fix**:

1. **Verify `main` in `package.json`**:
   ```json
   {
     "main": "./out/extension.js"
   }
   ```

2. **Verify bundle is CJS (not ESM)**:
   ```bash
   head out/extension.js
   # Should show CommonJS require() calls, not import
   ```

3. **Check all dependencies are shipped**:
   ```bash
   # List dependencies
   npm ls --prod
   
   # Should be empty or only vscode, effect
   ```

---

## CI/CD Issues

### "Tests fail on Linux with 'command not found: xvfb-run'"

**Symptom**: GitHub Actions fails on Linux with xvfb-run error.

**Cause**: xvfb-run not installed in CI environment.

**Fix**:

1. **Install in CI**:
   ```yaml
   # .github/workflows/ci.yml
   - name: Install dependencies
     if: runner.os == 'Linux'
     run: sudo apt-get install -y xvfb

   - name: Run tests
     if: runner.os == 'Linux'
     run: xvfb-run -a bun run test:extension
   ```

2. **Or use headless mode**:
   ```javascript
   // .vscode-test.mjs
   launchArgs: [
     '--disable-gpu',
     '--disable-rendering',
   ]
   ```

---

### "Tests timeout in CI"

**Symptom**: Tests pass locally but timeout on GitHub Actions.

**Cause**: CI runner is slower, tests need more time.

**Fix**:

1. **Increase timeout**:
   ```javascript
   // .vscode-test.mjs
   mocha: {
     timeout: 30_000,  // 30 seconds for CI
   }
   ```

2. **Or increase per-test**:
   ```typescript
   test("slow test", async () => {
     // ...
   }, 15000)
   ```

3. **Or split tests**:
   ```bash
   # Run unit and integration separately
   bun run test:unit
   bun run test:extension
   ```

---

### "Coverage upload fails"

**Symptom**: Codecov action fails or coverage not uploaded.

**Cause**: Coverage file not generated or wrong path.

**Fix**:

1. **Generate coverage**:
   ```bash
   bun run test:unit:coverage
   ls coverage/lcov.info  # should exist
   ```

2. **Fix upload action**:
   ```yaml
   - name: Upload coverage
     uses: codecov/codecov-action@v4
     with:
       files: ./coverage/lcov.info
       flags: unittests
   ```

---

## Getting Help

If you're stuck:

1. **Check documentation**:
   - [QUICK_START.md](./QUICK_START.md) — 5-minute setup
   - [ARCHITECTURE.md](./ARCHITECTURE.md) — full design
   - [API_REFERENCE.md](./API_REFERENCE.md) — service APIs
   - [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) — daily commands

2. **Check source code**:
   - Look at service implementations in `src/services/`
   - Check tests in `src/test/unit/` for usage examples
   - Check integration tests in `src/test/integration/suite/` for E2E examples

3. **Search issues**:
   - GitHub Issues
   - VS Code GitHub Issues (for platform bugs)

4. **Ask for help**:
   - Open a GitHub Issue with:
     - Error message
     - Steps to reproduce
     - Environment (OS, VS Code version, Node/Bun version)
     - Relevant logs (from Output channel)

---

**Last updated**: 2026-02-24
