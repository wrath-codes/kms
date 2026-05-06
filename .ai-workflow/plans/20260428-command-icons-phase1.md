---
title: "Add Command Icon Support (Phase 1: Types & Rendering)"
status: ready
date: 2026-04-28
idea: 20260428-command-icons.md
group: command-icons
phase: 1
tags: [ui, nerd-fonts, types, rendering]
dependencies: []
---

# Phase 1: Add Command Icon Support — Types & Rendering

## Overview

Add optional icon fields to Command and RenderItem types, implement icon rendering in which-key menu and search results, and document Nerd Font usage.

**Deliverable**: Icons appear in which-key menu and search results. All tests pass. README updated with Nerd Font reference.

---

## Step-by-Step Plan

### Step 1: Update Command Type

**File**: `src/domain/types.ts` (lines 14-21)

Add optional `icon` field to Command class:

```typescript
export class Command extends Data.Class<{
  readonly id: CommandId
  readonly label: string
  readonly description: string | undefined
  readonly category: string | undefined
  readonly keybinding: string | undefined
  readonly when: string | undefined
  readonly icon: string | undefined  // NEW: Optional Nerd Font icon
}> {}
```

**Why**: Commands can have default icons that appear in search results. Users can add icons when registering commands.

---

### Step 2: Update RenderItem Type

**File**: `src/domain/types.ts` (lines 47-52)

Add optional `icon` field to RenderItem class:

```typescript
export class RenderItem extends Data.Class<{
  readonly label: string
  readonly description: string | undefined
  readonly detail: string | undefined
  readonly icon: string | undefined  // NEW: Optional Nerd Font icon
  readonly command: Command
}> {}
```

**Why**: RenderItem needs to carry icon for display in QuickPick.

---

### Step 3: Update RenderModelService to Include Icons

**File**: `src/services/RenderModelService.ts` (lines 90-110, in renderItem function)

When constructing RenderItem from SearchResult, pass the command's icon:

```typescript
const renderItem = (result: SearchResult): RenderItem => {
  return new RenderItem({
    label: result.command.keybinding
      ? `$(key) ${result.command.label}`
      : result.command.label,
    description: result.command.category,
    detail: result.command.description,
    icon: result.command.icon,  // NEW: Pass icon from command
    command: result.command,
  })
}
```

**Why**: Icons from commands need to be preserved through the render pipeline.

---

### Step 4: Update WhichKeyMenu renderLevel Function

**File**: `src/ui/whichKeyMenu.ts` (lines 44-53)

Update renderLevel to include icons from BindingGroup/BindingLeaf:

```typescript
const renderLevel = (nodes: readonly BindingNode[]): WhichKeyItem[] =>
  nodes.map((node) => {
    const icon = node.icon ? `${node.icon} ` : "• "  // Icon with space, or fallback dot
    const prefix = icon + (node.icon ? `[${node.key}]` : `[${node.key}]`)
    const isGroup = node instanceof BindingGroup
    return {
      label: `${prefix}  ${node.name}`,
      description: isGroup ? "→" : undefined,
      node,
    }
  })
```

**Why**: Which-key menu should display icons alongside keys. Fallback to `•` for consistency when no icon.

**Visual result**:
```
  [f]  File
  [s]  Search
  [S]  Settings
```

**Note**: BindingGroup and BindingLeaf already have `icon` fields in types.ts (lines 100-113).

---

### Step 5: Update QuickPick Item Display for Search Results

**File**: `src/services/RenderModelService.ts` (around line 125-140, where items are converted to QuickPickOptions)

When displaying RenderItem in QuickPick, include icon in the label:

```typescript
// In the function that converts RenderItem[] to vscode.QuickPickItem[]
const quickPickItem = (item: RenderItem): vscode.QuickPickItem => {
  const iconPrefix = item.icon ? `${item.icon} ` : "• "
  return {
    label: `${iconPrefix}${item.label}`,
    description: item.description,
    detail: item.detail,
  }
}
```

**Why**: Search results QuickPick should display icons just like the which-key menu.

---

### Step 6: Add JSDoc to Icon Fields

Add documentation to new icon fields:

