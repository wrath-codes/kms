---
title: Command Icons with Nerd Fonts
status: raw
date: 2026-04-28
tags: [ui, visual, nerd-fonts, which-key, search]
---

# Command Icons with Nerd Fonts

## Problem

KMS which-key menus and search results are text-only. Users can't quickly **visually scan** the menu to find what they need. The interface lacks visual appeal.

## Vision

Add optional **Nerd Font icons** to commands, binding groups, and binding leaves. Icons appear in:
- Which-key menu items (alongside key + name)
- Search results (RenderItem display)

Users opt-in by adding an `icon` field to their config. Fallback is a larger dot `•` if no icon provided.

## Core Idea

Users define bindings with icons in their `kms.bindings` or named menus:

```json
{
  "key": "f",
  "name": "File",
  "icon": "",
  "bindings": [...]
}
```

Renders in which-key menu as:

```
 [f]  File
 [s]  Search
 [S]  Settings
```

Where:
- `` = Nerd Font icon (user-defined)
- `[f]` = key binding
- `File` = name

## Scope

1. **Add icon field** to `Command`, `BindingGroup`, `BindingLeaf` types (optional string)
2. **Render icons** in which-key menu (update renderLevel function)
3. **Display icons** in search results (RenderItem rendering)
4. **Fallback behavior** — show `•` if no icon provided
5. **Documentation** — README with Nerd Font copy-paste reference
   - Examples: ` File`, ` Search`, ` Settings`, etc.
   - Link to Nerd Font cheat sheet for discovery

## Why Nerd Fonts?

- Widely adopted in developer communities (Vim, Neovim, terminals)
- Rich icon set (1000+)
- Easy copy-paste (UTF-8 characters)
- No external dependencies
- Better than VS Code codicons (`$(check)` syntax) for this use case

## Success Criteria

- ✅ Icons render in which-key menu alongside key + name
- ✅ Icons render in search results
- ✅ Optional on all items (commands, groups, leaves)
- ✅ Fallback to `•` when missing
- ✅ README has clear, copy-pasteable icon examples
- ✅ All tests pass
- ✅ No performance regression

## Open Questions

- Should icon field appear on `Command` type itself, or only in binding config?
  - **Answer**: Both (Command can have default, binding config can override)
- Icon rendering order: icon first, then key, then name?
  - **Answer**: Yes, `icon [key]  name`
- Size/styling of icon vs text?
  - **Answer**: Same size as text (let Nerd Font handle rendering)

## Related

- FEATURES_IMPLEMENTED.md (Phase 1 complete, Phase 2 feature)
- whichKeyMenu.ts (renderLevel function needs update)
- RenderModelService.ts (RenderItem display needs update)
- types.ts (Command, BindingGroup, BindingLeaf types need icon field)

## Plans

- `.ai-workflow/plans/20260428-command-icons-phase1.md` — Types & Rendering implementation
