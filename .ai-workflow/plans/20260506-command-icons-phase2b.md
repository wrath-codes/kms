---
title: "Add Command Icon Support (Phase 2b: Schema Validation & Icon Picker)"
status: ready
date: 2026-05-06
idea: 20260428-command-icons.md
group: command-icons
phase: 2b
tags: [ui, schema, validation, picker, config, ux]
dependencies: [20260506-command-icons-phase2a.md]
---

# Phase 2b: Config Schema Validation & Icon Picker UI

## Overview

Add **JSON schema validation** for icon fields in VS Code settings, providing clear error messages and autocomplete hints. Build an **interactive icon picker UI** (command palette) that previews icons from all sources, supports filtering/search, and enables copy-to-clipboard for quick config updates.

**Deliverable**: `kms.bindings` schema validates icon fields with clear errors. Icon picker command shows searchable grid with preview. All Phase 2a tests pass. New tests for schema + picker logic.

---

## Motivation

Phase 2a made icons extensible, but **configuration is still error-prone**:
- Users might type invalid codicon names → silent fallback, confusing
- Users don't know what codicons are available → guessing required
- No UI assistance for discovering/testing icons
- No quick way to preview icons before committing to config

Real use: User wants to add `$(check)` icon, types `$(chck)` by mistake → renders as `• ` fallback silently. No error message.

---

## Step-by-Step Plan

### Step 1: Create VS Code Settings Schema

**File**: `schemas/kms-bindings-schema.json` (new file)

Define JSON Schema for `kms.bindings` configuration with validation and error messages:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "KMS Bindings Configuration",
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "key": {
        "type": "string",
        "description": "Single character key binding",
        "pattern": "^[a-zA-Z0-9]$",
        "errorMessage": {
          "pattern": "Key must be a single character (a-z, A-Z, 0-9)"
        }
      },
      "name": {
        "type": "string",
        "description": "Display name for this binding"
      },
      "icon": {
        "type": "string",
        "description": "Icon identifier: Nerd Font glyph, VS Code codicon ($(name) or name), or custom",
        "examples": ["󰊢", "$(folder-opened)", "check"]
      },
      "command": {
        "type": "string",
        "description": "Command ID to execute (e.g., 'workbench.action.files.save')"
      },
      "args": {
        "type": "object",
        "description": "Optional arguments to pass to the command"
      },
      "bindings": {
        "type": "array",
        "description": "Nested bindings (submenu)",
        "$ref": "#"
      }
    },
    "required": ["key", "name"],
    "additionalProperties": false,
    "allOf": [
      {
        "if": { "properties": { "bindings": { "type": "array" } }, "required": ["bindings"] },
        "then": { "not": { "required": ["command"] } },
        "else": { "required": ["command"] }
      }
    ]
  }
}
```

**Why**: Schema provides intellisense hints in VS Code settings editor. Validation catches typos early.

---

### Step 2: Register Schema in package.json

**File**: `package.json` (jsonValidation section)

Register the schema so VS Code knows to validate settings:

```json
{
  "contributes": {
    "jsonValidation": [
      {
        "fileMatch": "settings.json",
        "url": "./schemas/kms-bindings-schema.json"
      }
    ]
  }
}
```

**Why**: VS Code will validate `kms.bindings` in user/workspace settings against the schema.

---

### Step 3: Build Icon Picker Command

**File**: `src/ui/iconPicker.ts` (new file)

Create a command that shows an interactive icon picker with search + preview:

```typescript
export class IconPickerUI extends Context.Tag("IconPickerUI")<
  IconPickerUI,
  {
    readonly show: () => Effect.Effect<string | undefined>
  }
>() {}

export const IconPickerUILive = Layer.effect(
  IconPickerUI,
  Effect.gen(function* () {
    return {
      show: () =>
        Effect.gen(function* () {
          const iconService = yield* IconService
          const sources = yield* iconService.listSources()
          
          // Flatten all icons from all sources into searchable list
          const allIcons = yield* buildIconList(sources)
          
          // Show QuickPick with search + preview
          const selected = yield* showIconQuickPick(allIcons)
          
          return selected?.value // Return icon string or undefined if cancelled
        }),
    }
  })
)

interface IconOption {
  label: string // Display: icon + name
  description: string // Icon value + source
  detail: string // Usage example
  value: string // The actual icon identifier to use
  source: string // "codicons" | "nerd-fonts" | etc.
  themeAware: boolean
}