```typescript
/**
 * Optional Nerd Font icon (e.g., "", "", "").
 * Displays in which-key menus and search results.
 * If omitted, defaults to "•" (larger dot).
 * See README for Nerd Font icon reference.
 */
readonly icon: string | undefined
```

---

### Step 7: Update README with Nerd Font Icon Reference

**File**: `README.md` (new section after "Configuration")

Create section titled "Icons with Nerd Fonts" with:

1. **Brief intro**: "Commands, menus, and subgroups can include optional icons for visual scanning."
2. **Nerd Font requirement**: "Icons use Nerd Fonts. Install [Nerd Fonts](https://www.nerdfonts.com) on your system."
3. **Fallback behavior**: "If no icon specified, defaults to `•` (larger dot)."
4. **Copy-paste reference table**:

```markdown
| Icon | Name | Use Case |
|------|------|----------|
|  | File | File operations (create, open, save) |
|  | Search | Search/find commands |
|  | Settings | Configuration/preferences |
|  | Build | Build/compile commands |
|  | Terminal | Shell/terminal commands |
|  | Git | Version control |
|  | Comment | Documentation/comments |
|  | Folder | Directory/workspace operations |
| 󰎬 | Debug | Debug/testing |
|  | Package | Dependencies/packages |
```

5. **Example config**:

```json
{
  "kms.bindings": [
    {
      "key": "f",
      "name": "File",
      "icon": "",
      "bindings": [...]
    },
    {
      "key": "s",
      "name": "Search",
      "icon": "",
      "bindings": [...]
    }
  ]
}
```

6. **Link to Nerd Fonts**: https://www.nerdfonts.com/cheat-sheet for full icon reference.

---

### Step 8: Update Relevant Tests

**Files**: 
- `src/test/unit/renderModelService.spec.ts` — add test for icon rendering
- `src/test/unit/whichKeyMenu.spec.ts` — add test for icon display in renderLevel

**New tests**:
1. Test RenderItem with icon present and absent
2. Test renderLevel with icons (verify correct formatting)
3. Test renderLevel fallback to `•` when icon missing

---

## Acceptance Criteria

- ✅ Command type includes optional `icon` field
- ✅ RenderItem type includes optional `icon` field
- ✅ Which-key menu displays icons from BindingGroup/BindingLeaf
- ✅ Search results display icons from Command
- ✅ Fallback to `•` when icon missing
- ✅ All existing tests pass (76 tests)
- ✅ New icon-related tests pass (3+ new tests)
- ✅ README updated with Nerd Font reference and examples
- ✅ JSDoc comments explain icon field purpose
- ✅ No performance regression (<5ms render latency per page)

---

## Implementation Notes

1. **BindingGroup & BindingLeaf already have `icon` fields** — no type changes needed there
2. **Icon rendering is string concatenation** — add to label in whichKeyMenu renderLevel and RenderModelService
3. **Fallback character**: `•` (larger dot, U+2022) when icon missing
4. **Performance**: String concatenation is minimal cost; caching via RenderModelService LRU already handles bulk
5. **Testing**: Extract pure functions for icon rendering (e.g., `formatIconLabel(icon, label)`) to test without Effect machinery

---

## Files to Modify

| File | Change | Lines |
|------|--------|-------|
| `src/domain/types.ts` | Add `icon` to Command | 14-21 |
| `src/domain/types.ts` | Add `icon` to RenderItem | 47-52 |
| `src/services/RenderModelService.ts` | Pass icon in renderItem | 90-110 |
| `src/services/RenderModelService.ts` | Include icon in QuickPick display | 125-140 |
| `src/ui/whichKeyMenu.ts` | Update renderLevel | 44-53 |
| `src/test/unit/renderModelService.spec.ts` | Add icon tests | End of file |
| `src/test/unit/whichKeyMenu.spec.ts` | Add icon tests | End of file |
| `README.md` | Add Nerd Font reference section | After Configuration |

---

## Dependencies

None. This phase is self-contained and doesn't depend on other features.

---

## Estimate

**Effort**: 2–3 hours  
**Risk**: Low (types + rendering, no complex logic)  
**Testing**: 3+ new tests, all existing tests must pass
