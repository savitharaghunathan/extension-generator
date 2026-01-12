import { z } from "zod";

// Platform schema
export const PlatformSchema = z.object({
  os: z.enum(["linux", "darwin", "win32"]),
  arch: z.enum(["x64", "arm64"]),
  binaryExtension: z.string().optional(),
});

export type Platform = z.infer<typeof PlatformSchema>;

// Tool schema
export const ToolSchema = z.object({
  name: z.string().min(1),
  path: z.string().optional(),
  required: z.boolean(),
  installInstructions: z.string().optional(),
});

export type Tool = z.infer<typeof ToolSchema>;

// Runtime check schema
export const RuntimeCheckSchema = z.object({
  command: z.string().min(1),
  versionPattern: z.string().optional(),
  minVersion: z.string().optional(),
});

export type RuntimeCheck = z.infer<typeof RuntimeCheckSchema>;

// Asset source schema
export const AssetSourceSchema = z.object({
  repository: z.string().min(1),
  releaseTag: z.string().min(1),
  assetNamePattern: z.string().optional(),
});

export type AssetSource = z.infer<typeof AssetSourceSchema>;

// Activation schema
export const ActivationSchema = z.object({
  fileExtensions: z.array(z.string()).min(1),
  filePatterns: z.array(z.string()).optional(),
  workspaceContains: z.array(z.string()).optional().default([]),
  additionalLanguageIds: z.array(z.string()).optional(),
});

export type Activation = z.infer<typeof ActivationSchema>;

// Provider schema
export const ProviderSchema = z.object({
  type: z.enum(["generic", "standalone", "custom"]),
  binaryName: z.string().min(1),
  binaryArgs: z.array(z.string()).optional().default([]),
  assetSource: AssetSourceSchema.optional(),
  platforms: z.array(PlatformSchema).optional().default([
    { os: "linux", arch: "x64" },
    { os: "linux", arch: "arm64" },
    { os: "darwin", arch: "x64" },
    { os: "darwin", arch: "arm64" },
    { os: "win32", arch: "x64", binaryExtension: ".exe" },
  ]),
});

export type Provider = z.infer<typeof ProviderSchema>;

// LSP schema
export const LspSchema = z.object({
  enabled: z.boolean(),
  proxyRequired: z.boolean().optional().default(false),
  providerName: z.string().optional(),
  socketType: z.enum(["unix", "tcp", "pipe"]).optional().default("unix"),
});

export type Lsp = z.infer<typeof LspSchema>;

// Dependencies schema
export const DependenciesSchema = z.object({
  vscodeExtensions: z.array(z.string()).optional().default([]),
  runtimeCheck: RuntimeCheckSchema.optional(),
  tools: z.array(ToolSchema).optional().default([]),
});

export type Dependencies = z.infer<typeof DependenciesSchema>;

// Analysis schema
export const AnalysisSchema = z.object({
  mode: z.enum(["source-only", "full"]).optional().default("source-only"),
  contextLines: z.number().int().positive().optional().default(10),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

// Main extension configuration schema
export const ExtensionConfigSchema = z.object({
  // Basic information
  language: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9-]*$/, "Must be lowercase alphanumeric with hyphens"),
  displayName: z.string().min(1),
  languageId: z.string().min(1),

  // Activation
  activation: ActivationSchema,

  // Provider
  provider: ProviderSchema,

  // LSP
  lsp: LspSchema,

  // Dependencies
  dependencies: DependenciesSchema.optional().default({}),

  // Provider-specific config
  providerSpecificConfig: z.record(z.unknown()).optional().default({}),

  // Analysis
  analysis: AnalysisSchema.optional().default({}),
});

export type ExtensionConfig = z.infer<typeof ExtensionConfigSchema>;

// CLI options
export interface CliOptions {
  config?: string;
  interactive?: boolean;
  repo: string;
  branch?: string;
  baseBranch: string;
  dryRun: boolean;
  force: boolean;
  noCommit: boolean;
  push: boolean;
  createPr: boolean;
}

// Repo configuration read from editor-extensions
export interface RepoConfig {
  version: string;
  releaseTag: string;
  csharpReleaseTag?: string;
  org: string;
  repo: string;
  rulesetOrg: string;
  rulesetRepo: string;
}

// Generation context
export interface GenerationContext {
  config: ExtensionConfig;
  options: CliOptions;
  repoPath: string;
  branchName: string;
  templatesDir: string;
  repoConfig: RepoConfig;
}

// File operation result
export interface FileOperation {
  type: "create" | "modify";
  path: string;
  description: string;
  changes?: string[];  // Specific changes being made
  content?: string;    // Full content for new files (used in dry-run)
  diff?: string;       // Diff/patch content for modified files (used in dry-run)
}

// Generation result
export interface GenerationResult {
  success: boolean;
  operations: FileOperation[];
  branchName: string;
  commitHash?: string;
  prUrl?: string;
  errors: string[];
}
