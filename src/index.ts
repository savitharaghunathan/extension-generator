#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { runInteractive } from "./lib/interactive.js";
import { loadConfig } from "./lib/config-loader.js";
import { validateConfig } from "./lib/validator.js";
import { generateExtension } from "./lib/generator.js";
import { prepareRepository, commitChanges, pushAndCreatePR } from "./lib/git.js";
import { readRepoConfig } from "./lib/repo-config.js";
import type { CliOptions, ExtensionConfig, GenerationContext, RepoConfig } from "./types/config.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8")
);

const program = new Command();

program
  .name("generate-extension")
  .description("Generate a new Konveyor language extension")
  .version(packageJson.version)
  .option("-c, --config <path>", "Path to configuration file (JSON/YAML)")
  .option("-i, --interactive", "Run in interactive mode")
  .option(
    "-r, --repo <path>",
    "Path to editor-extensions repo",
    "./editor-extensions"
  )
  .option(
    "-b, --branch <name>",
    "Branch name for changes (default: feature/{language}-extension)"
  )
  .option("--base-branch <name>", "Base branch to create from", "main")
  .option(
    "-d, --dry-run",
    "Show what would be generated without creating files",
    false
  )
  .option("-f, --force", "Overwrite existing files", false)
  .option("--no-commit", "Skip git commit")
  .option("--push", "Push branch to remote after generation", false)
  .option(
    "--create-pr",
    "Create a pull request (requires --push and gh CLI)",
    false
  );

program.parse();

