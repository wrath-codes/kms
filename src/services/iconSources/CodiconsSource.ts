import { IconSource, IconResult } from "../IconService"

/**
 * VS Code Codicons icon source.
 *
 * Supports both formats:
 * - Direct syntax: "check", "file", "folder"
 * - VSCode syntax: "$(check)", "$(file)", "$(folder)"
 *
 * Validates against a curated set of known codicons.
 * Theme-aware: respects VS Code light/dark mode.
 *
 * Priority: 5 (higher than Nerd Fonts, so codicons are tried first).
 *
 * Reference: https://github.com/microsoft/vscode-codicons
 */
export const CodiconsSource: IconSource = {
  id: "codicons",
  name: "VS Code Codicons",
  priority: 5,
  supportsTheme: true,

  resolve: (iconName: string): IconResult | null => {
    if (!iconName || !iconName.trim()) return null

    // Extract codicon name from both formats
    const match = iconName.match(/^\$\(([^)]+)\)$/)
    const codiconName = match ? match[1] : iconName.trim()

    // Validate against known codicons
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

// Curated list of common VS Code codicons
// Reference: https://github.com/microsoft/vscode-codicons/blob/main/src/index.ts
const KNOWN_CODICONS = new Set([
  // Files & folders
  "file",
  "file-add",
  "file-directory",
  "file-symlink-directory",
  "file-symlink-file",
  "file-text",
  "file-binary",
  "file-pdf",
  "file-zip",
  "folder",
  "folder-open",
  "folder-active",

  // Common operations
  "add",
  "plus",
  "close",
  "x",
  "remove",
  "minus",
  "edit",
  "pencil",
  "check",
  "verified",
  "close-all",
  "clear-all",
  "delete",
  "trash",
  "unchecked",
  "circle-large",
  "circle-outline",

  // Search & replace
  "search",
  "find",
  "find-replace",
  "replace",
  "case-sensitive",
  "regex",
  "whole-word",

  // Navigation
  "arrow-left",
  "arrow-right",
  "arrow-up",
  "arrow-down",
  "chevron-left",
  "chevron-right",
  "chevron-up",
  "chevron-down",
  "breadcrumb-separator",
  "back",
  "forward",

  // Settings & config
  "settings",
  "settings-gear",
  "gear",
  "configure",
  "extensions",
  "extensions-install",
  "extensions-manage",
  "terminal",
  "code",

  // Source control
  "git-branch",
  "git-commit",
  "git-compare",
  "git-merge",
  "git-pull",
  "git-push",
  "git-stash",
  "git-status",
  "git-untracked",
  "git-ignore",

  // Debug & test
  "debug",
  "debug-breakpoint",
  "debug-breakpoint-conditional",
  "debug-breakpoint-log",
  "debug-breakpoint-unsupported",
  "debug-continue",
  "debug-console",
  "debug-disconnect",
  "debug-pause",
  "debug-restart",
  "debug-run",
  "debug-start",
  "debug-step-into",
  "debug-step-out",
  "debug-step-over",
  "debug-stop",
  "test-view-icon",
  "testing-cancel-icon",
  "testing-check-icon",
  "testing-debug-icon",
  "testing-error-icon",
  "testing-failed-icon",
  "testing-passed-icon",
  "testing-queued-icon",
  "testing-show-as-list-icon",
  "testing-skipped-icon",
  "testing-unset-icon",

  // Notifications & alerts
  "issue",
  "issue-draft",
  "issue-reopened",
  "warning",
  "error",
  "info",
  "bell",
  "bell-dot",
  "inbox",
  "inbox-close",

  // Server & sync
  "server",
  "server-environment",
  "server-process",
  "sync",
  "sync-ignored",
  "cloud",
  "cloud-download",
  "cloud-upload",

  // Tool & action icons
  "tools",
  "lightbulb",
  "lightbulb-autofix",
  "comment",
  "comment-add",
  "comment-discussion",
  "comment-unresolved",
  "comment-draft",
  "comment-old",

  // Access control
  "shield",
  "shield-check",
  "account",
  "accounts",
  "person",
  "person-add",
  "person-follow",
  "group",
  "organization",
  "organization-filled",

  // Performance & build
  "performance",
  "zap",
  "flame",
  "rocket",
  "fire",
  "bolt",
  "hammer",
  "wrench",
  "microscope",
  "beaker",

  // Documentation & help
  "book",
  "bookmark",
  "bookmark-slash",
  "bookmark-outline",
  "briefcase",
  "document",
  "report",
  "note",
  "notes",
  "note-outline",
  "note-add",
  "help",
  "question",
  "info-icon",
  "circle-info",
])
