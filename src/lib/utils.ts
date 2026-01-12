/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert string to PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((word) => capitalize(word.toLowerCase()))
    .join("");
}

/**
 * Convert string to camelCase
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Get platform directory name
 */
export function getPlatformDir(os: string, arch: string): string {
  switch (os) {
    case "linux":
      return arch === "arm64" ? "linux-aarch64" : "linux-x86_64";
    case "darwin":
      return arch === "arm64" ? "macos-arm64" : "macos-x86_64";
    case "win32":
      return "windows-x64";
    default:
      throw new Error(`Unsupported platform: ${os}`);
  }
}

/**
 * Extract extension name from full extension ID
 */
export function extractExtensionName(extensionId: string): string {
  const parts = extensionId.split(".");
  return parts[parts.length - 1];
}
