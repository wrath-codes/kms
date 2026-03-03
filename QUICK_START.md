# Quick Start: 5-Minute Setup

Get the extension building and testing in **under 5 minutes**.

---

## Prerequisites

- **Node.js 22+** or **Bun 1.3+** (recommended)
- **VS Code 1.90+**
- **Git**

---

## Step 1: Clone & Install (1 min)

```bash
# Clone or init your project
git clone <your-repo>
cd my-vscode-extension

# Install dependencies with Bun (or npm ci)
bun install
```

---

## Step 2: Build (30 sec)

```bash
bun run compile
# Output: out/extension.js
```

Verify: `ls -la out/extension.js`

---

## Step 3: Run Tests (1 min)

```bash
# Unit tests (Vitest, fast)
bun run test:unit

# Integration tests (Extension host, slower)
bun run test:extension
```

Both should pass.

---

## Step 4: Launch in VS Code (2 min)

1. Press `F5` (or Debug → Start Debugging)
2. A new VS Code window opens with your extension loaded
3. Open Command Palette (`Cmd+Shift+P`) and run any command from your extension
4. Set breakpoints, inspect state, reload with `Cmd+R`

---

## What You Have

✅ All 7 Effect-TS services  
✅ Unit tests with `@effect/vitest`  
✅ Integration tests with Mocha  
✅ Debugging configured  
✅ CI/CD ready  

---

## Next Steps

1. **Read**: [ARCHITECTURE.md](./ARCHITECTURE.md) for full design
2. **Implement**: Follow Phase 1 tasks in [ARCHITECTURE.md](./ARCHITECTURE.md#implementation-plan--tasks)
3. **Reference**: Use [API_REFERENCE.md](./API_REFERENCE.md) during coding
4. **Debug**: Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) if stuck
5. **Deploy**: Follow [DEPLOYMENT.md](./DEPLOYMENT.md) when ready

---

## Common Commands

```bash
bun run compile          # Build extension
bun run watch            # Watch & rebuild on changes
bun run test:unit        # Fast unit tests
bun run test:extension   # Full integration tests
bun run test             # Both unit + integration
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/extension.ts` | Entry point (activate/deactivate) |
| `src/services/` | Effect-TS service implementations |
| `src/test/shims/vscodeShim.ts` | Mock vscode module for tests |
| `.vscode-test.mjs` | Test runner config |
| `vitest.config.ts` | Unit test config |

---

## Stuck?

- **"Cannot find module 'vscode'"** → Run `bun run compile`
- **"Tests failing"** → Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **"How do I...?"** → See [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)

---

**Happy coding!** 🚀
