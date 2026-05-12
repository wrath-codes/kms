---
title: "Add Command Icon Support (Phase 2a: Icon Source Abstraction & Codicons)"
status: ready
date: 2026-05-06
idea: 20260428-command-icons.md
group: command-icons
phase: 2a
tags: [ui, icons, abstraction, codicons, extensibility]
dependencies: [20260428-command-icons-phase1.md]
---

# Phase 2a: Icon Source Abstraction & Codicons Support

## Overview

Refactor Phase 1's hardcoded Nerd Font rendering into a pluggable **icon source registry** that supports multiple icon providers (Nerd Fonts, VS Code codicons, custom). Enable users to mix icon sources and let the system automatically resolve the best match based on available fonts and theme support.

**Deliverable**: Icon rendering abstracted into pluggable sources. Codicons support added with fallback chain. All Phase 1 tests still pass. New tests for registry + resolution logic.

---

## Motivation

Phase 1 works well but is **hardcoded to Nerd Fonts**. Real-world use:
- Users with VS Code codicons installed want to use theme-aware icons (`$(check)` syntax)
- Users without Nerd Fonts installed get broken rendering
- Icon providers should be **pluggable** — allow extensions to register custom sources
- Fallback chain should be configurable per user/workspace

Example: User has codicons but no Nerd Fonts → should auto-fallback to codicons, not broken rendering.

---

## Step-by-Step Plan

### Step 1: Define Icon Source Interface

**File**: `src/services/IconService.ts` (new file)

Create a service that defines the icon provider contract and registry:

```typescript
export interface IconSource {
  readonly id: string // e.g., "nerd-fonts", "codicons", "custom-icons"
  readonly name: string
  readonly priority: number // Lower = higher priority in fallback chain
  readonly supportsTheme: boolean // Does it respect light/dark theme?
  readonly resolve: (iconName: string) => IconResult | null
}

export type IconResult = { icon: string; source: string; themeAware: boolean }

export class IconService extends Context.Tag("IconService")<
  IconService,
  {
    readonly register: (source: IconSource) => Effect.Effect<void>
    readonly resolve: (iconName: string, context?: "which-key" | "search") => Effect.Effect<IconResult>
    readonly listSources: () => Effect.Effect<readonly IconSource[]>
  }
>() {}
```

**Why**: All icon rendering will use `IconService.resolve()` instead of inline formatting. This allows swapping sources without touching the UI layer.

---

### Step 2: Create NerdFonts Icon Source

**File**: `src/services/iconSources/NerdFontsSource.ts` (new file)

Wrap Phase 1's Nerd Font formatting logic into an `IconSource` implementation:

```typescript
export const NerdFontsSource: IconSource = {
  id: "nerd-fonts",
  name: "Nerd Fonts",
  priority: 10,
  supportsTheme: false,
  resolve: (iconName: string) => {
    // Return null if iconName is not a valid Nerd Font glyph
    if (!iconName || !iconName.trim()) return null
    return {
      icon: iconName.trim(),
      source: "nerd-fonts",
      themeAware: false,
    }
  },
}
```

**Why**: Existing Nerd Font icons still work. Source is now swappable.

---

### Step 3: Create VS Code Codicons Source

**File**: `src/services/iconSources/CodiconsSource.ts` (new file)

Implement codicons provider using VS Code's `@vscode/codicons` patterns:

```typescript
export const CodiconsSource: IconSource = {
  id: "codicons",
  name: "VS Code Codicons",
  priority: 5, // Higher priority than Nerd Fonts (lower number = tries first)
  supportsTheme: true,
  resolve: (iconName: string) => {
    // Codicons use $(name) syntax; if user provides it directly, extract name
    const match = iconName.match(/^\$\(([^)]+)\)$/) ?? [, iconName]
    const codiconName = match[1]
    
    // Validate against known codicons list
    if (KNOWN_CODICONS.has(codiconName)) {
      return {
        icon: `$(${codiconName})`,
        source: "codicons",
        themeAware: true,
      }
    }
    return null
  },
}

// Reference: https://github.com/microsoft/vscode-codicons/blob/main/src/index.ts
const KNOWN_CODICONS = new Set([
  "add", "plus", "edit", "pencil", "close", "x", "search", "find",
  "folder", "file", "archive", "delete", "settings", "gear",
  "debug", "terminal", "code", "check", "verified", "issue",
  // ... add more as needed
])
```

