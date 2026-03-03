# Documentation Index

Complete navigation guide for all documentation. Links to every section and subsection.

---

## Quick Navigation

**Start here**:
1. [QUICK_START.md](#quick_startmd) — 5-minute setup
2. [ARCHITECTURE.md](#architecturemd) — Full design blueprint
3. [DEVELOPMENT_WORKFLOW.md](#development_workflowmd) — Daily commands

**During development**:
- [API_REFERENCE.md](#api_referencemd) — Service APIs
- [EXAMPLES.md](#examplesmd) — Code patterns
- [DEVELOPMENT_WORKFLOW.md](#development_workflowmd) — Debugging tips

**When stuck**:
- [TROUBLESHOOTING.md](#troubleshootingmd) — Common issues
- [GLOSSARY.md](#glossarymd) — Terminology

**When deploying**:
- [DEPLOYMENT.md](#deploymentmd) — Packaging & publishing

**Understanding performance**:
- [LIBRARIAN_FINDINGS.md](#librarian_findingsmd) — Why which-key is slow

---

## QUICK_START.md

Fast 5-minute setup guide.

- [Prerequisites](./QUICK_START.md#prerequisites)
- [Step 1: Clone & Install (1 min)](./QUICK_START.md#step-1-clone--install-1-min)
- [Step 2: Build (30 sec)](./QUICK_START.md#step-2-build-30-sec)
- [Step 3: Run Tests (1 min)](./QUICK_START.md#step-3-run-tests-1-min)
- [Step 4: Launch in VS Code (2 min)](./QUICK_START.md#step-4-launch-in-vs-code-2-min)
- [What You Have](./QUICK_START.md#what-you-have)
- [Next Steps](./QUICK_START.md#next-steps)
- [Common Commands](./QUICK_START.md#common-commands)
- [Key Files](./QUICK_START.md#key-files)
- [Stuck?](./QUICK_START.md#stuck)

---

## ARCHITECTURE.md

Complete design, setup, and implementation plan (32KB).

### Main Sections

- [Table of Contents](./ARCHITECTURE.md#table-of-contents)
- [Architecture Overview](./ARCHITECTURE.md#architecture-overview)
  - [Problem Statement](./ARCHITECTURE.md#problem-statement)
  - [Solution: Effect-TS Layered Services](./ARCHITECTURE.md#solution-effect-ts-layered-services)
  - [Key Principles](./ARCHITECTURE.md#key-principles)
- [Why Effect-TS](./ARCHITECTURE.md#why-effect-ts)
  - [What Effect Gives You](./ARCHITECTURE.md#what-effect-gives-you)
  - [What You Avoid](./ARCHITECTURE.md#what-you-avoid)
- [Setup with Bun](./ARCHITECTURE.md#setup-with-bun)
  - [1. Initialize Project](./ARCHITECTURE.md#1-initialize-project)
  - [2. Project Structure](./ARCHITECTURE.md#2-project-structure)
  - [3. package.json Scripts](./ARCHITECTURE.md#3-packagejson-scripts)
  - [4. tsconfig.json](./ARCHITECTURE.md#4-tsconfigjson)
  - [5. bunfig.toml](./ARCHITECTURE.md#5-bunfigtoml)
  - [6. vitest.config.ts](./ARCHITECTURE.md#6-vitest-configts)
  - [7. .vscode-test.mjs](./ARCHITECTURE.md#7-vscode-testmjs)

### Simple Path (Typical Registries)

- [Simple Path: Typical Registries](./ARCHITECTURE.md#simple-path-typical-registries)
  - [Services Summary](./ARCHITECTURE.md#services-summary)
  - [Expected Performance](./ARCHITECTURE.md#expected-performance)
  - [When to Use](./ARCHITECTURE.md#when-to-use)

### Advanced Path (50k+ Commands)

- [Advanced Path: 50k+ Commands](./ARCHITECTURE.md#advanced-path-50k-commands)
  - [Additional Components](./ARCHITECTURE.md#additional-components)
  - [Expected Performance](./ARCHITECTURE.md#expected-performance-1)
  - [When to Use](./ARCHITECTURE.md#when-to-use-1)

### Implementation Plan

- [Implementation Plan & Tasks](./ARCHITECTURE.md#implementation-plan--tasks)

#### Phase 1: Foundation (Days 1–2)
- [Task 1.1: Project Setup](./ARCHITECTURE.md#task-11-project-setup)
- [Task 1.2: VscodeEffect Utility + ConfigService](./ARCHITECTURE.md#task-12-vscodeeffect-utility--configservice)
- [Task 1.3: ContextService (Batching)](./ARCHITECTURE.md#task-13-contextservice-batching)
- [Task 1.4: RegistryService (Simple)](./ARCHITECTURE.md#task-14-registryservice-simple)
- [Task 1.5: Search + Render Services](./ARCHITECTURE.md#task-15-search--render-services)

#### Phase 2: Integration (Days 2–3)
- [Task 2.1: CommandService + DispatchQueue](./ARCHITECTURE.md#task-21-commandservice--dispatchqueue)
- [Task 2.2: MainLayer Composition](./ARCHITECTURE.md#task-22-mainlayer-composition)
- [Task 2.3: Basic UI Integration (QuickPick)](./ARCHITECTURE.md#task-23-basic-ui-integration-quickpick)
- [Task 2.4: Integration Tests](./ARCHITECTURE.md#task-24-integration-tests)

#### Phase 3: Optimization (Days 3–4)
- [Task 3.1: Performance Profiling](./ARCHITECTURE.md#task-31-performance-profiling)
- [Task 3.2: Hot-Path Optimization](./ARCHITECTURE.md#task-32-hot-path-optimization)
- [Task 3.3: Coverage & Edge Cases](./ARCHITECTURE.md#task-33-coverage--edge-cases)

#### Phase 4: Advanced Path (Optional, Days 4–5)
- [Task 4.1: Inverted Index + Worker](./ARCHITECTURE.md#task-41-inverted-index--worker)
- [Task 4.2: Worker RPC Integration](./ARCHITECTURE.md#task-42-worker-rpc-integration)
- [Task 4.3: UI Pagination](./ARCHITECTURE.md#task-43-ui-pagination)
- [Task 4.4: Advanced Performance Testing](./ARCHITECTURE.md#task-44-advanced-performance-testing)

#### Phase 5: Polish & Deploy (Days 5–6)
- [Task 5.1: Documentation](./ARCHITECTURE.md#task-51-documentation)
- [Task 5.2: CI/CD Setup](./ARCHITECTURE.md#task-52-cicd-setup)
- [Task 5.3: Package & Publish](./ARCHITECTURE.md#task-53-package--publish)

### Code Examples & Testing

- [Code Examples](./ARCHITECTURE.md#code-examples)
  - [Full Example: ContextService](./ARCHITECTURE.md#full-example-contextservice)
  - [Full Example: SearchService with Stream.flatMapLatest](./ARCHITECTURE.md#full-example-searchservice-with-streamflatmaplatest)
  - [Full Example: CommandService with Semaphore](./ARCHITECTURE.md#full-example-commandservice-with-semaphore)
  - [Full Example: Inverted Index Search (Advanced)](./ARCHITECTURE.md#full-example-inverted-index-search-advanced)
  - [Putting it together: MainLayer](./ARCHITECTURE.md#putting-it-together-wiring-layer-for-a-vs-code-extension-production-pattern)

- [Testing Strategy](./ARCHITECTURE.md#testing-strategy)
  - [Unit Tests (Vitest)](./ARCHITECTURE.md#unit-tests-vitest-no-extension-host)
  - [Snapshot Tests](./ARCHITECTURE.md#snapshot-tests-vitest)
  - [Property-Based Tests](./ARCHITECTURE.md#property-based-tests-effect--fast-check)
  - [Integration Tests (Mocha)](./ARCHITECTURE.md#integration-tests-mocha-inside-extension-host)
  - [Performance Tests](./ARCHITECTURE.md#performance-tests)
  - [CI/CD Pipeline](./ARCHITECTURE.md#cicd-pipeline)

### Performance & Deployment

- [Performance Targets](./ARCHITECTURE.md#performance-targets)
  - [Simple Path](./ARCHITECTURE.md#simple-path)
  - [Advanced Path](./ARCHITECTURE.md#advanced-path)
  - [Verification](./ARCHITECTURE.md#verification)

- [Deployment & CI/CD](./ARCHITECTURE.md#deployment--cicd)
  - [Building the Extension](./ARCHITECTURE.md#building-the-extension)
  - [Testing Before Deploy](./ARCHITECTURE.md#testing-before-deploy)
  - [Packaging for VS Code Marketplace](./ARCHITECTURE.md#packaging-for-vs-code-marketplace)
  - [GitHub Actions Workflow](./ARCHITECTURE.md#github-actions-workflow)

- [Troubleshooting](./ARCHITECTURE.md#troubleshooting)
  - [Build Issues](./ARCHITECTURE.md#build-issues)
  - [Test Issues](./ARCHITECTURE.md#test-issues)
  - [Performance Issues](./ARCHITECTURE.md#performance-issues)

- [Resources](./ARCHITECTURE.md#resources)

---

## LIBRARIAN_FINDINGS.md

Deep-dive performance analysis of 8 bottlenecks in which-key extension (28KB).

### Overview

- [Executive Summary](./LIBRARIAN_FINDINGS.md#executive-summary)
- [Architecture Diagram](./LIBRARIAN_FINDINGS.md#architecture-diagram)

### Bottleneck Analysis

- [Bottleneck 1: `setContext` IPC Round-Trips](./LIBRARIAN_FINDINGS.md#bottleneck-1-setcontext-is-an-ipc-round-trip-on-every-keystroke)
  - [The Problem](./LIBRARIAN_FINDINGS.md#the-problem)
  - [Why It's Slow](./LIBRARIAN_FINDINGS.md#why-its-slow)
  - [Compound Effect](./LIBRARIAN_FINDINGS.md#compound-effect)
  - [The Fix](./LIBRARIAN_FINDINGS.md#the-fix)

- [Bottleneck 2: `hide()` → `onDidHide` Await Pattern](./LIBRARIAN_FINDINGS.md#bottleneck-2-hide--ondididhide-event-await-pattern)
  - [The Problem](./LIBRARIAN_FINDINGS.md#the-problem-1)
  - [Why It's Slow](./LIBRARIAN_FINDINGS.md#why-its-slow-1)
  - [Compound Effect](./LIBRARIAN_FINDINGS.md#compound-effect-1)
  - [The Fix](./LIBRARIAN_FINDINGS.md#the-fix-1)

- [Bottleneck 3: Serial Command Execution](./LIBRARIAN_FINDINGS.md#bottleneck-3-serial-executecommands-loop)
  - [The Problem](./LIBRARIAN_FINDINGS.md#the-problem-2)
  - [Why It's Slow](./LIBRARIAN_FINDINGS.md#why-its-slow-2)
  - [Compound Effect](./LIBRARIAN_FINDINGS.md#compound-effect-2)
  - [The Fix](./LIBRARIAN_FINDINGS.md#the-fix-2)

- [Bottleneck 4: Repeated Config Reads](./LIBRARIAN_FINDINGS.md#bottleneck-4-getconfig-called-on-every-show)
  - [The Problem](./LIBRARIAN_FINDINGS.md#the-problem-3)
  - [Why It's Slow](./LIBRARIAN_FINDINGS.md#why-its-slow-3)
  - [Compound Effect](./LIBRARIAN_FINDINGS.md#compound-effect-3)
  - [The Fix](./LIBRARIAN_FINDINGS.md#the-fix-3)

- [Bottleneck 5: O(n) Rendering](./LIBRARIAN_FINDINGS.md#bottleneck-5-handlerender-is-on-×-3-with-no-memoization)
  - [The Problem](./LIBRARIAN_FINDINGS.md#the-problem-4)
  - [Why It's Slow](./LIBRARIAN_FINDINGS.md#why-its-slow-4)
  - [Compound Effect](./LIBRARIAN_FINDINGS.md#compound-effect-4)
  - [The Fix](./LIBRARIAN_FINDINGS.md#the-fix-4)

- [Bottleneck 6: Tree Rebuild on Search](./LIBRARIAN_FINDINGS.md#bottleneck-6-createdescbinditems-full-tree-rebuild-on-search)
  - [The Problem](./LIBRARIAN_FINDINGS.md#the-problem-5)
  - [Why It's Slow](./LIBRARIAN_FINDINGS.md#why-its-slow-5)
  - [Compound Effect](./LIBRARIAN_FINDINGS.md#compound-effect-5)
  - [The Fix](./LIBRARIAN_FINDINGS.md#the-fix-5)

- [Bottleneck 7: DispatchQueue Lock](./LIBRARIAN_FINDINGS.md#bottleneck-7-the-dispatchqueue-serialization-lock)
  - [The Problem](./LIBRARIAN_FINDINGS.md#the-problem-6)
  - [Why It's Slow](./LIBRARIAN_FINDINGS.md#why-its-slow-6)
  - [Compound Effect](./LIBRARIAN_FINDINGS.md#compound-effect-6)
  - [The Fix](./LIBRARIAN_FINDINGS.md#the-fix-6)

- [Bottleneck 8: Linear Scan at 50k+](./LIBRARIAN_FINDINGS.md#bottleneck-8-inefficient-search-at-scale-50k-commands)
  - [The Problem](./LIBRARIAN_FINDINGS.md#the-problem-7)
  - [Why It's Slow](./LIBRARIAN_FINDINGS.md#why-its-slow-7)
  - [The Fix](./LIBRARIAN_FINDINGS.md#the-fix-7)

### Analysis & Lessons

- [Summary Table: All 8 Bottlenecks](./LIBRARIAN_FINDINGS.md#summary-table-all-8-bottlenecks)
- [Combined Effect on Real Usage](./LIBRARIAN_FINDINGS.md#combined-effect-on-real-usage)
  - [Slow Path (Today)](./LIBRARIAN_FINDINGS.md#slow-path-today)
  - [Fast Path (After Fixes)](./LIBRARIAN_FINDINGS.md#fast-path-after-all-fixes)
- [Root Cause Analysis](./LIBRARIAN_FINDINGS.md#root-cause-analysis)
  - [Why Did This Happen?](./LIBRARIAN_FINDINGS.md#why-did-this-happen)
  - [Why Effect-TS Fixes This](./LIBRARIAN_FINDINGS.md#why-effect-ts-fixes-this)
- [Lessons for Extension Developers](./LIBRARIAN_FINDINGS.md#lessons-for-extension-developers)
- [Further Reading](./LIBRARIAN_FINDINGS.md#further-reading)
- [Appendix: Profiling Commands](./LIBRARIAN_FINDINGS.md#appendix-profiling-commands)

---

## API_REFERENCE.md

Complete service interfaces and method signatures (19KB).

### Overview

- [Table of Contents](./API_REFERENCE.md#table-of-contents)

### Shared Types

- [Shared Types](./API_REFERENCE.md#shared-types)
  - [Error Types](./API_REFERENCE.md#error-types)
  - [Domain Types](./API_REFERENCE.md#domain-types)

### Services

- [ContextService](./API_REFERENCE.md#contextservice)
  - [Purpose](./API_REFERENCE.md#purpose)
  - [Interface](./API_REFERENCE.md#interface)
  - [Example](./API_REFERENCE.md#example)

- [ConfigService](./API_REFERENCE.md#configservice)
  - [Purpose](./API_REFERENCE.md#purpose-1)
  - [Interface](./API_REFERENCE.md#interface-1)
  - [Example](./API_REFERENCE.md#example-1)

- [RegistryService](./API_REFERENCE.md#registryservice)
  - [Purpose](./API_REFERENCE.md#purpose-2)
  - [Interface](./API_REFERENCE.md#interface-2)
  - [Example](./API_REFERENCE.md#example-2)

- [SearchService](./API_REFERENCE.md#searchservice)
  - [Purpose](./API_REFERENCE.md#purpose-3)
  - [Interface](./API_REFERENCE.md#interface-3)
  - [Example](./API_REFERENCE.md#example-3)

- [CommandService](./API_REFERENCE.md#commandservice)
  - [Purpose](./API_REFERENCE.md#purpose-4)
  - [Interface](./API_REFERENCE.md#interface-4)
  - [Example](./API_REFERENCE.md#example-4)

- [RenderModelService](./API_REFERENCE.md#rendermodelservice)
  - [Purpose](./API_REFERENCE.md#purpose-5)
  - [Interface](./API_REFERENCE.md#interface-5)
  - [Example](./API_REFERENCE.md#example-5)

- [DispatchQueue](./API_REFERENCE.md#dispatchqueue)
  - [Purpose](./API_REFERENCE.md#purpose-6)
  - [Interface](./API_REFERENCE.md#interface-6)
  - [Example](./API_REFERENCE.md#example-6)

### Composition

- [Layers](./API_REFERENCE.md#layers)
  - [Composition](./API_REFERENCE.md#composition)
  - [Advanced Path (50k+ commands)](./API_REFERENCE.md#advanced-path-50k-commands)
  - [Extension Activation](./API_REFERENCE.md#extension-activation)

- [Error Handling Pattern](./API_REFERENCE.md#error-handling-pattern)

---

## DEVELOPMENT_WORKFLOW.md

Daily commands, debugging, and development patterns (13KB).

### Setup & Commands

- [Development Commands](./DEVELOPMENT_WORKFLOW.md#development-commands)
  - [Watch Mode](./DEVELOPMENT_WORKFLOW.md#watch-mode-recommended-for-development)
  - [One-Shot Commands](./DEVELOPMENT_WORKFLOW.md#one-shot-commands)
  - [Build Variants](./DEVELOPMENT_WORKFLOW.md#build-variants)

### Debugging

- [Debugging](./DEVELOPMENT_WORKFLOW.md#debugging)
  - [In VS Code (Extension Host Debugging)](./DEVELOPMENT_WORKFLOW.md#in-vs-code-extension-host-debugging)
  - [VS Code DevTools](./DEVELOPMENT_WORKFLOW.md#vs-code-devtools-renderer-process)
  - [Node Inspector](./DEVELOPMENT_WORKFLOW.md#node-inspector-extension-host-process)

### Testing

- [Testing Workflows](./DEVELOPMENT_WORKFLOW.md#testing-workflows)
  - [Unit Tests (Vitest)](./DEVELOPMENT_WORKFLOW.md#unit-tests-vitest)
  - [Integration Tests (Mocha)](./DEVELOPMENT_WORKFLOW.md#integration-tests-mocha)
  - [Test-Driven Development (TDD)](./DEVELOPMENT_WORKFLOW.md#test-driven-development-tdd)
  - [Debugging Tests](./DEVELOPMENT_WORKFLOW.md#debugging-tests)

### Code Patterns

- [Code Patterns](./DEVELOPMENT_WORKFLOW.md#code-patterns)
  - [Creating a New Service](./DEVELOPMENT_WORKFLOW.md#creating-a-new-service)
  - [Working with Refs (Mutable State)](./DEVELOPMENT_WORKFLOW.md#working-with-refs-mutable-state)
  - [Working with Streams](./DEVELOPMENT_WORKFLOW.md#working-with-streams)
  - [Working with Semaphores](./DEVELOPMENT_WORKFLOW.md#working-with-semaphores-concurrency-control)
  - [Working with TestClock](./DEVELOPMENT_WORKFLOW.md#working-with-testclock)

### Performance & Tasks

- [Performance Profiling](./DEVELOPMENT_WORKFLOW.md#performance-profiling)
  - [Measure a Single Operation](./DEVELOPMENT_WORKFLOW.md#measure-a-single-operation)
  - [Add Instrumentation](./DEVELOPMENT_WORKFLOW.md#add-instrumentation-to-services)
  - [Profile with DevTools](./DEVELOPMENT_WORKFLOW.md#profile-with-devtools)
  - [Benchmark with Vitest](./DEVELOPMENT_WORKFLOW.md#benchmark-with-vitest)

- [Common Tasks](./DEVELOPMENT_WORKFLOW.md#common-tasks)
  - [Add a New Command](./DEVELOPMENT_WORKFLOW.md#add-a-new-command)
  - [Update Configuration Schema](./DEVELOPMENT_WORKFLOW.md#update-configuration-schema)
  - [Run a Specific Integration Test](./DEVELOPMENT_WORKFLOW.md#run-a-specific-integration-test)
  - [Generate Coverage Report](./DEVELOPMENT_WORKFLOW.md#generate-coverage-report)
  - [Update TypeScript Definitions](./DEVELOPMENT_WORKFLOW.md#update-typescript-definitions)
  - [Publish a New Version](./DEVELOPMENT_WORKFLOW.md#publish-a-new-version)
  - [Debug Flaky Tests](./DEVELOPMENT_WORKFLOW.md#debug-flaky-tests)

- [Keyboard Shortcuts](./DEVELOPMENT_WORKFLOW.md#keyboard-shortcuts-vs-code)

- [Troubleshooting Development Issues](./DEVELOPMENT_WORKFLOW.md#troubleshooting-development-issues)

---

## EXAMPLES.md

Real-world code patterns and snippets (17KB).

### Service Development

- [Creating a Service](./EXAMPLES.md#creating-a-service)
  - [Basic Service with Effect](./EXAMPLES.md#basic-service-with-effect)
  - [Service with Dependencies](./EXAMPLES.md#service-with-dependencies)

- [Using Services](./EXAMPLES.md#using-services)
  - [Basic Service Usage](./EXAMPLES.md#basic-service-usage)
  - [Service in Command Handler](./EXAMPLES.md#service-in-command-handler)

- [Testing Services](./EXAMPLES.md#testing-services)
  - [Unit Test with Effect](./EXAMPLES.md#unit-test-with-effect)
  - [Test Double / Mock Service](./EXAMPLES.md#test-double--mock-service)

### Advanced Patterns

- [Streams & Cancellation](./EXAMPLES.md#streams--cancellation)
  - [Basic Stream Usage](./EXAMPLES.md#basic-stream-usage)
  - [Cancellable Search with flatMapLatest](./EXAMPLES.md#cancellable-search-with-flatmaplatest)

- [Concurrency & Semaphores](./EXAMPLES.md#concurrency--semaphores)
  - [Rate Limiting with Semaphore](./EXAMPLES.md#rate-limiting-with-semaphore)
  - [Fan-Out / Fan-In Pattern](./EXAMPLES.md#fan-out--fan-in-pattern)

- [Memoization & Caching](./EXAMPLES.md#memoization--caching)
  - [Simple Memoization with Map](./EXAMPLES.md#simple-memoization-with-map)
  - [Memoized Selectors](./EXAMPLES.md#memoized-selectors-derived-state)

### Practical Patterns

- [Error Handling](./EXAMPLES.md#error-handling)
  - [Try-Catch Pattern](./EXAMPLES.md#try-catch-pattern)
  - [Catchall Handler](./EXAMPLES.md#catchall-handler)
  - [Retry with Backoff](./EXAMPLES.md#retry-with-backoff)
  - [Error Logging](./EXAMPLES.md#error-logging)

- [UI Integration](./EXAMPLES.md#ui-integration)
  - [QuickPick with Search](./EXAMPLES.md#quickpick-with-search)
  - [Status Bar with Live Updates](./EXAMPLES.md#status-bar-with-live-updates)

- [Performance Optimization](./EXAMPLES.md#performance-optimization)
  - [Batch Operations with Schedule](./EXAMPLES.md#batch-operations-with-schedule)
  - [Incremental Processing with Chunks](./EXAMPLES.md#incremental-processing-with-chunks)
  - [Lazy Evaluation](./EXAMPLES.md#lazy-evaluation-generators)

---

## GLOSSARY.md

Effect-TS and VS Code terminology (11KB).

### Effect-TS Concepts

- [Effect](./GLOSSARY.md#effect)
- [Fiber](./GLOSSARY.md#fiber)
- [Layer](./GLOSSARY.md#layer)
- [Context](./GLOSSARY.md#context)
- [Ref](./GLOSSARY.md#ref)
- [Stream](./GLOSSARY.md#stream)
- [Queue](./GLOSSARY.md#queue)
- [Semaphore](./GLOSSARY.md#semaphore)
- [Schedule](./GLOSSARY.md#schedule)
- [Scope](./GLOSSARY.md#scope)
- [Cause](./GLOSSARY.md#cause)
- [TestClock](./GLOSSARY.md#testclock)
- [Exit](./GLOSSARY.md#exit)

### VS Code Concepts

- [Extension Host](./GLOSSARY.md#extension-host)
- [QuickPick](./GLOSSARY.md#quickpick)
- [Command](./GLOSSARY.md#command)
- [Context Key](./GLOSSARY.md#context-key)
- [Workspace](./GLOSSARY.md#workspace)
- [Language Server Protocol (LSP)](./GLOSSARY.md#language-server-protocol-lsp)
- [Extension Context](./GLOSSARY.md#extension-context)

### Terminology

- [Common Abbreviations](./GLOSSARY.md#common-abbreviations)
- [Performance Terms](./GLOSSARY.md#performance-terms)
  - [Latency](./GLOSSARY.md#latency)
  - [Throughput](./GLOSSARY.md#throughput)
  - [Jank](./GLOSSARY.md#jank)
  - [Debounce](./GLOSSARY.md#debounce)
  - [Throttle](./GLOSSARY.md#throttle)
  - [Cache Hit](./GLOSSARY.md#cache-hit)
  - [IPC Round-Trip](./GLOSSARY.md#ipc-round-trip)

- [Testing Terms](./GLOSSARY.md#testing-terms)
  - [Unit Test](./GLOSSARY.md#unit-test)
  - [Integration Test](./GLOSSARY.md#integration-test)
  - [End-to-End (E2E) Test](./GLOSSARY.md#end-to-end-e2e-test)
  - [Fixture](./GLOSSARY.md#fixture)
  - [Mock](./GLOSSARY.md#mock)
  - [Snapshot Test](./GLOSSARY.md#snapshot-test)
  - [Property-Based Test](./GLOSSARY.md#property-based-test)

- [Acronyms](./GLOSSARY.md#acronyms)

---

## TROUBLESHOOTING.md

Common issues and solutions (12KB).

### Build Issues

- [Cannot find module 'vscode'](./TROUBLESHOOTING.md#cannot-find-module-vscode)
- [Module not found: effect](./TROUBLESHOOTING.md#module-not-found-effect)
- [TypeScript compilation errors](./TROUBLESHOOTING.md#typescript-compilation-errors)

### Test Issues

- [Module alias not working in tests](./TROUBLESHOOTING.md#module-alias-not-working-in-tests)
- [Tests hang or timeout](./TROUBLESHOOTING.md#tests-hang-or-timeout)
- [Snapshot mismatch](./TROUBLESHOOTING.md#snapshot-mismatch)
- [Tests pass locally but fail in CI](./TROUBLESHOOTING.md#tests-pass-locally-but-fail-in-ci)

### VS Code Extension Issues

- [Extension doesn't activate](./TROUBLESHOOTING.md#extension-doesnt-activate)
- [Command doesn't execute](./TROUBLESHOOTING.md#command-doesnt-execute)
- [Menu items don't appear](./TROUBLESHOOTING.md#menu-items-dont-appear)
- [Settings not saved](./TROUBLESHOOTING.md#settings-not-saved)

### Performance Issues

- [Extension is slow](./TROUBLESHOOTING.md#extension-is-slow)
- [IPC calls are slow](./TROUBLESHOOTING.md#ipc-calls-are-slow)
- [Memory usage is high](./TROUBLESHOOTING.md#memory-usage-is-high)

### Deployment Issues

- [VSIX file is too large](./TROUBLESHOOTING.md#vsix-file-is-too-large)
- [Extension fails to activate in Marketplace](./TROUBLESHOOTING.md#extension-fails-to-activate-in-marketplace)

### CI/CD Issues

- [Tests fail on Linux with 'command not found: xvfb-run'](./TROUBLESHOOTING.md#tests-fail-on-linux-with-command-not-found-xvfb-run)
- [Tests timeout in CI](./TROUBLESHOOTING.md#tests-timeout-in-ci)
- [Coverage upload fails](./TROUBLESHOOTING.md#coverage-upload-fails)

- [Getting Help](./TROUBLESHOOTING.md#getting-help)

---

## DEPLOYMENT.md

Packaging, versioning, and publishing guide (12KB).

### Pre-Deployment

- [Pre-Deployment Checklist](./DEPLOYMENT.md#pre-deployment-checklist)

### Version Management

- [Version Management](./DEPLOYMENT.md#version-management)
  - [Semantic Versioning](./DEPLOYMENT.md#semantic-versioning)
  - [Updating Version](./DEPLOYMENT.md#updating-version)

### Building & Packaging

- [Building the Extension](./DEPLOYMENT.md#building-the-extension)
  - [Compile for Production](./DEPLOYMENT.md#compile-for-production)
  - [Verify Build Output](./DEPLOYMENT.md#verify-build-output)

- [Creating a VSIX Package](./DEPLOYMENT.md#creating-a-vsix-package)
  - [Install VSCE](./DEPLOYMENT.md#install-vsce)
  - [Create .vscodeignore](./DEPLOYMENT.md#create-vscodeignore)
  - [Create Package](./DEPLOYMENT.md#create-package)
  - [Validate Package](./DEPLOYMENT.md#validate-package)

### Publishing

- [Publishing to Marketplace](./DEPLOYMENT.md#publishing-to-marketplace)
  - [Create Publisher Account](./DEPLOYMENT.md#create-publisher-account)
  - [Update package.json](./DEPLOYMENT.md#update-packagejson)
  - [Publish](./DEPLOYMENT.md#publish)
  - [Verify on Marketplace](./DEPLOYMENT.md#verify-on-marketplace)

### Post-Deployment

- [Post-Deployment](./DEPLOYMENT.md#post-deployment)
  - [Announce Release](./DEPLOYMENT.md#announce-release)
  - [Monitor Issues](./DEPLOYMENT.md#monitor-issues)
  - [Gather Telemetry](./DEPLOYMENT.md#gather-telemetry-optional)

### CI/CD & Automation

- [CI/CD Integration](./DEPLOYMENT.md#cicd-integration)
  - [Automated Publishing Workflow](./DEPLOYMENT.md#automated-publishing-workflow)
  - [Automatic Version Bumping](./DEPLOYMENT.md#automatic-version-bumping)

### Advanced Topics

- [Troubleshooting Deployment](./DEPLOYMENT.md#troubleshooting-deployment)
  - [VSIX file too large](./DEPLOYMENT.md#vsix-file-is-too-large)
  - [401 Unauthorized: Token expired](./DEPLOYMENT.md#401-unauthorized-the-token-has-expired)
  - [Publisher not found](./DEPLOYMENT.md#publisher-not-found)
  - [Extension not compatible](./DEPLOYMENT.md#extension-not-compatible)

- [Version History Management](./DEPLOYMENT.md#version-history-management)
  - [Deprecate Old Versions](./DEPLOYMENT.md#deprecate-old-versions)
  - [Long-Term Support (LTS)](./DEPLOYMENT.md#long-term-support-lts)

- [Best Practices](./DEPLOYMENT.md#best-practices)
  - [Pre-Release Versions](./DEPLOYMENT.md#pre-release-versions)
  - [Changelog Format](./DEPLOYMENT.md#changelog-format)

- [Rollback Procedure](./DEPLOYMENT.md#rollback-procedure)

- [Marketplace Best Practices](./DEPLOYMENT.md#marketplace-best-practices)
  - [Screenshot Tips](./DEPLOYMENT.md#screenshot-tips)
  - [README Tips](./DEPLOYMENT.md#readme-tips)

- [Maintenance & Updates](./DEPLOYMENT.md#maintenance--updates)
  - [Monthly Checks](./DEPLOYMENT.md#monthly-checks)
  - [Release Cadence](./DEPLOYMENT.md#release-cadence)

---

## Document Sizes & Stats

| Document | Size | Lines | Sections | Purpose |
|----------|------|-------|----------|---------|
| QUICK_START.md | 2.4K | 110 | 9 | 5-minute setup |
| ARCHITECTURE.md | 32K | 1,100+ | 40+ | Complete design |
| LIBRARIAN_FINDINGS.md | 28K | 950+ | 35+ | Performance analysis |
| API_REFERENCE.md | 19K | 800+ | 30+ | Service interfaces |
| DEVELOPMENT_WORKFLOW.md | 13K | 550+ | 25+ | Daily development |
| EXAMPLES.md | 17K | 650+ | 20+ | Code patterns |
| GLOSSARY.md | 11K | 450+ | 35+ | Terminology |
| TROUBLESHOOTING.md | 12K | 500+ | 25+ | Common issues |
| DEPLOYMENT.md | 12K | 500+ | 25+ | Publishing guide |
| **Total** | **146K** | **~5,900** | **~215+** | **Complete docs** |

---

## Quick Search Guide

**Looking for...**

| Topic | File | Section |
|-------|------|---------|
| How to start | [QUICK_START.md](./QUICK_START.md) | Step 1–4 |
| Project structure | [ARCHITECTURE.md](./ARCHITECTURE.md) | Setup with Bun → Project Structure |
| Service APIs | [API_REFERENCE.md](./API_REFERENCE.md) | ContextService, ConfigService, etc. |
| Debug extension | [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) | Debugging |
| Write tests | [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) | Testing Workflows |
| Code examples | [EXAMPLES.md](./EXAMPLES.md) | Any section |
| Effect-TS basics | [GLOSSARY.md](./GLOSSARY.md) | Effect-TS Concepts |
| Extension basics | [GLOSSARY.md](./GLOSSARY.md) | VS Code Concepts |
| Performance issues | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Performance Issues |
| Publish extension | [DEPLOYMENT.md](./DEPLOYMENT.md) | Publishing to Marketplace |
| Why which-key is slow | [LIBRARIAN_FINDINGS.md](./LIBRARIAN_FINDINGS.md) | Bottleneck 1–8 |
| Performance targets | [ARCHITECTURE.md](./ARCHITECTURE.md) | Performance Targets |
| Implementation plan | [ARCHITECTURE.md](./ARCHITECTURE.md) | Implementation Plan & Tasks |
| Common errors | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Build/Test Issues |
| Keyboard shortcuts | [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) | Keyboard Shortcuts |

---

## Reading Recommendations

### First Time Setup
1. [QUICK_START.md](./QUICK_START.md) — 5 min
2. [ARCHITECTURE.md](./ARCHITECTURE.md) → "Setup with Bun" — 15 min
3. [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) → "Development Commands" — 5 min

**Total: 25 minutes** → ready to code

### During Development
- Keep [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) open for commands
- Refer to [API_REFERENCE.md](./API_REFERENCE.md) when using services
- Check [EXAMPLES.md](./EXAMPLES.md) for patterns
- Use [GLOSSARY.md](./GLOSSARY.md) to understand terminology

### When Stuck
1. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — search by error
2. [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) → "Troubleshooting Development Issues"
3. [GLOSSARY.md](./GLOSSARY.md) — understand terms you don't know

### Understanding Performance
1. [LIBRARIAN_FINDINGS.md](./LIBRARIAN_FINDINGS.md) — understand 8 bottlenecks
2. [ARCHITECTURE.md](./ARCHITECTURE.md) → "Why Effect-TS" — understand solution
3. [EXAMPLES.md](./EXAMPLES.md) → "Performance Optimization" — see patterns

### Ready to Deploy
1. [DEPLOYMENT.md](./DEPLOYMENT.md) → "Pre-Deployment Checklist"
2. [DEPLOYMENT.md](./DEPLOYMENT.md) → "Creating a VSIX Package"
3. [DEPLOYMENT.md](./DEPLOYMENT.md) → "Publishing to Marketplace"

---

## Document Relationships

```
QUICK_START.md
    ↓
ARCHITECTURE.md (detailed design)
    ├── references LIBRARIAN_FINDINGS.md (why bottlenecks exist)
    ├── references API_REFERENCE.md (service interfaces)
    └── references DEVELOPMENT_WORKFLOW.md (daily work)
         ├── references EXAMPLES.md (code patterns)
         ├── references GLOSSARY.md (terminology)
         └── references TROUBLESHOOTING.md (debugging)

DEPLOYMENT.md (when ready to ship)
```

---

**Last updated**: 2026-02-24  
**Status**: Complete documentation with 215+ linked sections  
**Total coverage**: ~5,900 lines, 146KB across 9 documents
