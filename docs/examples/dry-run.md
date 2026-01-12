# Dry Run Examples

The `--dry-run` flag allows you to preview all changes that would be made without actually modifying any files. This is useful for:

- Reviewing generated code before committing
- Validating configuration files
- Understanding what files will be created or modified

## Command Syntax

```bash
node dist/index.js --config <config-file> --repo <path-to-editor-extensions> --dry-run
```

## Example 1: Python Extension (LSP-Enabled with Proxy)

This example demonstrates generating a Python extension that uses the generic external provider with LSP proxy support.

### Command

```bash
cd /Users/sraghuna/local_dev/konveyor/extension-generator
node dist/index.js --config configs/sample-python.json --repo /path/to/editor-extensions --dry-run
```

### Configuration (sample-python.json)

```json
{
  "language": "python",
  "displayName": "Python",
  "languageId": "python",
  "activation": {
    "fileExtensions": [".py", ".pyw"],
    "filePatterns": ["*.py", "*.pyw"],
    "workspaceContains": ["requirements.txt", "pyproject.toml", "setup.py", "Pipfile"]
  },
  "provider": {
    "type": "generic",
    "binaryName": "generic-external-provider",
    "binaryArgs": ["-name", "python", "-socket"]
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
  }
}
```

### Output Summary

```
  Konveyor Extension Generator v0.1.0

Reading configuration from /path/to/editor-extensions...
  Version: 0.4.0
  Release tag: v0.8.0-beta.5

Loading config from configs/sample-python.json...
Validating configuration...

Generation Summary:
────────────────────────────────────────
  Language:     python
  Display Name: Python
  Provider:     generic
  LSP Enabled:  Yes
  Repository:   /path/to/editor-extensions
  Branch:       feature/python-extension
  Base Branch:  main
────────────────────────────────────────

Dry run mode - no files will be modified
```

### Files Created (9 files)

| File | Description |
|------|-------------|
| `vscode/python/package.json` | Extension manifest with activation events, dependencies |
| `vscode/python/tsconfig.json` | TypeScript configuration |
| `vscode/python/webpack.config.js` | Webpack bundling configuration |
| `vscode/python/.eslintrc.json` | ESLint rules |
| `vscode/python/LICENSE.md` | Apache 2.0 license |
| `vscode/python/src/extension.ts` | Extension entry point |
| `vscode/python/src/PythonExternalProviderManager.ts` | Provider lifecycle management |
| `vscode/python/src/PythonVscodeProxyServer.ts` | LSP JSON-RPC proxy server |
| `vscode/python/src/utilities/constants.ts` | Extension constants |

**Note:** The `PythonVscodeProxyServer.ts` file is only generated when `lsp.proxyRequired: true`.

### Files Modified (7 files)

| File | Changes |
|------|---------|
| `package.json` | Add `vscode/python` to workspaces, add `package-python` script |
| `.github/workflows/ci-repo.yml` | Add package step for Python extension |
| `scripts/collect-assets.js` | Add asset configuration (if new binary) |
| `scripts/copy-dist.js` | Add extension to copy configuration |
| `scripts/package-extensions.js` | Add to VALID_EXTENSIONS array |
| `.vscode/launch.json` | Add extension to debug configuration |
| `konveyor-extensions.code-workspace` | Add extension folder to workspace |

---

## Example 2: Rust Extension (Standalone, No LSP)

This example demonstrates generating a Rust extension with a standalone provider that doesn't require LSP proxy.

### Command

```bash
cd /Users/sraghuna/local_dev/konveyor/extension-generator
node dist/index.js --config configs/sample-rust.json --repo /path/to/editor-extensions --dry-run
```

### Configuration (sample-rust.json)

```json
{
  "language": "rust",
  "displayName": "Rust",
  "languageId": "rust",
  "activation": {
    "fileExtensions": [".rs"],
    "filePatterns": ["*.rs"],
    "workspaceContains": ["Cargo.toml"]
  },
  "provider": {
    "type": "standalone",
    "binaryName": "rust-analyzer-provider",
    "binaryArgs": ["--socket"],
    "assetSource": {
      "repository": "konveyor/kai",
      "releaseTag": "v0.9.0"
    }
  },
  "lsp": {
    "enabled": false,
    "proxyRequired": false,
    "providerName": "rust",
    "socketType": "unix"
  },
  "dependencies": {
    "vscodeExtensions": ["rust-lang.rust-analyzer"],
    "runtimeCheck": {
      "command": "rustc --version"
    }
  }
}
```

