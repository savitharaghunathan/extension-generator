# Konveyor Extension Generator

A CLI tool to automate the creation of new language extensions for the [Konveyor editor-extensions](https://github.com/konveyor/editor-extensions) project.

## Features

- **Interactive Mode**: Answer prompts to configure your extension
- **Config File Mode**: Use JSON/YAML configuration files
- **Git Integration**: Automatically creates feature branches and commits
- **PR Creation**: Optionally push and create pull requests
- **Template-based**: Uses Handlebars templates for consistent code generation

## Installation

```bash
# Clone the repository
git clone https://github.com/savitharaghunathan/extension-generator.git
cd extension-generator

# Install dependencies
npm install

# Build
npm run build

# Link globally (optional)
npm link
```

## Usage

### Interactive Mode

```bash
# Run with local editor-extensions repo
generate-extension --interactive --repo ~/projects/editor-extensions

# Or if not linked globally
npm start -- --interactive --repo ~/projects/editor-extensions
```

### Configuration File Mode

```bash
# Generate from JSON config
generate-extension --config ./configs/python.json --repo ~/projects/editor-extensions

# Generate from YAML config
generate-extension --config ./configs/rust.yaml --repo ~/projects/editor-extensions
```

### Full Automation

```bash
# Generate, push, and create PR
generate-extension --config ./configs/python.json \
  --repo ~/projects/editor-extensions \
  --push \
  --create-pr
```

### Dry Run

```bash
# Preview changes without modifying files
generate-extension --interactive --repo ~/projects/editor-extensions --dry-run
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --config <path>` | Path to configuration file (JSON/YAML) | - |
| `-i, --interactive` | Run in interactive mode | false |
| `-r, --repo <path>` | Path to editor-extensions repo | ./editor-extensions |
| `-b, --branch <name>` | Branch name for changes | feature/{language}-extension |
| `--base-branch <name>` | Base branch to create from | main |
| `-d, --dry-run` | Preview changes without creating files | false |
| `-f, --force` | Overwrite existing files | false |
| `--no-commit` | Skip git commit | false |
| `--push` | Push branch to remote | false |
| `--create-pr` | Create pull request (requires gh CLI) | false |

## Configuration Schema

### Example: Python Extension

```json
{
  "language": "python",
  "displayName": "Python",
  "languageId": "python",
  "activation": {
    "fileExtensions": [".py", ".pyw"],
    "workspaceContains": ["requirements.txt", "pyproject.toml"]
  },
  "provider": {
    "type": "generic",
    "binaryName": "generic-external-provider",
    "binaryArgs": ["-name", "python", "-socket"],
    "assetSource": {
      "repository": "konveyor/kai",
      "releaseTag": "v0.8.0-beta.5"
    }
  },
  "lsp": {
    "enabled": true,
    "proxyRequired": true
  },
  "dependencies": {
    "vscodeExtensions": ["ms-python.python"],
    "runtimeCheck": {
      "command": "python3 --version"
    }
  }
}
```

### Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `language` | string | Yes | Language identifier (e.g., "python") |
| `displayName` | string | Yes | Display name (e.g., "Python") |
| `languageId` | string | Yes | VS Code language ID |
| `activation.fileExtensions` | string[] | Yes | File extensions that trigger activation |
| `activation.workspaceContains` | string[] | No | Project files indicating workspace type |
| `provider.type` | enum | Yes | "generic", "standalone", or "custom" |
| `provider.binaryName` | string | Yes | Provider binary name |
| `provider.binaryArgs` | string[] | Yes | CLI arguments for provider |
| `lsp.enabled` | boolean | Yes | Whether LSP is used |
| `lsp.proxyRequired` | boolean | Conditional | If JSON-RPC proxy is needed |
| `dependencies.vscodeExtensions` | string[] | No | Required VS Code extensions |
| `dependencies.runtimeCheck.command` | string | No | Command to verify runtime |

## What Gets Generated

### New Files (9 files per extension)

```
vscode/{language}/
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript config
├── webpack.config.js         # Webpack bundler config
├── LICENSE.md                # Apache 2.0 license
├── .eslintrc.json            # ESLint config
└── src/
    ├── extension.ts          # Main entry point
    ├── {Language}ExternalProviderManager.ts
    ├── {Language}VscodeProxyServer.ts  # (if LSP enabled)
    └── utilities/
        └── constants.ts      # Build-time constants
```

### Modified Files (12 files)

- `package.json` - Add workspace and scripts
- `.github/workflows/ci-repo.yml` - Add build/test steps
- `.github/workflows/release.yml` - Add publish steps
- `scripts/collect-assets.js` - Add asset download
- `scripts/copy-dist.js` - Add dist copy logic
- `scripts/package-extensions.js` - Add packaging
- `.vscode/launch.json` - Add debug config
- `konveyor-extensions.code-workspace` - Add folder
- `tests/.env.example` - Add VSIX variable

## Provider Types

### Generic (with LSP)
Uses `generic-external-provider` with a JSON-RPC proxy. Best for languages with existing VS Code extensions that provide LSP.

### Standalone
Custom provider binary without LSP proxy. Uses tree-sitter or custom analysis. Best for languages needing custom analysis engines.

### Custom
Minimal scaffold for manual configuration. Use when neither generic nor standalone fits.

## Requirements

- Node.js >= 18.0.0
- Git
- (Optional) GitHub CLI (`gh`) for PR creation

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Lint
npm run lint
```

## License

Apache-2.0
