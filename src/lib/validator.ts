import { ExtensionConfigSchema, type ExtensionConfig } from "../types/config.js";
import { ZodError } from "zod";

export interface ValidationResult {
  success: boolean;
  config: ExtensionConfig;
  errors: string[];
}

export function validateConfig(config: unknown): ValidationResult {
  try {
    const validated = ExtensionConfigSchema.parse(config);
    return {
      success: true,
      config: validated,
      errors: [],
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map((e) => {
        const path = e.path.join(".");
        return path ? `${path}: ${e.message}` : e.message;
      });
      return {
        success: false,
        config: config as ExtensionConfig,
        errors,
      };
    }
    throw error;
  }
}
