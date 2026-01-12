import inquirer from "inquirer";
import chalk from "chalk";
import type { CliOptions, ExtensionConfig, Platform } from "../types/config.js";
import { capitalize } from "./utils.js";
import { readRepoConfig, type RepoConfig } from "./repo-config.js";

interface BasicAnswers {
  language: string;
  displayName: string;
  languageId: string;
}

interface ActivationAnswers {
  fileExtensions: string[];
  workspaceContains: string[];
  additionalLanguageIds: string[];
}

interface ProviderAnswers {
  type: "generic" | "standalone" | "custom";
  binaryName: string;
  binaryArgs: string[];
}

interface AssetSourceAnswers {
  repository: string;
  releaseTag: string;
}

interface LspAnswers {
  lspType: string;
  providerName?: string;
}

interface DependenciesAnswers {
  vscodeExtensions: string[];
  runtimeCommand: string;
  minVersion?: string;
}

interface PlatformAnswers {
  platforms: Platform[];
}

export async function runInteractive(options: CliOptions): Promise<ExtensionConfig> {
  console.log(chalk.bold("Interactive Configuration\n"));

  // Read configuration from the target repository
  console.log(chalk.gray(`Reading configuration from ${options.repo}...`));
  const repoConfig = await readRepoConfig(options.repo);
  console.log(chalk.gray(`  Release tag: ${repoConfig.releaseTag}`));
  if (repoConfig.csharpReleaseTag) {
    console.log(chalk.gray(`  C# Release tag: ${repoConfig.csharpReleaseTag}`));
  }
  console.log("");

  // Basic information
  const basic = await inquirer.prompt<BasicAnswers>([
    {
      type: "input",
      name: "language",
      message: "Language identifier (e.g., python, rust, cpp):",
      validate: (input: string) =>
        /^[a-z][a-z0-9-]*$/.test(input) ||
        "Must be lowercase alphanumeric with hyphens",
    },
    {
      type: "input",
      name: "displayName",
      message: "Display name:",
      default: (answers: { language: string }) => capitalize(answers.language),
    },
    {
      type: "input",
      name: "languageId",
      message: "VS Code language ID:",
      default: (answers: { language: string }) => answers.language,
    },
  ]);

  // Activation configuration
  const activation = await inquirer.prompt<ActivationAnswers>([
    {
      type: "input",
      name: "fileExtensions",
      message: "File extensions (comma-separated, e.g., .py, .pyw):",
      filter: (input: string) =>
        input.split(",").map((s) => s.trim()).filter(Boolean),
      validate: (input: string[]) =>
        input.length > 0 || "At least one file extension required",
    },
    {
      type: "input",
      name: "workspaceContains",
      message:
        "Workspace indicator files (comma-separated, or empty, e.g., requirements.txt):",
      filter: (input: string) =>
        input ? input.split(",").map((s) => s.trim()).filter(Boolean) : [],
    },
    {
      type: "input",
      name: "additionalLanguageIds",
      message: "Additional language IDs (comma-separated, or empty):",
      filter: (input: string) =>
        input ? input.split(",").map((s) => s.trim()).filter(Boolean) : [],
    },
  ]);

  // Provider configuration
  const provider = await inquirer.prompt<ProviderAnswers>([
    {
      type: "list",
      name: "type",
      message: "Provider type:",
      choices: [
        {
          name: "Generic (uses generic-external-provider with LSP)",
          value: "generic",
        },
        {
          name: "Standalone (custom provider without LSP proxy)",
          value: "standalone",
        },
        { name: "Custom (requires manual configuration)", value: "custom" },
      ],
    },
    {
      type: "input",
      name: "binaryName",
      message: "Provider binary name:",
      default: (answers: { type: string }) =>
        answers.type === "generic"
          ? "generic-external-provider"
          : `${basic.language}-analyzer-provider`,
    },
    {
      type: "input",
      name: "binaryArgs",
      message: "CLI arguments for provider (comma-separated):",
      default: (answers: { type: string }) =>
        answers.type === "generic"
          ? `-name, ${basic.language}, -socket`
          : "--socket",
      filter: (input: string) =>
        input.split(",").map((s) => s.trim()).filter(Boolean),
    },
  ]);

  // Asset source
  const assetSource = await inquirer.prompt<AssetSourceAnswers>([
    {
      type: "input",
      name: "repository",
      message: "GitHub repository for provider assets:",
      default: `${repoConfig.org}/${repoConfig.repo}`,
    },
    {
      type: "input",
      name: "releaseTag",
      message: "Release tag for assets:",
      default: repoConfig.releaseTag,
    },
  ]);

  // LSP configuration
  const lsp = await inquirer.prompt<LspAnswers>([
    {
      type: "list",
      name: "lspType",
      message: "Language Server Protocol support:",
      choices: [
        { name: "Yes (with JSON-RPC proxy)", value: "proxy" },
        { name: "Yes (direct LSP)", value: "direct" },
        { name: "No", value: "none" },
      ],
      default: provider.type === "generic" ? "proxy" : "none",
    },
    {
      type: "input",
      name: "providerName",
      message: "LSP provider name:",
      when: (answers: { lspType: string }) => answers.lspType !== "none",
      default: basic.language,
    },
  ]);

  // Dependencies
  const dependencies = await inquirer.prompt<DependenciesAnswers>([
    {
      type: "input",
      name: "vscodeExtensions",
      message: "Required VS Code extensions (comma-separated, or empty):",
      filter: (input: string) =>
        input ? input.split(",").map((s) => s.trim()).filter(Boolean) : [],
    },
    {
      type: "input",
      name: "runtimeCommand",
      message: "Runtime check command (e.g., python3 --version, or empty):",
    },
    {
      type: "input",
      name: "minVersion",
      message: "Minimum required version (or empty):",
      when: (answers: { runtimeCommand: string }) => !!answers.runtimeCommand,
    },
  ]);

  // Platforms
  const platformChoices = await inquirer.prompt<PlatformAnswers>([
    {
      type: "checkbox",
      name: "platforms",
      message: "Supported platforms:",
      choices: [
        { name: "Linux x64", value: { os: "linux", arch: "x64" }, checked: true },
        { name: "Linux ARM64", value: { os: "linux", arch: "arm64" }, checked: true },
        { name: "macOS x64", value: { os: "darwin", arch: "x64" }, checked: true },
        { name: "macOS ARM64", value: { os: "darwin", arch: "arm64" }, checked: true },
        {
          name: "Windows x64",
          value: { os: "win32", arch: "x64", binaryExtension: ".exe" },
          checked: true,
        },
      ],
      validate: (input: Platform[]) =>
        input.length > 0 || "At least one platform required",
    },
  ]);

  // Build configuration
  const config: ExtensionConfig = {
    language: basic.language,
    displayName: basic.displayName,
    languageId: basic.languageId,
    activation: {
      fileExtensions: activation.fileExtensions,
      filePatterns: activation.fileExtensions.map((ext: string) => `*${ext}`),
      workspaceContains: activation.workspaceContains,
      additionalLanguageIds: activation.additionalLanguageIds.length > 0
        ? activation.additionalLanguageIds
        : undefined,
    },
    provider: {
      type: provider.type,
      binaryName: provider.binaryName,
      binaryArgs: provider.binaryArgs,
      assetSource: {
        repository: assetSource.repository,
        releaseTag: assetSource.releaseTag,
        assetNamePattern: `${provider.binaryName}-{platform}`,
      },
      platforms: platformChoices.platforms,
    },
    lsp: {
      enabled: lsp.lspType !== "none",
      proxyRequired: lsp.lspType === "proxy",
      providerName: lsp.providerName || basic.language,
      socketType: "unix",
    },
    dependencies: {
      vscodeExtensions: dependencies.vscodeExtensions,
      runtimeCheck: dependencies.runtimeCommand
        ? {
            command: dependencies.runtimeCommand,
            minVersion: dependencies.minVersion,
          }
        : undefined,
      tools: [],
    },
    providerSpecificConfig:
      lsp.lspType === "proxy"
        ? { lspServerName: basic.language }
        : {},
    analysis: {
      mode: "source-only",
      contextLines: 10,
    },
  };

  // Show configuration summary
  console.log(chalk.bold("\nConfiguration Summary:"));
  console.log(chalk.gray("─".repeat(40)));
  console.log(JSON.stringify(config, null, 2));
  console.log(chalk.gray("─".repeat(40)));

  // Confirm
  const confirm = await inquirer.prompt<{ proceed: boolean }>([
    {
      type: "confirm",
      name: "proceed",
      message: "Proceed with extension generation?",
      default: true,
    },
  ]);

  if (!confirm.proceed) {
    console.log(chalk.yellow("Generation cancelled."));
    process.exit(0);
  }

  return config;
}