### Output Summary

```
  Konveyor Extension Generator v0.1.0

Reading configuration from /path/to/editor-extensions...
  Version: 0.4.0
  Release tag: v0.8.0-beta.5

Loading config from configs/sample-rust.json...
Validating configuration...

Generation Summary:
────────────────────────────────────────
  Language:     rust
  Display Name: Rust
  Provider:     standalone
  LSP Enabled:  No
  Repository:   /path/to/editor-extensions
  Branch:       feature/rust-extension
  Base Branch:  main
────────────────────────────────────────

Dry run mode - no files will be modified
```

### Files Created (8 files)

| File | Description |
|------|-------------|
| `vscode/rust/package.json` | Extension manifest |
| `vscode/rust/tsconfig.json` | TypeScript configuration |
| `vscode/rust/webpack.config.js` | Webpack bundling configuration |
| `vscode/rust/.eslintrc.json` | ESLint rules |
| `vscode/rust/LICENSE.md` | Apache 2.0 license |
| `vscode/rust/src/extension.ts` | Extension entry point |
| `vscode/rust/src/RustExternalProviderManager.ts` | Provider lifecycle management |
| `vscode/rust/src/utilities/constants.ts` | Extension constants |

**Note:** No proxy server file is generated since `lsp.proxyRequired: false`.

### Files Modified (7 files)

| File | Changes |
|------|---------|
| `package.json` | Add `vscode/rust` to workspaces, add `package-rust` script |
| `.github/workflows/ci-repo.yml` | Add package step for Rust extension |
| `scripts/collect-assets.js` | Add `rust-analyzer-provider` to ASSETS with tag `v0.9.0` |
| `scripts/copy-dist.js` | Add extension to copy configuration |
| `scripts/package-extensions.js` | Add to VALID_EXTENSIONS array |
| `.vscode/launch.json` | Add extension to debug configuration |
| `konveyor-extensions.code-workspace` | Add extension folder to workspace |

---

## Understanding the Output

### New Files (+ prefix)

New files are shown with a `+` prefix and include the full generated content:

```
  + vscode/rust/package.json

    ┌────────────────────────────────────────────────────────────
    │ {
    │   "name": "konveyor-rust",
    │   "displayName": "Konveyor Rust Extension",
    │   ...
    │ }
    └────────────────────────────────────────────────────────────
```

### Modified Files (~ prefix)

Modified files are shown with a `~` prefix and include:
- Description of changes
- Diff showing additions (green `+` lines)

```
  ~ scripts/collect-assets.js
      → Add "rust-analyzer-provider" to ASSETS object
      → Repository: konveyor/kai
      → Tag: v0.9.0

    ┌────────────────────────────────────────────────────────────
    │   const ASSETS = {
    │ +   "rust-analyzer-provider": {
    │ +     release: {
    │ +       repo: "konveyor/kai",
    │ +       tag: "v0.9.0",
    │ +     },
    │ +   },
    │     ...
    │   };
    └────────────────────────────────────────────────────────────
```

---

## Key Differences: LSP vs Non-LSP

| Feature | LSP-Enabled (Python) | Standalone (Rust) |
|---------|---------------------|-------------------|
| Provider Type | `generic` | `standalone` |
| LSP Enabled | `true` | `false` |
| Proxy Required | `true` | `false` |
| Proxy Server File | Generated | Not generated |
| Total Files Created | 9 | 8 |

---

## Dynamic Configuration

The generator reads configuration from the target repository:

```
Reading configuration from /path/to/editor-extensions...
  Version: 0.4.0
  Release tag: v0.8.0-beta.5
```

These values are used as defaults when:
- Running in interactive mode (prompts show these as defaults)
- Config file doesn't specify `assetSource.releaseTag` (uses repo's release tag as fallback)

Values are parsed from:
- `package.json` - version
- `scripts/collect-assets.js` - releaseTag, org, repo
