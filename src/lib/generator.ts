import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import Handlebars from "handlebars";
import type {
  GenerationContext,
  GenerationResult,
  FileOperation,
  RepoConfig,
} from "../types/config.js";
import { toPascalCase, toCamelCase, capitalize } from "./utils.js";

/**
 * Parse JSON with trailing commas (JSONC-like)
 */
function parseJsonc(content: string): unknown {
  // Remove trailing commas before } or ]
  const cleaned = content.replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(cleaned);
}

// Register Handlebars helpers
Handlebars.registerHelper("pascalCase", toPascalCase);
Handlebars.registerHelper("camelCase", toCamelCase);
Handlebars.registerHelper("capitalize", capitalize);
Handlebars.registerHelper("json", (value: unknown) => JSON.stringify(value));
Handlebars.registerHelper(
  "extractExtName",
  (extensionId: string) => extensionId.split(".").pop() || extensionId
);

interface TemplateData {
  language: string;
  displayName: string;
  languageId: string;
  pascalLanguage: string;
  camelLanguage: string;
  activation: {
    fileExtensions: string[];
    filePatterns?: string[];
    workspaceContains: string[];
    additionalLanguageIds?: string[];
  };
  provider: {
    type: string;
    binaryName: string;
    binaryArgs: string[];
    platforms: Array<{ os: string; arch: string; binaryExtension?: string }>;
    assetSource?: {
      repository: string;
      releaseTag: string;
    };
  };
  lsp: {
    enabled: boolean;
    proxyRequired: boolean;
    providerName: string;
  };
  dependencies: {
    vscodeExtensions: string[];
    runtimeCheck?: {
      command: string;
      minVersion?: string;
    };
  };
  providerSpecificConfig: Record<string, unknown>;
  analysis: {
    mode: string;
    contextLines: number;
  };
}

/**
 * Generate extension files
 */
