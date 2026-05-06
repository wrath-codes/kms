# Icon Rendering & RenderItem Analysis

## Summary
This document maps all icon rendering, QuickPick display, BindingNode rendering, and RenderItem construction in the KMS codebase.

---

## 1. Icon Rendering Patterns

### Pattern: Codicon Strings (VS Code Format)
Icons are rendered using **VS Code Codicon syntax** (e.g., `$(key)`, `$(file-directory)`) prepended to labels rather than using the `iconPath` property.

#### Where Icons Are Used:
1. **RenderModelService** — Search results with keybindings
2. **WhichKeyMenu** — Binding tree navigation menu

---

## 2. RenderItem Definition & Usage

### Definition
**File:** [src/domain/types.ts#L47-L52](file:///Users/wrath/projects/kms/src/domain/types.ts#L47-L52)

```typescript
export class RenderItem extends Data.Class<{
  readonly label: string
  readonly description: string | undefined
  readonly detail: string | undefined
  readonly command: Command
}> {}
```

**Usage in RenderModel:**
- **File:** [src/domain/types.ts#L54-L58](file:///Users/wrath/projects/kms/src/domain/types.ts#L54-L58)
- `RenderModel` contains an array of `RenderItem[]` that represents paginated search results

### RenderItem Construction via toRenderItem()
**File:** [src/services/RenderModelService.ts#L11-L19](file:///Users/wrath/projects/kms/src/services/RenderModelService.ts#L11-L19)

```typescript
export const toRenderItem = (result: SearchResult): RenderItem =>
  new RenderItem({
    label: result.command.keybinding
      ? `$(key) ${result.command.label}`        // Icon: $(key)
      : result.command.label,
    description: result.command.category,       // Category from command
    detail: result.command.description,         // Command description
    command: result.command,
  })
```

**Key Points:**
- **Label construction:** If command has a keybinding, prepend `$(key)` icon
- **Description:** Maps to `command.category`
- **Detail:** Maps to `command.description`
- **Icon field:** Uses Codicon string `$(key)` in the label itself

### RenderItem Usage in Render Pipeline
**File:** [src/services/RenderModelService.ts#L97-L114](file:///Users/wrath/projects/kms/src/services/RenderModelService.ts#L97-L114)
```typescript
const items = results.map(toRenderItem)
const model = new RenderModel({ items, version, query })
```

**Pagination:**
**File:** [src/services/RenderModelService.ts#L115-L134](file:///Users/wrath/projects/kms/src/services/RenderModelService.ts#L115-L134)
```typescript
renderPage: (results: readonly SearchResult[], query: string, version: number, page: number) =>
  Effect.gen(function* () {
    const cacheKey = `${version}:${query}:p${page}`
    const cache = yield* Ref.get(cacheRef)
    
    const cached = cache.get(cacheKey)
    if (cached !== undefined) return cached
    
    const start = page * PAGE_SIZE
    const pageResults = results.slice(start, start + PAGE_SIZE)
    const items = pageResults.map(toRenderItem)  // Converts slice to RenderItems
    const model = new RenderModel({ items, version, query })
```

---

## 3. BindingNode Rendering (WhichKeyMenu)

### BindingNode Type Definition
**File:** [src/domain/types.ts#L98-L113](file:///Users/wrath/projects/kms/src/domain/types.ts#L98-L113)

#### BindingGroup
```typescript
export class BindingGroup extends Data.Class<{
  readonly key: string
  readonly name: string
  readonly icon: string | undefined        // Optional icon field
  readonly bindings: readonly BindingNode[]
}> {}
```

#### BindingLeaf
```typescript
export class BindingLeaf extends Data.Class<{
  readonly key: string
  readonly name: string
  readonly icon: string | undefined        // Optional icon field
  readonly command: string
  readonly args: readonly unknown[] | undefined
}> {}
```

### WhichKeyItem Interface
**File:** [src/ui/whichKeyMenu.ts#L11-L13](file:///Users/wrath/projects/kms/src/ui/whichKeyMenu.ts#L11-L13)

```typescript
interface WhichKeyItem extends vscode.QuickPickItem {
  readonly node: BindingNode
}
```

Extends VS Code's `QuickPickItem` with:
- `label` - display text (from renderLevel)
- `description` - additional info (from renderLevel)
- `node` - reference to the BindingNode

### renderLevel() — Core Rendering Function
**File:** [src/ui/whichKeyMenu.ts#L44-L53](file:///Users/wrath/projects/kms/src/ui/whichKeyMenu.ts#L44-L53)

```typescript
const renderLevel = (nodes: readonly BindingNode[]): WhichKeyItem[] =>
  nodes.map((node) => {
    const prefix = node.icon ? `${node.icon} [${node.key}]` : `[${node.key}]`
    const isGroup = node instanceof BindingGroup
    return {
      label: `${prefix}  ${node.name}`,
      description: isGroup ? "→" : undefined,
      node,
    }
  })
```

**Label Construction Logic:**
1. If `node.icon` exists: `${node.icon} [${node.key}]`
2. Otherwise: `[${node.key}]`
3. Final label: `${prefix}  ${node.name}`
4. Example outputs:
   - With icon: `$(folder) [d]  Directory`
   - Without icon: `[d]  Directory`

**Description Logic:**
- Groups (BindingGroup): `→` (indicates submenu)
- Leaves (BindingLeaf): `undefined` (no description)

### parseBindings() — Configuration Parsing
**File:** [src/ui/whichKeyMenu.ts#L19-L38](file:///Users/wrath/projects/kms/src/ui/whichKeyMenu.ts#L19-L38)

```typescript
const parseBindings = (raw: unknown): BindingNode[] => {
  if (!Array.isArray(raw)) return []
  return raw.map((entry: any): BindingNode => {
    if (Array.isArray(entry.bindings)) {
      return new BindingGroup({
        key: String(entry.key ?? ""),
        name: String(entry.name ?? ""),
        icon: entry.icon ?? undefined,      // Icon from config
        bindings: parseBindings(entry.bindings),
      })
    }
    return new BindingLeaf({
      key: String(entry.key ?? ""),
      name: String(entry.name ?? ""),
      icon: entry.icon ?? undefined,        // Icon from config
      command: String(entry.command ?? ""),
      args: entry.args ?? undefined,
    })
  })
}
```

**Icon Source:**
- Parsed from JSON configuration (`entry.icon` field)
- Expected to be VS Code Codicon strings like `$(folder)`, `$(symbol-method)`, etc.

---

## 4. QuickPick Integration

### QuickPick Creation & Configuration
**File:** [src/ui/whichKeyMenu.ts#L109-L119](file:///Users/wrath/projects/kms/src/ui/whichKeyMenu.ts#L109-L119)

```typescript
const qp = vscode.window.createQuickPick<WhichKeyItem>()
qp.placeholder = "Press a key… (Backspace to go back)"
qp.matchOnDescription = false
qp.matchOnDetail = false

const renderCurrent = () => {
  const breadcrumb = stack.map((s) => s.title).concat(currentTitle).join(" › ")
  qp.title = breadcrumb
  qp.items = renderLevel(currentNodes)  // Renders items via renderLevel
  qp.value = ""
}
```

**Configuration:**
- **Type:** `QuickPick<WhichKeyItem>`
- **Placeholder:** "Press a key… (Backspace to go back)"
- **Matching:** Disabled for description and detail
- **Items:** Populated from `renderLevel(currentNodes)`
- **Title:** Breadcrumb navigation (`KMS › File › Save`)

### Navigation via onDidChangeValue
**File:** [src/ui/whichKeyMenu.ts#L152-L181](file:///Users/wrath/projects/kms/src/ui/whichKeyMenu.ts#L152-L181)

```typescript
qp.onDidChangeValue((value) => {
  if (value === "") {
    if (ignoreNextEmpty) {
      ignoreNextEmpty = false
      return
    }
    // Backspace handling — navigate back
    if (stack.length > 0) {
      ignoreNextEmpty = true
      goBack()
    }
    return
  }

  const key = value.slice(-1)
  const match = currentNodes.find((n) => n.key === key)

  if (match) {
    if (match instanceof BindingGroup) {
      ignoreNextEmpty = true
      navigateTo(match)  // Load submenu, calls renderCurrent()
    } else if (match instanceof BindingLeaf) {
      executeLeaf(match)  // Execute command
    }
  } else {
    // No matching key
    ignoreNextEmpty = true
    qp.value = ""
  }
})
```

### Item Selection via onDidAccept
**File:** [src/ui/whichKeyMenu.ts#L184-L193](file:///Users/wrath/projects/kms/src/ui/whichKeyMenu.ts#L184-L193)

```typescript
qp.onDidAccept(() => {
  const selected = qp.selectedItems[0]
  if (!selected) return
  if (selected.node instanceof BindingGroup) {
    ignoreNextEmpty = true
    navigateTo(selected.node)
  } else if (selected.node instanceof BindingLeaf) {
    executeLeaf(selected.node)
  }
})
```

---

## 5. Existing Icon Field Usage

### Current Icon Implementation Status
- **BindingGroup.icon** — Optional field (string | undefined)
- **BindingLeaf.icon** — Optional field (string | undefined)
- **RenderItem** — **No icon field**; icons embedded in label as Codicon strings

### Icon Sources
1. **Configuration (whichKeyMenu):**
   - Read from JSON settings: `entry.icon`
   - Used in `renderLevel()` to construct labels
   - Format: VS Code Codicon strings (e.g., `$(folder)`, `$(symbol-method)`)

2. **Search Results (RenderModelService):**
   - No source icon field in Command type
   - Icon is injected based on keybinding presence (`$(key)`)
   - Format: Hardcoded Codicon string `$(key)`

### Codicon String Usage
**Pattern:** `$(identifier)`

**Known Usage:**
- `$(key)` — Indicates command has a keybinding (search results)
- Custom icons in binding tree — parsed from config

---

## 6. Test Coverage

### RenderModelService Tests
**File:** [src/test/unit/renderModelService.spec.ts](file:///Users/wrath/projects/kms/src/test/unit/renderModelService.spec.ts)

#### Test: Basic command rendering (no icon)
**Lines 25-29**
```typescript
it("renders basic command", () => {
  const result = makeResult("Format", 1)
  const item = toRenderItem(result)
  expect(item.label).toBe("Format")
})
```

#### Test: Keybinding with icon
**Lines 31-35**
```typescript
it("renders command with keybinding", () => {
  const result = makeResult("Format", 1, { keybinding: "Ctrl+F" })
  const item = toRenderItem(result)
  expect(item.label).toBe("$(key) Format")  // Icon injected
})
```

#### Test: Category as description
**Lines 37-41**
```typescript
it("includes category as description", () => {
  const result = makeResult("Format", 1, { category: "Editor" })
  const item = toRenderItem(result)
  expect(item.description).toBe("Editor")
})
```

---

## 7. Data Flow Diagrams

### Search Result → RenderItem → QuickPick
```
SearchResult
  └─ Command (label, keybinding, category, description)
      └─ toRenderItem()
          └─ RenderItem
              ├─ label: "$(key) ${command.label}" (if keybinding)
              ├─ description: command.category
              ├─ detail: command.description
              └─ command: Command
              
              └─ Used in RenderModel.items[]
                  └─ Displayed in QuickPick
```

### Configuration → BindingNode → WhichKeyItem → QuickPick
```
JSON Config (kms.bindings or kms.menus[menuId].bindings)
  └─ parseBindings()
      └─ BindingGroup | BindingLeaf (with icon, key, name)
          └─ renderLevel()
              └─ WhichKeyItem
                  ├─ label: "${node.icon} [${node.key}]  ${node.name}"
                  ├─ description: "→" (for groups) | undefined (for leaves)
                  └─ node: BindingNode
                  
                  └─ Displayed in QuickPick
                      └─ onDidChangeValue() / onDidAccept()
                          └─ Navigate or Execute
```

---

## 8. Key Code Locations Reference

| Feature | File | Lines |
|---------|------|-------|
| RenderItem type | src/domain/types.ts | 47-52 |
| BindingGroup type | src/domain/types.ts | 100-105 |
| BindingLeaf type | src/domain/types.ts | 107-113 |
| toRenderItem() | src/services/RenderModelService.ts | 11-19 |
| Icon injection (keybinding) | src/services/RenderModelService.ts | 13-14 |
| RenderModelService.render() | src/services/RenderModelService.ts | 97-114 |
| RenderModelService.renderPage() | src/services/RenderModelService.ts | 115-134 |
| WhichKeyItem interface | src/ui/whichKeyMenu.ts | 11-13 |
| parseBindings() | src/ui/whichKeyMenu.ts | 19-38 |
| Icon field parsing | src/ui/whichKeyMenu.ts | 26, 33 |
| renderLevel() | src/ui/whichKeyMenu.ts | 44-53 |
| Icon label construction | src/ui/whichKeyMenu.ts | 46 |
| QuickPick creation | src/ui/whichKeyMenu.ts | 109-119 |
| renderCurrent() | src/ui/whichKeyMenu.ts | 114-119 |
| onDidChangeValue() | src/ui/whichKeyMenu.ts | 152-181 |
| onDidAccept() | src/ui/whichKeyMenu.ts | 184-193 |
| onDidHide() cleanup | src/ui/whichKeyMenu.ts | 196-210 |
| Test: basic render | src/test/unit/renderModelService.spec.ts | 25-29 |
| Test: keybinding icon | src/test/unit/renderModelService.spec.ts | 31-35 |
| Test: description mapping | src/test/unit/renderModelService.spec.ts | 37-41 |

---

## 9. Current Limitations & Observations

1. **RenderItem has no icon field** — Icons are embedded in labels as Codicon strings
2. **Icons in search results are hardcoded** — Only `$(key)` based on keybinding presence
3. **No custom icons for Commands** — Command type has no icon field; cannot assign custom icons to search results
4. **BindingNode icons are configuration-driven** — Good separation of concerns for menu structure
5. **Icon rendering pattern** — Uses Codicon strings consistently across both search and menu UI

---

## 10. Configuration Example

Example JSON configuration with icons:

```json
{
  "kms.bindings": [
    {
      "key": "f",
      "name": "File",
      "icon": "$(folder)",
      "bindings": [
        {
          "key": "s",
          "name": "Save",
          "icon": "$(save)",
          "command": "workbench.action.files.save"
        }
      ]
    }
  ]
}
```

**Rendered in menu:**
```
$(folder) [f]  File  →
$(save) [s]  Save
```
