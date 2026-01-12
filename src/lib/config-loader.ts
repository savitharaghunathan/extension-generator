import { readFile } from "fs/promises";
import { extname } from "path";
import yaml from "js-yaml";
import type { ExtensionConfig } from "../types/config.js";

export async function loadConfig(configPath: string): Promise<ExtensionConfig> {
  const content = await readFile(configPath, "utf-8");
  const ext = extname(configPath).toLowerCase();

  let parsed: unknown;

  if (ext === ".yaml" || ext === ".yml") {
    parsed = yaml.load(content);
  } else if (ext === ".json") {
    parsed = JSON.parse(content);
  } else {
    // Try JSON first, then YAML
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = yaml.load(content);
    }
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Invalid configuration file: ${configPath}`);
  }

  return parsed as ExtensionConfig;
}