const buildIconList = (sources: IconSource[]): IconOption[] => {
  const options: IconOption[] = []
  
  // Codicons
  if (sources.some(s => s.id === "codicons")) {
    KNOWN_CODICONS.forEach(name => {
      options.push({
        label: `$(${name}) ${name}`,
        description: `$(${name}) · codicons`,
        detail: `"icon": "$(${name})" or "icon": "${name}"`,
        value: `$(${name})`,
        source: "codicons",
        themeAware: true,
      })
    })
  }
  
  // Nerd Fonts (sampling of popular ones)
  if (sources.some(s => s.id === "nerd-fonts")) {
    POPULAR_NERD_FONTS.forEach(({ glyph, name }) => {
      options.push({
        label: `${glyph} ${name}`,
        description: `${glyph} · nerd-fonts`,
        detail: `"icon": "${glyph}"`,
        value: glyph,
        source: "nerd-fonts",
        themeAware: false,
      })
    })
  }
  
  return options.sort((a, b) => a.label.localeCompare(b.label))
}

const showIconQuickPick = (icons: IconOption[]): Effect.Effect<IconOption | undefined> => {
  const quickPick = vscode.window.createQuickPick<IconOption>()
  quickPick.items = icons
  quickPick.placeholder = "Search icons... or paste an icon directly"
  quickPick.canSelectMany = false
  quickPick.matchOnDescription = true
  quickPick.matchOnDetail = true
  
  return new Promise((resolve) => {
    quickPick.onDidAccept(() => {
      resolve(quickPick.selectedItems[0])
      quickPick.hide()
    })
    quickPick.onDidHide(() => {
      resolve(undefined)
      quickPick.dispose()
    })
    quickPick.show()
  })
}

const KNOWN_CODICONS = [
  "add", "plus", "edit", "pencil", "close", "x", "search", "find",
  "folder", "folder-opened", "file", "archive", "delete", "settings",
  "gear", "debug", "terminal", "code", "check", "verified", "issue",
  "bookmark", "tag", "run", "refresh", "sync", "home", "circle",
  "menu", "tools", "server", "database", "cloud", "eye", "eye-closed",
  // ... expand with full set from https://github.com/microsoft/vscode-codicons
]

const POPULAR_NERD_FONTS = [
  { glyph: "󰊢", name: "File" },
  { glyph: "󰍉", name: "Search" },
  { glyph: "󰒓", name: "Settings" },
  { glyph: "󰔨", name: "Build" },
  { glyph: "󰆍", name: "Terminal" },
  { glyph: "󰅲", name: "Comment" },
  { glyph: "󰉋", name: "Folder" },
  { glyph: "󰃤", name: "Debug" },
  { glyph: "󰏓", name: "Package" },
  // ... expand with popular set; link to cheat sheet for full list
]
```

**Why**: Visual icon picker lowers barrier to discovery. Copy-pasteable output makes config easy.

---

### Step 4: Register Icon Picker Command

**File**: `src/extension.ts` (contribute command section in package.json)

Add the command to the extension:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "kms.pickIcon",
        "title": "KMS: Pick Icon for Configuration",
        "category": "KMS"
      }
    ]
  }
}
```

And in `src/extension.ts`:

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand("kms.pickIcon", () => {
    if (!runtime) return
    runtime.runPromise(
      Effect.gen(function* () {
        const picker = yield* IconPickerUI
        const icon = yield* picker.show()
        if (icon) {
          // Copy to clipboard
          yield* vscode.env.clipboard.writeText(icon)
          yield* vscode.window.showInformationMessage(
            `Icon copied: ${icon}\nPaste into your kms.bindings config.`
          )
        }
      })
    ).catch((e) => logError("pickIcon", e))
  })
)
```

**Why**: One-click icon selection → copy → paste into config. Much better UX than manual lookup.

---

### Step 5: Add Icon Validation & Hints to ConfigService

**File**: `src/services/ConfigService.ts` (add validation method)

Add a method to validate icon values against registered sources:

```typescript
export class ConfigService extends Context.Tag("ConfigService")<
  ConfigService,
  {
    readonly config: () => Effect.Effect<KmsConfig>
    readonly validateIcon: (iconString: string) => Effect.Effect<{ valid: boolean; source?: string; error?: string }>
  }
>() {}