export async function generateExtension(
  context: GenerationContext
): Promise<GenerationResult> {
  const operations: FileOperation[] = [];
  const errors: string[] = [];

  const { config, options, repoPath, templatesDir, repoConfig } = context;

  // Prepare template data
  const templateData: TemplateData = {
    language: config.language,
    displayName: config.displayName,
    languageId: config.languageId,
    pascalLanguage: toPascalCase(config.language),
    camelLanguage: toCamelCase(config.language),
    activation: {
      fileExtensions: config.activation.fileExtensions,
      filePatterns: config.activation.filePatterns,
      workspaceContains: config.activation.workspaceContains || [],
      additionalLanguageIds: config.activation.additionalLanguageIds,
    },
    provider: {
      type: config.provider.type,
      binaryName: config.provider.binaryName,
      binaryArgs: config.provider.binaryArgs || [],
      platforms: config.provider.platforms || [],
      assetSource: config.provider.assetSource,
    },
    lsp: {
      enabled: config.lsp.enabled,
      proxyRequired: config.lsp.proxyRequired || false,
      providerName: config.lsp.providerName || config.language,
    },
    dependencies: {
      vscodeExtensions: config.dependencies?.vscodeExtensions || [],
      runtimeCheck: config.dependencies?.runtimeCheck,
    },
    providerSpecificConfig: config.providerSpecificConfig || {},
    analysis: {
      mode: config.analysis?.mode || "source-only",
      contextLines: config.analysis?.contextLines || 10,
    },
  };

  const extensionDir = join(repoPath, "vscode", config.language);

  // Check if extension already exists
  if (existsSync(extensionDir) && !options.force) {
    errors.push(
      `Extension directory already exists: ${extensionDir}. Use --force to overwrite.`
    );
    return { success: false, operations, branchName: context.branchName, errors };
  }

  try {
    // Create extension directory structure (skip in dry-run)
    if (!options.dryRun) {
      await mkdir(join(extensionDir, "src", "utilities"), { recursive: true });
      await mkdir(join(extensionDir, "resources"), { recursive: true });
    }

    // Generate new files from templates
    const newFiles = await generateNewFiles(
      templatesDir,
      extensionDir,
      templateData,
      options.dryRun
    );
    operations.push(...newFiles);

    // Modify existing files
    const modifiedFiles = await modifyExistingFiles(
      repoPath,
      config,
      repoConfig,
      options.dryRun
    );
    operations.push(...modifiedFiles);

    return {
      success: true,
      operations,
      branchName: context.branchName,
      errors,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return { success: false, operations, branchName: context.branchName, errors };
  }
}

/**
 * Generate new files from templates
 */
async function generateNewFiles(
  templatesDir: string,
  extensionDir: string,
  data: TemplateData,
  dryRun: boolean
): Promise<FileOperation[]> {
  const operations: FileOperation[] = [];

  // Define file mappings
  const fileMappings: Array<{
    template: string;
    output: string;
    condition?: boolean;
  }> = [
    { template: "package.json.hbs", output: "package.json" },
    { template: "tsconfig.json.hbs", output: "tsconfig.json" },
    { template: "webpack.config.js.hbs", output: "webpack.config.js" },
    { template: "eslintrc.json.hbs", output: ".eslintrc.json" },
    { template: "LICENSE.md.hbs", output: "LICENSE.md" },
    { template: "extension.ts.hbs", output: "src/extension.ts" },
    {
      template: "providerManager.ts.hbs",
      output: `src/${data.pascalLanguage}ExternalProviderManager.ts`,
    },
    {
      template: "proxyServer.ts.hbs",
      output: `src/${data.pascalLanguage}VscodeProxyServer.ts`,
      condition: data.lsp.proxyRequired,
    },
    { template: "constants.ts.hbs", output: "src/utilities/constants.ts" },
  ];

  for (const mapping of fileMappings) {
    if (mapping.condition === false) continue;

    const templatePath = join(templatesDir, mapping.template);
    const outputPath = join(extensionDir, mapping.output);

    if (!existsSync(templatePath)) {
      // Template doesn't exist, create placeholder
      operations.push({
        type: "create",
        path: outputPath,
        description: `Template ${mapping.template} not found - create manually`,
      });
      continue;
    }

    const templateContent = await readFile(templatePath, "utf-8");
    const template = Handlebars.compile(templateContent);
    const rendered = template(data);

    if (!dryRun) {
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, rendered);
    }

    operations.push({
      type: "create",
      path: `vscode/${data.language}/${mapping.output}`,
      description: `Generated from ${mapping.template}`,
      content: dryRun ? rendered : undefined,  // Include content only in dry-run
    });
  }

  return operations;
}

/**
 * Modify existing files in the repository
 */
