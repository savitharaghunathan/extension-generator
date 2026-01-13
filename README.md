# Konveyor Extension Generator

A CLI tool to automate the creation of new language extensions for the [Konveyor editor-extensions](https://github.com/konveyor/editor-extensions) project.

## Features

- **Interactive Mode**: Step-by-step prompts to configure your extension
- **Config File Mode**: Use JSON/YAML configuration files for automation
- **Dry Run**: Preview all changes before modifying any files
- **Git Integration**: Automatically creates feature branches and commits
- **PR Creation**: Optionally push and create pull requests
- **Dynamic Configuration**: Reads release tags from target repository
- **Template-based**: Uses Handlebars templates for consistent code generation

## Installation

### Prerequisites

- Node.js >= 18.0.0
- npm
- Git
- A local clone of the [editor-extensions](https://github.com/konveyor/editor-extensions) repository
- (Optional) [GitHub CLI](https://cli.github.com/) for PR creation

### Setup

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

## Quick Start

### Option 1: Dry Run (Preview Changes)

```bash
node dist/index.js --config configs/sample-python.json \
  --repo /path/to/editor-extensions \
  --dry-run
```

### Option 2: Interactive Mode

```bash
node dist/index.js --interactive --repo /path/to/editor-extensions
```

### Option 3: Config File Mode

```bash
node dist/index.js --config configs/sample-python.json \
  --repo /path/to/editor-extensions
```

### Option 4: Full Automation

```bash
node dist/index.js --config configs/sample-python.json \
  --repo /path/to/editor-extensions \
  --push \
  --create-pr
```

## CLI Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--config <path>` | `-c` | Path to configuration file (JSON/YAML) | - |
| `--interactive` | `-i` | Run in interactive mode | `false` |
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

## Configuration

### Minimal Configuration

```json
{
  "language": "python",
  "displayName": "Python",
  "languageId": "python",
  "activation": {
    "fileExtensions": [".py", ".pyw"]
  },
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

### Full Configuration

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
      "releaseTag": "v0.8.0-beta.5"
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
      "minVersion": "3.8.0"
    }
  },
  "analysis": {
    "mode": "source-only",
    "contextLines": 10
  }
}
```

### Configuration Fields

| Field | Required | Description |
|-------|----------|-------------|
| `language` | Yes | Language identifier (lowercase, e.g., "python") |
| `displayName` | Yes | Display name (e.g., "Python") |
| `languageId` | Yes | VS Code language ID |
| `activation.fileExtensions` | Yes | File extensions that trigger activation |
| `activation.workspaceContains` | No | Project files indicating workspace type |
| `provider.type` | Yes | "generic", "standalone", or "custom" |
| `provider.binaryName` | Yes | Provider binary name |
| `provider.binaryArgs` | No | CLI arguments for provider |
| `provider.assetSource` | No | GitHub release info (read from repo if omitted) |
| `lsp.enabled` | Yes | Whether LSP is used |
| `lsp.proxyRequired` | No | If JSON-RPC proxy is needed |
| `dependencies.vscodeExtensions` | No | Required VS Code extensions |

## Provider Types

### Generic (with LSP)

Uses `generic-external-provider` with a JSON-RPC proxy. Best for languages with existing VS Code extensions that provide LSP.

```json
{
  "provider": { "type": "generic", "binaryName": "generic-external-provider" },
  "lsp": { "enabled": true, "proxyRequired": true }
}
```

### Standalone

Custom provider binary without LSP proxy. Uses tree-sitter or custom analysis.

```json
{
  "provider": { "type": "standalone", "binaryName": "rust-analyzer-provider" },
  "lsp": { "enabled": false, "proxyRequired": false }
}
```

### Custom

Minimal scaffold for manual configuration.

## Generated Files

### New Extension Files (8-9 files)

```
vscode/{language}/
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript config
├── webpack.config.js         # Webpack bundler config
├── .eslintrc.json            # ESLint rules
├── LICENSE.md                # Apache 2.0 license
└── src/
    ├── extension.ts                          # Entry point
    ├── {Language}ExternalProviderManager.ts  # Provider lifecycle
    ├── {Language}VscodeProxyServer.ts        # LSP proxy (if proxyRequired)
    └── utilities/
        └── constants.ts                      # Build constants
```

### Modified Repository Files (7 files)

| File | Changes |
|------|---------|
| `package.json` | Add workspace, add package script |
| `.github/workflows/ci-repo.yml` | Add package step |
| `scripts/collect-assets.js` | Add asset configuration |
| `scripts/copy-dist.js` | Add dist copy logic |
| `scripts/package-extensions.js` | Add to valid extensions |
| `.vscode/launch.json` | Add debug configuration |
| `konveyor-extensions.code-workspace` | Add workspace folder |

## Dynamic Configuration

The generator reads configuration from the target editor-extensions repository:

```
Reading configuration from /path/to/editor-extensions...
  Version: 0.4.0
  Release tag: v0.8.0-beta.5
```

These values are used as defaults when:
- Running in interactive mode
- Config file doesn't specify `assetSource.releaseTag`

## Sample Configurations

Sample configurations are available in the `configs/` directory:

- `sample-python.json` - Python with generic provider and LSP proxy
- `sample-rust.json` - Rust with standalone provider (no LSP)
- `sample-cpp.json` - C++ with generic provider

## Documentation

- [Usage Guide](docs/usage.md) - Comprehensive usage documentation
- [Dry Run Examples](docs/examples/dry-run.md) - Detailed dry run output examples

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