// In ConfigServiceLive:
validateIcon: (iconString: string) =>
  Effect.gen(function* () {
    const iconService = yield* IconService
    const result = yield* iconService.resolve(iconString)
    
    if (result.source === "unknown") {
      return {
        valid: false,
        error: `Icon not found in any source. Check codicon names at https://github.com/microsoft/vscode-codicons or use a Nerd Font glyph.`,
      }
    }
    
    return { valid: true, source: result.source }
  })
```

**Why**: ConfigService can now report which icons are valid, enabling better user feedback.

---

### Step 6: Update README with Icon Picker & Schema Info

**File**: `README.md` (new section)

Document the icon picker feature and schema validation:

```markdown
## Finding & Testing Icons

### Option 1: Icon Picker (Interactive)

Run command **KMS: Pick Icon for Configuration** (`kms.pickIcon`):
1. Opens searchable grid of all available icons
2. Search by name (e.g., "folder", "check")
3. Preview icon in light/dark theme
4. Click or press Enter to copy icon to clipboard
5. Paste into your `kms.bindings` config

### Option 2: Manual Lookup

**Codicons**: Browse [VS Code Codicons Cheat Sheet](https://github.com/microsoft/vscode-codicons/blob/main/src/index.ts)  
**Nerd Fonts**: Browse [Nerd Fonts Cheat Sheet](https://www.nerdfonts.com/cheat-sheet)

### Configuration Validation

VS Code validates your `kms.bindings` against a schema. Invalid icon names will show inline errors:

```json
{
  "key": "f",
  "name": "File",
  "icon": "$(invalid)"  // ❌ Error: Unknown codicon
}
```

Check the Problems panel (Ctrl+Shift+M) for details.
```

---

### Step 7: Add Tests

**File**: `src/test/unit/iconPicker.spec.ts` (new file)

Test the icon picker logic:

- `buildIconList()` returns all icons from all sources
- `buildIconList()` includes codicons when CodiconsSource registered
- `buildIconList()` includes Nerd Fonts when NerdFontsSource registered
- QuickPick accepts selection and returns icon value
- QuickPick returns undefined if cancelled
- Icons are sortable by name
- Filter works on description (source) and detail (usage example)

**File**: `src/test/unit/configService.spec.ts` (add tests)

- `validateIcon()` returns valid: true for known codicon
- `validateIcon()` returns valid: true for known Nerd Font glyph
- `validateIcon()` returns valid: false with error message for unknown icon
- `validateIcon()` handles both `$(name)` and `name` formats for codicons

---

### Step 8: Add Integration Test

**File**: `src/test/integration/iconPicker.integration.ts` (new file)

Test end-to-end: config → icon picker → copy → validate:

- User runs icon picker command
- Selects a codicon from grid
- Icon copied to clipboard
- Icon can be pasted into settings
- ConfigService validates the pasted icon
- No errors in Problems panel

---

## Acceptance Criteria

- ✅ `kms-bindings-schema.json` defines icon field validation
- ✅ Schema registered in `package.json` contributes section
- ✅ `IconPickerUI` service provides searchable grid of all icons
- ✅ Icon picker supports codicons + Nerd Fonts + custom sources
- ✅ Selected icon copied to clipboard with usage example
- ✅ `kms.pickIcon` command registered and working
- ✅ `ConfigService.validateIcon()` method validates icons against sources
- ✅ README has "Finding & Testing Icons" section with picker + schema docs
- ✅ All Phase 2a tests still pass
- ✅ 10+ new tests for picker + validation logic
- ✅ Schema validation shows clear error messages in VS Code
- ✅ No performance regression

---

## Risk & Mitigations

| Risk | Mitigation |
|------|-----------|
| Icon list too large, picker slow | Curate popular icons; lazy-load full list on demand |
| Codicons not theme-aware in all contexts | Note in picker: "Theme preview may differ in which-key menu" |
| Users paste invalid icon without seeing error | Error message in Problems panel; hover for details |
| Schema file path breaks if moved | Use relative path in package.json; document convention |

---

## Dependencies

- Requires Phase 2a (IconService, sources must exist)
- Blocks nothing; Phase 3 (custom sources) can run in parallel

---

## Time Estimate

~5–7 hours (schema authoring, picker UI, validation logic, tests, docs)

---

## Future Enhancements (Phase 3+)

- Icon theming: custom colors per source
- Icon preview in which-key menu (small tooltip)
- Custom icon source registration (extensions can provide icon packs)
- Icon search optimization (full-text indexing for 3000+ Nerd Fonts)