**Why**: Codicons are theme-aware (respect VS Code light/dark modes) and are built-in. This is a major feature upgrade for users.

---

### Step 4: Implement Icon Resolution Logic

**File**: `src/services/IconService.ts` (continued from Step 1)

Implement the live service with registry + fallback chain:

```typescript
export const IconServiceLive = Layer.effect(
  IconService,
  Effect.gen(function* () {
    const sourcesRef = yield* Ref.make<IconSource[]>([
      CodiconsSource,
      NerdFontsSource, // Fallback to Nerd Fonts if codicons not found
    ])

    return {
      register: (source: IconSource) =>
        Ref.update(sourcesRef, (sources) =>
          [...sources, source].sort((a, b) => a.priority - b.priority)
        ),

      resolve: (iconName: string) =>
        Effect.gen(function* () {
          const sources = yield* Ref.get(sourcesRef)
          for (const source of sources) {
            const result = source.resolve(iconName)
            if (result) return result
          }
          // Fallback: return as-is if any source claims it
          return { icon: iconName, source: "unknown", themeAware: false }
        }),

      listSources: () => Ref.get(sourcesRef),
    }
  })
)
```

**Why**: Registry-based resolution allows users to configure source priority or add custom sources. Fallback chain ensures graceful degradation.

---

### Step 5: Refactor whichKeyMenu to Use IconService

**File**: `src/ui/whichKeyMenu.ts` (lines 52-62)

Replace inline `formatIconPrefix` with `IconService.resolve`:

Before:
```typescript
const renderLevel = (nodes: readonly BindingNode[]): WhichKeyItem[] =>
  nodes.map((node) => {
    const iconPrefix = formatIconPrefix(node.icon)
    // ...
  })
```

After:
```typescript
const renderLevel = (nodes: readonly BindingNode[]): WhichKeyItem[] =>
  // Note: This becomes async via Effect; update signature accordingly
  nodes.map((node) => {
    const iconResult = yield* IconService.resolve(node.icon, "which-key")
    const label = `${iconResult.icon} [${node.key}]  ${node.name}`
    // ...
  })
```

**Why**: All icon rendering now goes through the registry, making it extensible.

---

### Step 6: Refactor RenderModelService to Use IconService

**File**: `src/services/RenderModelService.ts` (lines 35-48)

Update `toQuickPickItem` to use `IconService.resolve`:

Before:
```typescript
export const toQuickPickItem = (item: RenderItem) => ({
  label: `${formatIconPrefix(item.icon)}${item.label}`,
  // ...
})
```

After:
```typescript
export const toQuickPickItem = (item: RenderItem, iconResult: IconResult) => ({
  label: `${iconResult.icon} ${item.label}`,
  // ...
})
```

**Why**: Consistent resolution through the service layer.

---

### Step 7: Update Types and Documentation

**File**: `src/domain/types.ts` (Command and RenderItem JSDoc)

Update JSDoc to mention icon source support:

```typescript
/**
 * Optional icon identifier (Nerd Font glyph, VS Code codicon, or custom).
 * 
 * Examples:
 * - Nerd Font: "󰊢" (glyph directly)
 * - VS Code codicons: "$(check)" or "check"
 * - Custom source: "custom:my-icon"
 * 
 * Resolution order: Codicons → Nerd Fonts → Custom → Fallback (•)
 * Set depends on IconService configuration (see README Phase 2).
 */
readonly icon: string | undefined
```

