# Deployment & Publishing Guide

Complete guide for packaging, versioning, and publishing your VS Code extension to the Marketplace.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Version Management](#version-management)
3. [Building the Extension](#building-the-extension)
4. [Creating a VSIX Package](#creating-a-vsix-package)
5. [Publishing to Marketplace](#publishing-to-marketplace)
6. [Post-Deployment](#post-deployment)
7. [CI/CD Integration](#cicd-integration)

---

## Pre-Deployment Checklist

Before publishing, verify:

- [ ] **All tests pass**: `bun run test`
- [ ] **No console errors**: Open DevTools in test extension window
- [ ] **Code is compiled**: `bun run compile` produces no errors
- [ ] **Coverage is >80%**: `bun run test:unit:coverage`
- [ ] **Documentation is up-to-date**: README.md, CHANGELOG.md
- [ ] **No debug code**: Remove `console.log`, `debugger` statements
- [ ] **Version is incremented**: Updated in `package.json`
- [ ] **License file exists**: LICENSE (MIT recommended)
- [ ] **README is compelling**: Clear description, screenshots, examples
- [ ] **Icons are provided** (optional): `icon.png` (128×128, PNG)

---

## Version Management

### Semantic Versioning

Follow [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH
1.2.3
```

- **MAJOR**: Breaking changes (users must update)
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Updating Version

1. **Update `package.json`**:
   ```json
   {
     "version": "1.2.0"
   }
   ```

2. **Update CHANGELOG.md**:
   ```markdown
   ## [1.2.0] - 2026-02-24

   ### Added
   - New search feature with sub-10ms latency
   - Support for 50k+ commands

   ### Fixed
   - IPC batching now works correctly
   - Fixed memory leak in cache

   ### Changed
   - Upgraded Effect-TS to v3.16
   ```

3. **Commit and tag**:
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: release v1.2.0"
   git tag v1.2.0
   git push origin main --tags
   ```

---

## Building the Extension

### Compile for Production

```bash
# Clean build
rm -rf out/

# Compile with optimizations
bun build src/extension.ts \
  --outdir out \
  --target=node \
  --format=cjs \
  --external=vscode \
  --sourcemap=linked
```

Or use npm script:

```bash
bun run vscode:prepublish
```

### Verify Build Output

```bash
# Check file exists
ls -lh out/extension.js

# Check it's valid CommonJS
head -20 out/extension.js  # should show require() calls

# Estimate size
du -sh out/
```

**Target**: <5MB uncompressed.

---

## Creating a VSIX Package

### Install VSCE

```bash
npm install -g @vscode/vsce
```

Or use local copy:

```bash
npx @vscode/vsce
```

### Create `.vscodeignore`

This file excludes unnecessary files from the package.

```
# .vscodeignore

# Source code (not needed after compilation)
src/
test/
*.ts
*.spec.ts
*.test.ts

# Config files
vitest.config.ts
.vscode-test.mjs
bunfig.toml
tsconfig.json

# Git files
.git/
.gitignore
.github/

# Build artifacts
*.map
out/
dist/

# Dependencies (already resolved)
node_modules/

# Documentation (optional; include if small)
# README.md kept for Marketplace display

# Dev files
coverage/
.vscode/
.prettierrc
.eslintrc.json
```

### Create Package

```bash
# Generate VSIX package
vsce package

# Output: my-extension-1.2.0.vsix (typically 500KB–2MB)
```

### Validate Package

```bash
# Check contents
unzip -l my-extension-1.2.0.vsix | head -30

# Verify no node_modules
unzip -l my-extension-1.2.0.vsix | grep node_modules
# Should be empty or minimal

# Check file size
ls -lh my-extension-1.2.0.vsix
```

---

## Publishing to Marketplace

### Create Publisher Account

1. **Go to [Azure DevOps](https://dev.azure.com)**
2. **Create a new organization** (if needed)
3. **Create a Personal Access Token (PAT)**:
   - User Settings → Personal access tokens
   - New token
   - Scopes: `Marketplace (publish)`
   - Expiration: 1 year
   - Copy the token (you won't see it again)

### Update `package.json`

```json
{
  "name": "my-extension",
  "displayName": "My Beautiful Extension",
  "publisher": "your-publisher-name",
  "version": "1.2.0",
  "description": "Brief description here",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/your-repo"
  },
  "bugs": {
    "url": "https://github.com/your-org/your-repo/issues"
  },
  "homepage": "https://github.com/your-org/your-repo#readme",
  "engines": {
    "vscode": "^1.90.0"
  },
  "categories": [
    "Keymaps",
    "Other"
  ],
  "keywords": [
    "which-key",
    "keybindings",
    "vim",
    "navigation"
  ]
}
```

### Publish

```bash
# Publish to Marketplace
vsce publish --pat <your-pat>

# Or from environment variable
VSCE_PAT=<your-pat> vsce publish

# Pre-release version
vsce publish --pre --pat <your-pat>
```

**Output**:
```
Publishing your-publisher-name/my-extension@1.2.0...
✓ Packaged and published successfully.
Visit: https://marketplace.visualstudio.com/items?itemName=your-publisher-name.my-extension
```

### Verify on Marketplace

1. Go to [VS Code Marketplace](https://marketplace.visualstudio.com)
2. Search for your extension name
3. Check:
   - Description displays correctly
   - Screenshots visible (if added)
   - Versions listed correctly
   - Installation count updates

---

## Post-Deployment

### Announce Release

1. **GitHub Release**:
   ```bash
   gh release create v1.2.0 \
     --title "Release v1.2.0: Major Performance Improvements" \
     --notes "See CHANGELOG.md for details"
   ```

2. **Social Media** (optional):
   - Tweet about the release
   - Post on Mastodon, Discord, etc.

3. **Email Subscribers** (if applicable):
   - Notify users who opted in for updates

### Monitor Issues

- Watch GitHub Issues for bug reports
- Check [VS Code Issues](https://github.com/microsoft/vscode/issues) for related bugs
- Monitor extension marketplace reviews/ratings

### Gather Telemetry (Optional)

```typescript
// Track usage (respect privacy, get user consent)
vscode.commands.executeCommand("setContext", "extension.version", "1.2.0")

// Log events (use an analytics service like Mixpanel, if allowed)
const event = {
  event: "extension_activated",
  version: "1.2.0",
  timestamp: new Date().toISOString()
}
```

---

## CI/CD Integration

### Automated Publishing Workflow

Create `.github/workflows/publish.yml`:

```yaml
name: Publish Extension

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'

      - name: Install Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run tests
        run: bun run test

      - name: Build
        run: bun run compile

      - name: Create VSIX
        run: npx @vscode/vsce package

      - name: Publish to Marketplace
        run: npx @vscode/vsce publish --pat ${{ secrets.VSCE_PAT }}

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: '*.vsix'
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Automatic Version Bumping

Use [Standard Version](https://github.com/conventional-changelog/standard-version):

```bash
# Install
npm install -g standard-version

# Generate changelog and bump version
standard-version

# Push
git push --follow-tags origin main
```

This automatically:
- Increments version based on commits (feat → minor, fix → patch)
- Generates CHANGELOG.md
- Creates git tag

---

## Troubleshooting Deployment

### "VSIX file is too large (>10MB)"

**Cause**: Unnecessary files included.

**Fix**:
1. Update `.vscodeignore`:
   ```
   node_modules/
   coverage/
   .git/
   src/
   ```

2. Minify build:
   ```bash
   bun build src/extension.ts --outdir out --minify
   ```

3. Check what's in the package:
   ```bash
   unzip -l my-extension.vsix | sort -k4 -n | tail -20
   ```

---

### "401 Unauthorized: The token has expired"

**Cause**: PAT expired or incorrect.

**Fix**:
1. Generate new PAT on Azure DevOps
2. Update secret on GitHub:
   - Settings → Secrets → Update `VSCE_PAT`

---

### "Publisher not found"

**Cause**: Publisher name in `package.json` doesn't match PAT owner.

**Fix**:
1. Check publisher name:
   ```bash
   vsce publishers
   ```

2. Update `package.json` to match

---

### "Extension not compatible"

**Cause**: Target VS Code version is too old or has breaking changes.

**Fix**:
1. Update `engines.vscode` in `package.json`:
   ```json
   {
     "engines": {
       "vscode": "^1.90.0"
     }
   }
   ```

2. Test with that VS Code version:
   ```javascript
   // .vscode-test.mjs
   version: "1.90.0"  // or "insiders"
   ```

---

## Version History Management

### Deprecate Old Versions

When releasing a breaking change:

1. **Publish new major version** (e.g., v2.0.0)
2. **Mark old version as deprecated** (on Marketplace UI):
   - Edit listing
   - Check "Deprecated" checkbox
   - Add note: "This version is deprecated. Please upgrade to v2.0."

### Long-Term Support (LTS)

If supporting multiple major versions:

```bash
# Publish on v1 branch
git checkout v1
git tag v1.2.3
vsce publish --pat <pat>

# Continue on main with v2
git checkout main
git tag v2.0.0
vsce publish --pat <pat>
```

---

## Best Practices

### Pre-Release Versions

Test before public release:

```bash
# Create a pre-release version
vsce publish 1.2.0-beta.1 --pre --pat <pat>

# Increment for bug fixes
vsce publish 1.2.0-beta.2 --pre --pat <pat>

# Release final version
vsce publish 1.2.0 --pat <pat>
```

### Changelog Format

```markdown
## [1.2.0] - 2026-02-24

### Added
- Support for 50k+ commands with sub-10ms search (PR #42)
- New inverted index for fast text search
- Worker thread for background indexing

### Changed
- Upgraded Effect-TS from v3.14 to v3.16 (PR #40)
- Refactored DispatchQueue for better performance

### Fixed
- IPC batching not working with rapid keypresses (Issue #38)
- Memory leak in RenderModelService cache (Issue #39)

### Deprecated
- Old `setContext` API (use `ContextService` instead)

### Removed
- Legacy QuickPick integration (replaced with modern version)

### Security
- Updated dependencies to patch XSS vulnerability in transitive dependency

[Full Changelog](https://github.com/your-org/your-repo/compare/v1.1.0...v1.2.0)
```

---

## Rollback Procedure

If a release has critical bugs:

```bash
# 1. Revert commits
git revert HEAD

# 2. Bump to patch version
npm version patch

# 3. Publish fixed version
vsce publish --pat <pat>

# 4. Mark broken version as deprecated
# (Do this on Marketplace UI manually, or via API)
```

---

## Marketplace Best Practices

### Screenshot Tips

- Show the extension in action (QuickPick, search results)
- Include before/after screenshots
- Use VS Code's default theme or popular themes
- Resolution: 1024×768 or larger
- Annotate with arrows/text explaining features

### README Tips

```markdown
# My Extension

Brief one-liner description.

## Features

- ✨ Feature 1 with benefit
- ⚡ Feature 2 with benefit  
- 🚀 Feature 3 with benefit

## Installation

Cmd+Shift+P → "Install Extensions" → search "my-extension"

## Quick Start

1. Press Cmd+Shift+P
2. Run "My Extension: Do Something"
3. See results!

## Configuration

Available settings:

```json
{
  "my-extension.delay": 100,
  "my-extension.showIcons": true
}
```

## Performance

Search latency: <100ms (even with 50k+ commands)
Memory usage: ~20MB

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT
```

---

## Maintenance & Updates

### Monthly Checks

- [ ] Check for security updates in dependencies
- [ ] Monitor GitHub Issues and Marketplace reviews
- [ ] Update Effect-TS and other key dependencies
- [ ] Run full test suite on latest VS Code insiders

### Release Cadence

Recommend:
- **Patch releases**: Monthly or as needed for bugs
- **Minor releases**: Quarterly (new features)
- **Major releases**: Annually or as needed (breaking changes)

---

**Last updated**: 2026-02-24