async function main(): Promise<void> {
  const options = program.opts() as CliOptions;

  console.log(
    chalk.bold.blue("\n  Konveyor Extension Generator v" + packageJson.version + "\n")
  );

  // Validate options
  if (!options.config && !options.interactive) {
    console.error(
      chalk.red("Error: Please specify --config <path> or --interactive")
    );
    process.exit(1);
  }

  if (options.createPr && !options.push) {
    console.error(chalk.red("Error: --create-pr requires --push"));
    process.exit(1);
  }

  let config: ExtensionConfig;
  let repoConfig: RepoConfig;

  try {
    // Read configuration from target repository
    console.log(chalk.gray(`Reading configuration from ${options.repo}...`));
    repoConfig = await readRepoConfig(options.repo);
    console.log(chalk.gray(`  Version: ${repoConfig.version}`));
    console.log(chalk.gray(`  Release tag: ${repoConfig.releaseTag}`));
    if (repoConfig.csharpReleaseTag) {
      console.log(chalk.gray(`  C# Release tag: ${repoConfig.csharpReleaseTag}`));
    }

    // Get configuration
    if (options.config) {
      console.log(chalk.gray(`\nLoading config from ${options.config}...`));
      config = await loadConfig(options.config);
    } else {
      config = await runInteractive(options);
    }

    // Validate configuration
    console.log(chalk.gray("Validating configuration..."));
    const validationResult = validateConfig(config);
    if (!validationResult.success) {
      console.error(chalk.red("\nConfiguration errors:"));
      validationResult.errors.forEach((e) => console.error(chalk.red(`  - ${e}`)));
      process.exit(1);
    }

    config = validationResult.config;

    // Determine branch name
    const branchName =
      options.branch || `feature/${config.language}-extension`;

    // Display summary
    console.log(chalk.bold("\nGeneration Summary:"));
    console.log(chalk.gray("─".repeat(40)));
    console.log(`  Language:     ${chalk.cyan(config.language)}`);
    console.log(`  Display Name: ${chalk.cyan(config.displayName)}`);
    console.log(`  Provider:     ${chalk.cyan(config.provider.type)}`);
    console.log(`  LSP Enabled:  ${chalk.cyan(config.lsp.enabled ? "Yes" : "No")}`);
    console.log(`  Repository:   ${chalk.cyan(options.repo)}`);
    console.log(`  Branch:       ${chalk.cyan(branchName)}`);
    console.log(`  Base Branch:  ${chalk.cyan(options.baseBranch)}`);
    console.log(chalk.gray("─".repeat(40)));

    if (options.dryRun) {
      console.log(chalk.yellow("\nDry run mode - no files will be modified\n"));
    }

    // Prepare repository (unless dry run)
    let git;
    if (!options.dryRun) {
      console.log(chalk.gray("\nPreparing repository..."));
      git = await prepareRepository({
        repoPath: options.repo,
        baseBranch: options.baseBranch,
        featureBranch: branchName,
      });
      console.log(chalk.green(`  Created branch: ${branchName}`));
    }

    // Create generation context
    const context: GenerationContext = {
      config,
      options,
      repoPath: options.repo,
      branchName,
      templatesDir: join(__dirname, "..", "templates"),
      repoConfig,
    };

    // Generate extension
    console.log(chalk.gray("\nGenerating extension files..."));
    const result = await generateExtension(context);

    if (!result.success) {
      console.error(chalk.red("\nGeneration failed:"));
      result.errors.forEach((e) => console.error(chalk.red(`  - ${e}`)));
      process.exit(1);
    }

    // Display operations
    console.log(chalk.bold("\nOperations:"));
    result.operations.forEach((op) => {
      const icon = op.type === "create" ? chalk.green("+") : chalk.yellow("~");
      console.log(`  ${icon} ${op.path}`);
      if (op.changes && op.changes.length > 0) {
        op.changes.forEach((change) => {
          console.log(chalk.gray(`      → ${change}`));
        });
      }
      // Show content for new files in dry-run mode
      if (options.dryRun && op.content) {
        console.log(chalk.gray("\n    ┌" + "─".repeat(60)));
        const lines = op.content.split("\n");
        lines.forEach((line) => {
          console.log(chalk.gray("    │ ") + line);
        });
        console.log(chalk.gray("    └" + "─".repeat(60) + "\n"));
      }
      // Show diff for modified files in dry-run mode
      if (options.dryRun && op.diff) {
        console.log(chalk.gray("\n    ┌" + "─".repeat(60)));
        const lines = op.diff.split("\n");
        lines.forEach((line) => {
          if (line.startsWith("+")) {
            console.log(chalk.gray("    │ ") + chalk.green(line));
          } else if (line.startsWith("-")) {
            console.log(chalk.gray("    │ ") + chalk.red(line));
          } else {
            console.log(chalk.gray("    │ ") + line);
          }
        });
        console.log(chalk.gray("    └" + "─".repeat(60) + "\n"));
      }
    });

    // Commit changes (unless dry run or --no-commit)
    if (!options.dryRun && options.noCommit !== false && git) {
      console.log(chalk.gray("\nCommitting changes..."));
      const commitHash = await commitChanges(git, config.language, config.displayName);
      console.log(chalk.green(`  Committed: ${commitHash.substring(0, 7)}`));

      // Push and create PR if requested
      if (options.push) {
        console.log(chalk.gray("\nPushing to remote..."));
        await git.push(["-u", "origin", branchName]);
        console.log(chalk.green(`  Pushed: origin/${branchName}`));

        if (options.createPr) {
          console.log(chalk.gray("\nCreating pull request..."));
          const prUrl = await pushAndCreatePR(git, {
            branch: branchName,
            language: config.language,
            displayName: config.displayName,
          });
          console.log(chalk.green(`  PR created: ${prUrl}`));
        }
      }
    }

    console.log(chalk.bold.green("\nExtension generated successfully!"));

    if (!options.dryRun) {
      console.log(chalk.gray("\nNext steps:"));
      console.log(`  1. cd ${options.repo}`);
      console.log(`  2. npm install`);
      console.log(`  3. npm run build`);
      if (!options.push) {
        console.log(`  4. git push -u origin ${branchName}`);
      }
    }
  } catch (error) {
    console.error(
      chalk.red(`\nError: ${error instanceof Error ? error.message : error}`)
    );
    process.exit(1);
  }
}

main();