async function modifyExistingFiles(
  repoPath: string,
  config: GenerationContext["config"],
  repoConfig: RepoConfig,
  dryRun: boolean
): Promise<FileOperation[]> {
  const operations: FileOperation[] = [];

  // Update root package.json
  const rootPkgPath = join(repoPath, "package.json");
  if (existsSync(rootPkgPath)) {
    const rootPkg = JSON.parse(await readFile(rootPkgPath, "utf-8"));

    // Add to workspaces
    const workspacePath = `vscode/${config.language}`;
    if (!rootPkg.workspaces?.includes(workspacePath)) {
      rootPkg.workspaces = rootPkg.workspaces || [];
      rootPkg.workspaces.push(workspacePath);
      rootPkg.workspaces.sort();
    }

    // Add package script
    const scriptName = `package-${config.language}`;
    rootPkg.scripts = rootPkg.scripts || {};
    rootPkg.scripts[scriptName] = `node ./scripts/package-extensions.js ${config.language}`;

    if (!dryRun) {
      await writeFile(rootPkgPath, JSON.stringify(rootPkg, null, 2) + "\n");
    }

    operations.push({
      type: "modify",
      path: "package.json",
      description: "Add workspace and package script",
      changes: [
        `Add "vscode/${config.language}" to workspaces array`,
        `Add script "package-${config.language}": "node ./scripts/package-extensions.js ${config.language}"`,
      ],
      diff: `  "workspaces": [
    ...
+   "vscode/${config.language}"
  ],
  "scripts": {
    ...
+   "package-${config.language}": "node ./scripts/package-extensions.js ${config.language}"
  }`,
    });
  }

  // Update CI workflow
  const ciWorkflowPath = join(repoPath, ".github/workflows/ci-repo.yml");
  if (existsSync(ciWorkflowPath)) {
    let ciContent = await readFile(ciWorkflowPath, "utf-8");

    // Add package step if not exists
    const packageStep = `- name: Package ${config.displayName} extension
        run: npm run package-${config.language}
        if: runner.os == 'Linux'`;

    if (!ciContent.includes(`package-${config.language}`)) {
      // Find a good insertion point (before Upload VSIX artifacts)
      // Match the indentation of existing steps (6 spaces)
      ciContent = ciContent.replace(
        /(\n)(      )(- name: Upload VSIX artifacts)/,
        `$1$2${packageStep}\n\n$2$3`
      );

      if (!dryRun) {
        await writeFile(ciWorkflowPath, ciContent);
      }

      operations.push({
        type: "modify",
        path: ".github/workflows/ci-repo.yml",
        description: "Add package step for extension",
        changes: [
          `Add step: "Package ${config.displayName} extension"`,
          `Run: npm run package-${config.language}`,
        ],
        diff: `+     - name: Package ${config.displayName} extension
+       run: npm run package-${config.language}
+       if: runner.os == 'Linux'`,
      });
    }
  }

  // Update collect-assets.js
  const collectAssetsPath = join(repoPath, "scripts/collect-assets.js");
  if (existsSync(collectAssetsPath)) {
    let content = await readFile(collectAssetsPath, "utf-8");

    if (!content.includes(`"${config.provider.binaryName}"`)) {
      // Use config values with repo config as fallback
      const assetRepo = config.provider.assetSource?.repository || `${repoConfig.org}/${repoConfig.repo}`;
      const assetTag = config.provider.assetSource?.releaseTag || repoConfig.releaseTag;

      // Add asset configuration
      const assetConfig = `  "${config.provider.binaryName}": {
    release: {
      repo: "${assetRepo}",
      tag: "${assetTag}",
    },
  },`;

      // Find ASSETS object and add entry
      content = content.replace(
        /(const ASSETS = \{)/,
        `$1\n${assetConfig}`
      );

      if (!dryRun) {
        await writeFile(collectAssetsPath, content);
      }

      operations.push({
        type: "modify",
        path: "scripts/collect-assets.js",
        description: "Add asset download configuration",
        changes: [
          `Add "${config.provider.binaryName}" to ASSETS object`,
          `Repository: ${assetRepo}`,
          `Tag: ${assetTag}`,
        ],
        diff: `  const ASSETS = {
+   "${config.provider.binaryName}": {
+     release: {
+       repo: "${assetRepo}",
+       tag: "${assetTag}",
+     },
+   },
    ...
  };`,
      });
    }
  }

  // Update copy-dist.js
  const copyDistPath = join(repoPath, "scripts/copy-dist.js");
  if (existsSync(copyDistPath)) {
    let content = await readFile(copyDistPath, "utf-8");

    if (!content.includes(`"${config.language}"`)) {
      // Add copy configuration
      const copyConfig = `  "${config.language}": {
    extensionPath: "vscode/${config.language}",
    includedAssetPaths: {
      "${toCamelCase(config.provider.binaryName)}": "../../downloaded_assets/${config.provider.binaryName}",
    },
  },`;

      content = content.replace(
        /(const EXTENSIONS = \{)/,
        `$1\n${copyConfig}`
      );

      if (!dryRun) {
        await writeFile(copyDistPath, content);
      }

      operations.push({
        type: "modify",
        path: "scripts/copy-dist.js",
        description: "Add dist copy configuration",
        changes: [
          `Add "${config.language}" to EXTENSIONS object`,
          `Extension path: vscode/${config.language}`,
        ],
        diff: `  const EXTENSIONS = {
+   "${config.language}": {
+     extensionPath: "vscode/${config.language}",
+     includedAssetPaths: {
+       "${toCamelCase(config.provider.binaryName)}": "../../downloaded_assets/${config.provider.binaryName}",
+     },
+   },
    ...
  };`,
      });
    }
  }

  // Update package-extensions.js
  const packageExtPath = join(repoPath, "scripts/package-extensions.js");
  if (existsSync(packageExtPath)) {
    let content = await readFile(packageExtPath, "utf-8");

    if (!content.includes(`"${config.language}"`)) {
      // Add to valid extensions list
      content = content.replace(
        /(const VALID_EXTENSIONS = \[)/,
        `$1"${config.language}", `
      );

      if (!dryRun) {
        await writeFile(packageExtPath, content);
      }

      operations.push({
        type: "modify",
        path: "scripts/package-extensions.js",
        description: "Add extension to valid list",
        changes: [
          `Add "${config.language}" to VALID_EXTENSIONS array`,
        ],
        diff: `- const VALID_EXTENSIONS = [...];
+ const VALID_EXTENSIONS = ["${config.language}", ...];`,
      });
    }
  }

  // Update .vscode/launch.json
  const launchPath = join(repoPath, ".vscode/launch.json");
  if (existsSync(launchPath)) {
    const launchJson = JSON.parse(await readFile(launchPath, "utf-8"));

    // Check if extension paths include our language
    const hasExtension = launchJson.configurations?.some(
      (c: { extensionDevelopmentPath?: string[] }) =>
        c.extensionDevelopmentPath?.some((p: string) =>
          p.includes(`vscode/${config.language}`)
        )
    );

    if (!hasExtension && launchJson.configurations) {
      // Add to existing configurations
      launchJson.configurations.forEach(
        (c: { extensionDevelopmentPath?: string[] }) => {
          if (c.extensionDevelopmentPath) {
            c.extensionDevelopmentPath.push(
              `\${workspaceFolder}/vscode/${config.language}`
            );
          }
        }
      );

      if (!dryRun) {
        await writeFile(launchPath, JSON.stringify(launchJson, null, 2) + "\n");
      }

      operations.push({
        type: "modify",
        path: ".vscode/launch.json",
        description: "Add extension to debug configuration",
        changes: [
          `Add "\${workspaceFolder}/vscode/${config.language}" to extensionDevelopmentPath`,
        ],
        diff: `  "args": [
    "--extensionDevelopmentPath=\${workspaceFolder}/vscode/core",
    "--extensionDevelopmentPath=\${workspaceFolder}/vscode/java",
    ...
+   "--extensionDevelopmentPath=\${workspaceFolder}/vscode/${config.language}",
  ]`,
      });
    }
  }

  // Update workspace file
  const workspacePath = join(repoPath, "konveyor-extensions.code-workspace");
  if (existsSync(workspacePath)) {
    const workspaceContent = await readFile(workspacePath, "utf-8");
    const workspace = parseJsonc(workspaceContent) as { folders?: Array<{ path: string; name?: string }> };

    const hasFolder = workspace.folders?.some(
      (f: { path: string }) => f.path === `vscode/${config.language}`
    );

    if (!hasFolder) {
      workspace.folders = workspace.folders || [];
      workspace.folders.push({ path: `vscode/${config.language}` });

      if (!dryRun) {
        await writeFile(workspacePath, JSON.stringify(workspace, null, 2) + "\n");
      }

      operations.push({
        type: "modify",
        path: "konveyor-extensions.code-workspace",
        description: "Add extension folder to workspace",
        changes: [
          `Add folder: { "path": "vscode/${config.language}" }`,
        ],
        diff: `  "folders": [
    ...
+   {
+     "path": "vscode/${config.language}"
+   }
  ]`,
      });
    }
  }

  return operations;
}
