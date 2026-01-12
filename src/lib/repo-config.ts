import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type { RepoConfig } from "../types/config.js";

export type { RepoConfig };

/**
 * Read configuration from the editor-extensions repository
 */
export async function readRepoConfig(repoPath: string): Promise<RepoConfig> {
  const config: RepoConfig = {
    version: "0.4.0",
    releaseTag: "v0.8.0-beta.5",
    org: "konveyor",
    repo: "kai",
    rulesetOrg: "konveyor",
    rulesetRepo: "rulesets",
  };

  // Read version from root package.json
  const rootPkgPath = join(repoPath, "package.json");
  if (existsSync(rootPkgPath)) {
    try {
      const rootPkg = JSON.parse(await readFile(rootPkgPath, "utf-8"));
      if (rootPkg.version) {
        config.version = rootPkg.version;
      }
    } catch (e) {
      // Use default
    }
  }

  // Read release tag and other config from collect-assets.js
  const collectAssetsPath = join(repoPath, "scripts/collect-assets.js");
  if (existsSync(collectAssetsPath)) {
    try {
      const content = await readFile(collectAssetsPath, "utf-8");

      // Parse releaseTag from the parseCli defaults
      const releaseTagMatch = content.match(/releaseTag:\s*["']([^"']+)["']/);
      if (releaseTagMatch) {
        config.releaseTag = releaseTagMatch[1];
      }

      // Parse csharpReleaseTag
      const csharpReleaseTagMatch = content.match(/csharpReleaseTag:\s*["']([^"']+)["']/);
      if (csharpReleaseTagMatch) {
        config.csharpReleaseTag = csharpReleaseTagMatch[1];
      }

      // Parse org
      const orgMatch = content.match(/org:\s*["']([^"']+)["']/);
      if (orgMatch) {
        config.org = orgMatch[1];
      }

      // Parse repo
      const repoMatch = content.match(/repo:\s*["']([^"']+)["']/);
      if (repoMatch) {
        config.repo = repoMatch[1];
      }

      // Parse rulesetOrg
      const rulesetOrgMatch = content.match(/rulesetOrg:\s*["']([^"']+)["']/);
      if (rulesetOrgMatch) {
        config.rulesetOrg = rulesetOrgMatch[1];
      }

      // Parse rulesetRepo
      const rulesetRepoMatch = content.match(/rulesetRepo:\s*["']([^"']+)["']/);
      if (rulesetRepoMatch) {
        config.rulesetRepo = rulesetRepoMatch[1];
      }
    } catch (e) {
      // Use defaults
    }
  }

  return config;
}

/**
 * Get existing extensions from the repo
 */
export async function getExistingExtensions(repoPath: string): Promise<string[]> {
  const extensions: string[] = [];
  const vscodePath = join(repoPath, "vscode");

  // Read root package.json to get workspaces
  const rootPkgPath = join(repoPath, "package.json");
  if (existsSync(rootPkgPath)) {
    try {
      const rootPkg = JSON.parse(await readFile(rootPkgPath, "utf-8"));
      if (rootPkg.workspaces) {
        for (const ws of rootPkg.workspaces) {
          if (ws.startsWith("vscode/") && ws !== "vscode/core") {
            const extName = ws.replace("vscode/", "");
            extensions.push(extName);
          }
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  return extensions;
}