**Why**: Users need to know how to reference different icon sources.

---

### Step 8: Add Tests

**File**: `src/test/unit/iconService.spec.ts` (new file)

Test the icon service registry and resolution logic:

- `NerdFontsSource.resolve()` returns glyph for valid icons, null for invalid
- `CodiconsSource.resolve()` accepts both `$(name)` and `name` formats
- `IconService.resolve()` tries sources in priority order
- `IconService.resolve()` returns first matching source
- `IconService.register()` adds new sources and respects priority
- Registry respects priority when multiple sources match same icon
- Fallback chain: codicons → nerd fonts → unknown returns as-is

**File**: `src/test/unit/whichKeyMenu.spec.ts` + `renderModelService.spec.ts`

Update existing tests to verify icon resolution still works with the service (no functional change to output).

---

### Step 9: Update README

**File**: `README.md` (new section: "Icon Sources & Themes")

Document the multi-source approach:

```markdown
## Icon Sources & Themes

KMS supports multiple icon sources, automatically trying each in order:

1. **VS Code Codicons** (theme-aware) — built-in, respects light/dark theme
2. **Nerd Fonts** (static) — 3000+ glyphs, requires font installation
3. **Custom sources** — extensible via IconService registry

### Using Codicons

Codicons are built into VS Code and respect your theme:

\`\`\`json
{
  "kms.bindings": [
    { "key": "f", "name": "File", "icon": "$(folder-opened)" }
  ]
}
\`\`\`

Available codicons: [Codicons reference](https://github.com/microsoft/vscode-codicons)

### Using Nerd Fonts

Install a Nerd Font and use glyphs directly:

\`\`\`json
{
  "kms.bindings": [
    { "key": "f", "name": "File", "icon": "󰊢" }
  ]
}
\`\`\`

### Mixed Sources

You can mix sources in the same configuration:

\`\`\`json
{
  "kms.bindings": [
    { "key": "f", "name": "File", "icon": "$(folder-opened)" },  // Codicon
    { "key": "e", "name": "Edit", "icon": "󰏫" }  // Nerd Font
  ]
}
\`\`\`

Resolution: KMS tries codicons first, falls back to Nerd Fonts if not found.
```

---

## Acceptance Criteria

- ✅ `IconService` interface defined with `register`, `resolve`, `listSources` methods
- ✅ `NerdFontsSource` implemented as `IconSource` matching Phase 1 behavior
- ✅ `CodiconsSource` implemented supporting both `$(name)` and `name` formats
- ✅ `IconServiceLive` layer implements registry with priority-based fallback chain
- ✅ `whichKeyMenu.renderLevel()` uses `IconService.resolve()` instead of inline formatting
- ✅ `RenderModelService.toQuickPickItem()` uses `IconService.resolve()`
- ✅ JSDoc updated with multi-source examples
- ✅ README has new "Icon Sources & Themes" section with codicons reference
- ✅ All Phase 1 tests still pass (76 original + 14 from Phase 1 review)
- ✅ 8+ new tests for IconService registry + resolution logic
- ✅ No performance regression

---

## Risk & Mitigations

| Risk | Mitigation |
|------|-----------|
| Async icon resolution blocks rendering | Keep resolution fast (lookup table, not IO); cache results in RenderModel |
| Codicons not available in all VS Code versions | Graceful fallback to Nerd Fonts; document minimum version |
| Icon name collisions between sources | Prefix syntax: `codicon:check` vs `nerd:󰊢` allows explicit selection |
| Users confused by multiple formats | Clear README examples; intellisense help in settings JSON schema (Phase 2b) |

---

## Dependencies

- Requires Phase 1 completion
- Blocks Phase 2b (schema validation needs icon source knowledge)
- Enables future Phase 3: custom icon sources (plugins can register their own)

---

## Time Estimate

~4–6 hours (interface design, source implementations, tests, documentation)
