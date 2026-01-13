# Konveyor Extension Generator - Implementation Plan

## Overview

This is a **standalone CLI tool** that automates the creation of new language extensions for the [Konveyor editor-extensions](https://github.com/konveyor/editor-extensions) project.

**Key Design Decision**: This tool lives in a separate repository and operates on a clone of the editor-extensions repo. When generating a new extension, it:
1. Uses an existing editor-extensions repository
2. Reads configuration (release tags, versions) from the target repo
3. Creates a new feature branch (e.g., `feature/python-extension`)
4. Generates all necessary files using Handlebars templates
5. Modifies existing repository files
6. Commits the changes
7. Optionally pushes and creates a PR

---

## Repository

- **URL**: https://github.com/savitharaghunathan/extension-generator
- **Target Repo**: https://github.com/konveyor/editor-extensions

---

## Implementation Status

### Phase 1: Core Infrastructure - COMPLETED

- [x] Set up TypeScript project with proper build
- [x] Implement CLI with commander.js
- [x] Create Zod validation schema
- [x] Implement config loader (JSON/YAML)
- [x] Implement utility functions (pascalCase, camelCase, capitalize)

### Phase 2: Git Operations - COMPLETED

- [x] Implement repository validation
- [x] Implement branch creation
- [x] Implement commit generation
- [x] Implement push operations
- [x] Implement PR creation (gh CLI)

### Phase 3: Interactive Mode - COMPLETED

- [x] Implement all prompts with inquirer
- [x] Add input validation
- [x] Add default value logic (from repo config)
- [x] Add confirmation step

### Phase 4: File Generation - COMPLETED

- [x] Create all Handlebars templates
  - [x] package.json.hbs
  - [x] extension.ts.hbs
  - [x] providerManager.ts.hbs
  - [x] proxyServer.ts.hbs (conditional)
  - [x] constants.ts.hbs
  - [x] tsconfig.json.hbs
  - [x] webpack.config.js.hbs
  - [x] eslintrc.json.hbs
  - [x] LICENSE.md.hbs
- [x] Implement template rendering with Handlebars
- [x] Implement file writing with conflict detection

### Phase 5: File Modification - COMPLETED

- [x] Implement package.json updates (workspaces, scripts)
- [x] Implement CI workflow YAML updates
- [x] Implement collect-assets.js updates
- [x] Implement copy-dist.js updates
- [x] Implement package-extensions.js updates
- [x] Implement launch.json updates
- [x] Implement workspace file updates

### Phase 6: Dry Run Mode - COMPLETED

- [x] Skip file writes in dry-run mode
- [x] Skip directory creation in dry-run mode
- [x] Display new file content with box formatting
- [x] Display modification diffs with color coding
- [x] Show change descriptions for modified files

### Phase 7: Dynamic Configuration - COMPLETED

- [x] Read version from target repo's package.json
- [x] Parse releaseTag from scripts/collect-assets.js
- [x] Parse org/repo configuration
- [x] Use repo config as defaults in interactive mode
- [x] Use repo config as fallbacks in generator

### Phase 8: Documentation - COMPLETED

- [x] Create README.md with usage examples
- [x] Create docs/usage.md with comprehensive guide
- [x] Create docs/examples/dry-run.md with example outputs
- [x] Add sample configurations (python, rust, cpp)

---

## Project Structure

```
extension-generator/
├── package.json              # NPM package config
├── tsconfig.json             # TypeScript config
├── .gitignore
├── README.md                 # User documentation
├── PLAN.md                   # This file
│
├── docs/
│   ├── usage.md              # Comprehensive usage guide
│   └── examples/
│       └── dry-run.md        # Dry run examples
│
├── src/
│   ├── index.ts              # CLI entry point
│   │
│   ├── lib/
│   │   ├── interactive.ts    # Inquirer prompts
│   │   ├── config-loader.ts  # JSON/YAML config loading
│   │   ├── validator.ts      # Zod schema validation
│   │   ├── generator.ts      # File generation logic
│   │   ├── git.ts            # Git operations (simple-git)
│   │   ├── repo-config.ts    # Read config from target repo
│   │   └── utils.ts          # Helper utilities
│   │
│   └── types/
│       └── config.ts         # TypeScript interfaces & Zod schemas
│
├── templates/                 # Handlebars templates
│   ├── extension.ts.hbs
│   ├── providerManager.ts.hbs
│   ├── proxyServer.ts.hbs
│   ├── constants.ts.hbs
│   ├── package.json.hbs
│   ├── webpack.config.js.hbs
│   ├── tsconfig.json.hbs
│   ├── eslintrc.json.hbs
│   └── LICENSE.md.hbs
│
├── configs/                   # Sample configurations
│   ├── sample-python.json
│   ├── sample-rust.json
│   └── sample-cpp.json
│
└── dist/                      # Compiled output
```

---

## CLI Interface

### Command Line Options

```bash
generate-extension [options]

Options:
  -c, --config <path>       Path to configuration file (JSON/YAML)
  -i, --interactive         Run in interactive mode
  -r, --repo <path>         Path to editor-extensions repo (default: ./editor-extensions)
  -b, --branch <name>       Branch name for changes (default: feature/{language}-extension)
  --base-branch <name>      Base branch to create from (default: main)
  -d, --dry-run             Show what would be generated without creating files
  -f, --force               Overwrite existing files
  --no-commit               Skip git commit
  --push                    Push branch to remote after generation
  --create-pr               Create a pull request (requires --push and gh CLI)
  -h, --help                Display help
  -V, --version             Display version
```

### Usage Examples

```bash
# Dry run to preview changes
node dist/index.js --config configs/sample-python.json \
  --repo ~/projects/editor-extensions --dry-run

# Interactive mode with local repo
node dist/index.js --interactive --repo ~/projects/editor-extensions

# From config file, auto-create branch
node dist/index.js --config ./python.json --repo ~/projects/editor-extensions

# Full automation: generate, push, and create PR
node dist/index.js --config ./rust.yaml --repo ~/projects/editor-extensions --push --create-pr
```

---

## Configuration Schema

### Extension Configuration Interface

```typescript
interface ExtensionConfig {
  // Basic Information
  language: string;                    // e.g., "python", "rust", "cpp"
  displayName: string;                 // e.g., "Python", "Rust", "C++"
  languageId: string;                  // VS Code language identifier

  // Activation Configuration
  activation: {
    fileExtensions: string[];          // e.g., [".py", ".pyw"]
    filePatterns?: string[];           // e.g., ["*.py", "**/*.py"]
    workspaceContains?: string[];      // e.g., ["requirements.txt"]
    additionalLanguageIds?: string[];  // e.g., ["jupyter"]
  };

  // Provider Configuration
  provider: {
    type: "generic" | "standalone" | "custom";
    binaryName: string;                // e.g., "generic-external-provider"
    binaryArgs?: string[];             // CLI arguments for spawning
    assetSource?: {
      repository: string;              // GitHub repo for binary releases
      releaseTag: string;              // e.g., "v0.8.0-beta.5"
      assetNamePattern?: string;       // Pattern for asset file names
    };
    platforms?: Platform[];            // Which platforms to support
  };

  // LSP Configuration
  lsp: {
    enabled: boolean;
    proxyRequired?: boolean;           // Does it need JSON-RPC proxy?
    providerName?: string;             // e.g., "python"
    socketType?: "unix" | "tcp" | "pipe";
  };

  // External Dependencies
  dependencies?: {
    vscodeExtensions?: string[];       // e.g., ["ms-python.python"]
    runtimeCheck?: {
      command: string;                 // e.g., "python --version"
      versionPattern?: string;         // Regex to extract version
      minVersion?: string;             // Minimum required version
    };
    tools?: Tool[];                    // Additional tools to check
  };

  // Provider-Specific Configuration
  providerSpecificConfig?: Record<string, unknown>;

  // Analysis Configuration
  analysis?: {
    mode?: "source-only" | "full";
    contextLines?: number;             // Default: 10
  };
}

interface Platform {
  os: "linux" | "darwin" | "win32";
  arch: "x64" | "arm64";
  binaryExtension?: string;            // e.g., ".exe" for Windows
}
```

---

## Files Generated/Modified

### New Files Created (in editor-extensions repo)

| File Path | Template | Condition |
|-----------|----------|-----------|
| `vscode/{language}/package.json` | `package.json.hbs` | Always |
| `vscode/{language}/tsconfig.json` | `tsconfig.json.hbs` | Always |
| `vscode/{language}/webpack.config.js` | `webpack.config.js.hbs` | Always |
| `vscode/{language}/.eslintrc.json` | `eslintrc.json.hbs` | Always |
| `vscode/{language}/LICENSE.md` | `LICENSE.md.hbs` | Always |
| `vscode/{language}/src/extension.ts` | `extension.ts.hbs` | Always |
| `vscode/{language}/src/{Lang}ExternalProviderManager.ts` | `providerManager.ts.hbs` | Always |
| `vscode/{language}/src/{Lang}VscodeProxyServer.ts` | `proxyServer.ts.hbs` | If `lsp.proxyRequired` |
| `vscode/{language}/src/utilities/constants.ts` | `constants.ts.hbs` | Always |

### Existing Files Modified

| File Path | Modification |
|-----------|--------------|
| `package.json` | Add to workspaces array, add package script |
| `.github/workflows/ci-repo.yml` | Add package step for extension |
| `scripts/collect-assets.js` | Add asset download configuration |
| `scripts/copy-dist.js` | Add dist copy logic |
| `scripts/package-extensions.js` | Add to VALID_EXTENSIONS array |
| `.vscode/launch.json` | Add to extensionDevelopmentPath |
| `konveyor-extensions.code-workspace` | Add folder entry |

---

## Decision Matrix

### LSP vs Standalone Provider

| Factor | Use Generic (LSP) | Use Standalone |
|--------|-------------------|----------------|
| Language has VS Code extension | Yes | Maybe |
| Need hover/goto/completion | Yes | No |
| Tree-sitter available | Either | Preferred |
| Custom analysis engine | No | Yes |
| Complex dependency resolution | Generic handles | Custom needed |

### Generated Files Comparison

| Feature | Generic (LSP) | Standalone |
|---------|---------------|------------|
| Provider Manager | Yes | Yes |
| Proxy Server | Yes | No |
| Total Files | 9 | 8 |

---

## Future Enhancements

### Potential Improvements

- [ ] Add YAML config file support (currently JSON only in samples)
- [ ] Add `--update` mode to update existing extensions
- [ ] Add template customization support
- [ ] Add validation for GitHub release existence
- [ ] Add automated testing with Jest
- [ ] Publish to npm registry
- [ ] Add GitHub Actions workflow for releases

### Language-Specific Templates

- [ ] Add JavaScript/TypeScript-specific template
- [ ] Add Java-specific template with Maven/Gradle support
- [ ] Add C#-specific template with .NET support

---

## References

### Existing Extensions (Patterns)

- **Java Extension**: `vscode/java/` - Generic provider with LSP
- **Go Extension**: `vscode/go/` - Generic provider with LSP
- **C# Extension**: `vscode/c-sharp/` - Standalone provider

### Key PRs

- [C# Extension PR #1124](https://github.com/konveyor/editor-extensions/pull/1124)
- [Go Extension PR #976](https://github.com/konveyor/editor-extensions/pull/976)
