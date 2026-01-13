# Konveyor Extension Generator - Usage Guide

A CLI tool to automate the creation of new language extensions for the Konveyor editor-extensions project.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Command Line Options](#command-line-options)
- [Configuration File](#configuration-file)
- [Interactive Mode](#interactive-mode)
- [Workflow Examples](#workflow-examples)
- [Provider Types](#provider-types)
- [Generated Files](#generated-files)

---

## Installation

### Prerequisites

- Node.js 18+
- npm
- Git
- A local clone of the [editor-extensions](https://github.com/konveyor/editor-extensions) repository

### Setup

```bash
# Clone the extension generator
git clone https://github.com/savitharaghunathan/extension-generator.git
cd extension-generator

# Install dependencies
npm install

# Build the project
npm run build
```

---

## Quick Start

### Option 1: Using a Configuration File

```bash
# Preview changes (dry run)
node dist/index.js --config configs/sample-python.json --repo /path/to/editor-extensions --dry-run

# Generate the extension
node dist/index.js --config configs/sample-python.json --repo /path/to/editor-extensions
```

### Option 2: Interactive Mode

```bash
node dist/index.js --interactive --repo /path/to/editor-extensions
```

---

## Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--config <path>` | `-c` | Path to configuration file (JSON/YAML) | - |
| `--interactive` | `-i` | Run in interactive mode with prompts | `false` |
| `--repo <path>` | `-r` | Path to editor-extensions repository | `./editor-extensions` |
| `--branch <name>` | `-b` | Branch name for changes | `feature/{language}-extension` |
| `--base-branch <name>` | | Base branch to create from | `main` |
| `--dry-run` | `-d` | Preview changes without modifying files | `false` |
| `--force` | `-f` | Overwrite existing extension files | `false` |
| `--no-commit` | | Skip git commit after generation | `false` |
| `--push` | | Push branch to remote after generation | `false` |
| `--create-pr` | | Create a pull request (requires `--push` and `gh` CLI) | `false` |
| `--version` | `-V` | Show version number | - |
| `--help` | `-h` | Show help | - |

### Examples

```bash
# Dry run with custom branch name
node dist/index.js -c config.json -r ../editor-extensions -b feature/my-extension --dry-run

# Generate and push to remote
node dist/index.js -c config.json -r ../editor-extensions --push

# Generate, push, and create PR
node dist/index.js -c config.json -r ../editor-extensions --push --create-pr

# Force overwrite existing extension
node dist/index.js -c config.json -r ../editor-extensions --force

# Skip git commit (useful for manual review)
node dist/index.js -c config.json -r ../editor-extensions --no-commit
```

---

## Configuration File

Configuration files can be JSON or YAML format.

### Full Configuration Schema

```json
{
  "language": "python",
  "displayName": "Python",
  "languageId": "python",

  "activation": {
    "fileExtensions": [".py", ".pyw"],
    "filePatterns": ["*.py", "*.pyw"],
    "workspaceContains": ["requirements.txt", "pyproject.toml"],
    "additionalLanguageIds": ["jupyter"]
  },

  "provider": {
    "type": "generic",
    "binaryName": "generic-external-provider",
    "binaryArgs": ["-name", "python", "-socket"],
    "assetSource": {
      "repository": "konveyor/kai",
      "releaseTag": "v0.8.0-beta.5",
      "assetNamePattern": "generic-external-provider-{platform}"
    },
    "platforms": [
      { "os": "linux", "arch": "x64" },
      { "os": "linux", "arch": "arm64" },
      { "os": "darwin", "arch": "x64" },
      { "os": "darwin", "arch": "arm64" },
      { "os": "win32", "arch": "x64", "binaryExtension": ".exe" }
    ]
  },

  "lsp": {
    "enabled": true,
    "proxyRequired": true,
    "providerName": "python",
    "socketType": "unix"
  },

  "dependencies": {
    "vscodeExtensions": ["ms-python.python"],
    "runtimeCheck": {
      "command": "python3 --version",
      "versionPattern": "Python (\\d+\\.\\d+\\.\\d+)",
      "minVersion": "3.8.0"
    },
    "tools": []
  },

  "providerSpecificConfig": {
    "lspServerName": "python"
  },

  "analysis": {
    "mode": "source-only",
    "contextLines": 10
  }
}
```

### Required Fields

| Field | Description | Example |
|-------|-------------|---------|
| `language` | Lowercase identifier (alphanumeric, hyphens) | `"python"`, `"c-sharp"` |
| `displayName` | Human-readable name | `"Python"`, `"C#"` |
| `languageId` | VS Code language identifier | `"python"`, `"csharp"` |
| `activation.fileExtensions` | File extensions to activate on | `[".py", ".pyw"]` |
| `provider.type` | Provider type | `"generic"`, `"standalone"`, `"custom"` |
| `provider.binaryName` | Provider binary name | `"generic-external-provider"` |
| `lsp.enabled` | Whether LSP is used | `true`, `false` |

### Optional Fields with Defaults

| Field | Default | Description |
|-------|---------|-------------|
| `activation.workspaceContains` | `[]` | Files that trigger workspace activation |
| `provider.binaryArgs` | `[]` | CLI arguments for the provider |
| `provider.platforms` | All platforms | Supported OS/arch combinations |
| `provider.assetSource` | Read from repo | GitHub release info for binaries |
| `lsp.proxyRequired` | `false` | Whether JSON-RPC proxy is needed |
| `lsp.socketType` | `"unix"` | Socket type: `unix`, `tcp`, `pipe` |
| `dependencies.vscodeExtensions` | `[]` | Required VS Code extensions |
| `analysis.mode` | `"source-only"` | Analysis mode |
| `analysis.contextLines` | `10` | Context lines for analysis |

---

## Interactive Mode

Interactive mode guides you through configuration with prompts.

```bash
node dist/index.js --interactive --repo /path/to/editor-extensions
```

### Prompts

1. **Basic Information**
   - Language identifier (e.g., `python`, `rust`, `cpp`)
   - Display name (e.g., `Python`, `Rust`, `C++`)
   - VS Code language ID

2. **Activation Configuration**
   - File extensions (comma-separated)
   - Workspace indicator files
   - Additional language IDs

3. **Provider Configuration**
   - Provider type (Generic, Standalone, Custom)
   - Binary name
   - CLI arguments

4. **Asset Source**
   - GitHub repository (defaults to repo config)
   - Release tag (defaults to repo config)

5. **LSP Configuration**
   - LSP support type (Proxy, Direct, None)
   - Provider name

6. **Dependencies**
   - Required VS Code extensions
   - Runtime check command
   - Minimum version

7. **Platforms**
   - Select supported platforms (Linux, macOS, Windows)

### Example Session

```
  Konveyor Extension Generator v0.1.0

Interactive Configuration

Reading configuration from /path/to/editor-extensions...
  Release tag: v0.8.0-beta.5

? Language identifier (e.g., python, rust, cpp): golang
? Display name: Go
? VS Code language ID: go
? File extensions (comma-separated, e.g., .py, .pyw): .go
? Workspace indicator files (comma-separated, or empty): go.mod, go.sum
? Provider type: Generic (uses generic-external-provider with LSP)
? Provider binary name: generic-external-provider
? CLI arguments for provider: -name, go, -socket
? GitHub repository for provider assets: konveyor/kai
? Release tag for assets: v0.8.0-beta.5
? Language Server Protocol support: Yes (with JSON-RPC proxy)
? LSP provider name: go
? Required VS Code extensions: golang.go
? Runtime check command: go version
? Minimum required version: 1.21.0
? Supported platforms: Linux x64, Linux ARM64, macOS x64, macOS ARM64, Windows x64

Configuration Summary:
────────────────────────────────────────
{ ... }
────────────────────────────────────────

? Proceed with extension generation? Yes
```

---

## Workflow Examples

### 1. Create a New Extension (Full Workflow)

```bash
# Step 1: Preview changes
node dist/index.js -c my-extension.json -r ../editor-extensions --dry-run

# Step 2: Generate files
node dist/index.js -c my-extension.json -r ../editor-extensions

# Step 3: Review changes
cd ../editor-extensions
git status
git diff

# Step 4: Build and test
npm install
npm run build
npm run package-mylang

# Step 5: Push and create PR
git push -u origin feature/mylang-extension
gh pr create
```

### 2. Quick Generation with Auto-PR

```bash
node dist/index.js -c my-extension.json -r ../editor-extensions --push --create-pr
```

### 3. Development Workflow (No Commit)

```bash
# Generate without committing (for manual review/tweaks)
node dist/index.js -c my-extension.json -r ../editor-extensions --no-commit

# Make manual adjustments
cd ../editor-extensions
# ... edit files ...

# Commit manually
git add .
git commit -m "Add MyLang extension"
```

### 4. Regenerate Existing Extension

```bash
# Use --force to overwrite existing files
node dist/index.js -c my-extension.json -r ../editor-extensions --force
```

---

## Provider Types

### Generic Provider

Uses `generic-external-provider` with LSP proxy support. Best for languages with existing LSP servers.

```json
{
  "provider": {
    "type": "generic",
    "binaryName": "generic-external-provider",
    "binaryArgs": ["-name", "python", "-socket"]
  },
  "lsp": {
    "enabled": true,
    "proxyRequired": true
  }
}
```

**Use when:**
- Language has a standard LSP server
- You want to use the shared generic provider infrastructure

### Standalone Provider

Custom provider binary without LSP proxy. The provider handles all communication directly.

```json
{
  "provider": {
    "type": "standalone",
    "binaryName": "rust-analyzer-provider",
    "binaryArgs": ["--socket"]
  },
  "lsp": {
    "enabled": false,
    "proxyRequired": false
  }
}
```

**Use when:**
- Language needs custom analysis logic
- Provider doesn't use standard LSP

### Custom Provider

Requires manual implementation. Generator creates scaffold only.

```json
{
  "provider": {
    "type": "custom",
    "binaryName": "my-custom-provider"
  }
}
```

**Use when:**
- Unique requirements not covered by other types
- Need full control over provider implementation

---

## Generated Files

### Extension Directory Structure

```
vscode/{language}/
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript config
├── webpack.config.js         # Bundling config
├── .eslintrc.json            # Linting rules
├── LICENSE.md                # Apache 2.0 license
├── resources/                # Icons, assets
└── src/
    ├── extension.ts                        # Entry point
    ├── {Language}ExternalProviderManager.ts # Provider lifecycle
    ├── {Language}VscodeProxyServer.ts      # LSP proxy (if needed)
    └── utilities/
        └── constants.ts                    # Constants
```

### Modified Repository Files

| File | Modification |
|------|--------------|
| `package.json` | Add workspace, add package script |
| `.github/workflows/ci-repo.yml` | Add CI package step |
| `scripts/collect-assets.js` | Add asset download config |
| `scripts/copy-dist.js` | Add dist copy config |
| `scripts/package-extensions.js` | Add to valid extensions |
| `.vscode/launch.json` | Add debug configuration |
| `konveyor-extensions.code-workspace` | Add workspace folder |

---

## Troubleshooting

### Extension directory already exists

```
Error: Extension directory already exists: vscode/python. Use --force to overwrite.
```

**Solution:** Use `--force` flag or manually delete the directory.

### Repository not found

```
Error: Repository path does not exist: ./editor-extensions
```

**Solution:** Specify correct path with `--repo /path/to/editor-extensions`.

### Git branch already exists

```
Error: Branch feature/python-extension already exists
```

**Solution:** Use `--branch` to specify a different branch name.

### Missing gh CLI for PR creation

```
Error: gh CLI not found. Install from https://cli.github.com
```

**Solution:** Install GitHub CLI or create PR manually.
