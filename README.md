# kms

A lightweight, high-performance which-key menu extension for VS Code.

## Features

- **Hierarchical Navigation** — Unlimited depth menus with keyboard + mouse support
- **Icon Support** — Optional Nerd Font icons for visual scanning
- **Fast Search** — Token-based matching with BM25 ranking for 50k+ commands
- **LRU Caching** — Efficient rendering with memoization
- **Worker Thread** — Off-main-thread index building for large registries

## Configuration

KMS is configured via VS Code settings. Define your menus in `kms.bindings` or `kms.menus`.

### Example: Basic Menu

```json
{
  "kms.bindings": [
    {
      "key": "f",
      "name": "File",
      "icon": "",
      "bindings": [
        { "key": "s", "name": "Save", "command": "workbench.action.files.save" },
        { "key": "n", "name": "New File", "command": "workbench.action.files.newUntitledFile" }
      ]
    },
    {
      "key": "e",
      "name": "Edit",
      "icon": "✏️",
      "bindings": [
        { "key": "f", "name": "Format", "command": "editor.action.formatDocument" }
      ]
    }
  ]
}
```

## Icons with Nerd Fonts

Icons make your menus more visually appealing and scannable. KMS uses **Nerd Fonts** for icons.

### Setup

1. **Install a Nerd Font** on your system:
   - Download from [Nerd Fonts](https://www.nerdfonts.com)
   - Install the font and set it as your terminal/editor font
   - Common choices: Fira Code Nerd Font, Hack Nerd Font, JetBrains Mono Nerd Font

2. **Add icons to your bindings and commands** in VS Code settings:

```json
{
  "kms.bindings": [
    {
      "key": "f",
      "name": "File",
      "icon": "󰊢",
      "bindings": [
        { "key": "s", "name": "Save", "command": "workbench.action.files.save" }
      ]
    },
    {
      "key": "e",
      "name": "Edit",
      "icon": "󰏫",
      "bindings": [
        { "key": "f", "name": "Format", "command": "editor.action.formatDocument" }
      ]
    },
    {
      "key": "s",
      "name": "Search",
      "command": "workbench.action.findInFiles"
    }
  ]
}
```

### Icon Reference

Copy any of these icons into your bindings. See [Nerd Fonts Cheat Sheet](https://www.nerdfonts.com/cheat-sheet) for 10,000+ more icons.

| Icon | Nerd Font Code | Use Case |
|------|---|----------|
| 󰊢 | `󰊢` | File operations (create, open, save, delete) |
| 󰍉 | `󰍉` | Search/find commands |
| 󰒓 | `󰒓` | Settings/configuration/preferences |
| 󰔨 | `󰔨` | Build/compile/make commands |
| 󰆍 | `󰆍` | Shell/terminal/command execution |
| 󰊢 | `󰊢` | Git/version control |
| 󰅲 | `󰅲` | Documentation/comments |
| 󰉋 | `󰉋` | Directory/workspace operations |
| 󰃤 | `󰃤` | Debug/testing/breakpoints |
| 󰏓 | `󰏓` | Dependencies/package manager |
| 󰚀 | `󰚀` | Performance/optimization |
| 󰋽 | `󰋽` | Help/information/docs |
| 󰅙 | `󰅙` | Close/delete/exit |
| 󰄬 | `󰄬` | Confirm/done/success |

### Icon Fallback

If no icon is specified, KMS displays `•` (larger dot) as a fallback:

```json
{
  "key": "e",
  "name": "Edit"
}
```

Result: `•  [e]  Edit` in the menu.

## Usage

1. Run command **`KMS: Which Key`** (`kms.whichKey`)
2. Press a key to navigate or execute
3. Press **Backspace** to go back
4. Press **Escape** to close

### Named Menus

Define multiple named menus and access them with arguments:

```json
{
  "kms.menus": {
    "workspace": {
      "title": "Workspace",
      "bindings": [
        { "key": "p", "name": "Projects", "command": "..." }
      ]
    }
  }
}
```

Then bind a keybinding:

```json
{
  "key": "ctrl+k w",
  "command": "kms.whichKey",
  "args": { "menu": "workspace" }
}
```

## Performance

- **Simple path** (<5k commands): 3–10ms search, <5ms render
- **Advanced path** (50k+ commands): 1–4ms search with BM25 ranking
- **Worker thread**: Off-main-thread index building (115ms for 50k)
- **Caching**: LRU memoization for instant repeated queries

## Architecture

KMS uses:
- **Effect-TS** for type-safe, composable layers
- **Inverted index** with BM25 scoring for advanced search
- **Worker thread** for off-main-thread indexing
- **LRU cache** for render memoization
- **Semaphores** for bounded command concurrency

## License

MIT