import path from 'path';
import { fileURLToPath } from 'url';

// Get the absolute path of the project root
// Note: This assumes the compiled code runs from somewhere inside the project directory.
// Adjust if your deployment structure is different.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// This needs to navigate up from `server/dist/core` to the project root `Navo`
export const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

// Define a whitelist of directories where code generation is allowed.
// Paths should be relative to the project root.
const ALLOWED_DIRECTORIES = [
  'server/src/modules',
  'frontend/src/app/api', // Example for frontend routes
  'packages/shared/schemas',
];

/**
 * Normalizes a given path and resolves it against the project root.
 * It prevents directory traversal attacks.
 *
 * @param targetPath The path provided by the AI or user.
 * @returns The absolute, normalized path.
 * @throws An error if the path attempts to traverse upwards.
 */
function normalizePath(targetPath: string): string {
  // path.normalize to handle mixed slashes, etc.
  // path.resolve to make it absolute from the project root.
  const resolvedPath = path.resolve(PROJECT_ROOT, path.normalize(targetPath));

  // Security check: Ensure the resolved path is still within the project root.
  // This is the primary defense against directory traversal (e.g., `../../../../etc/passwd`).
  if (!resolvedPath.startsWith(PROJECT_ROOT)) {
    throw new Error(
      `Path traversal detected. The path "${targetPath}" resolves outside the project root.`,
    );
  }

  return resolvedPath;
}

/**
 * Validates if a given path is within one of the whitelisted directories
 * for code generation.
 *
 * @param targetPath The path to validate, relative to the project root.
 * @returns True if the path is safe and allowed, false otherwise.
 * @throws An error if the path is invalid or outside the project root.
 */
export function isSafeAndAllowedPath(targetPath: string): boolean {
  try {
    const absoluteTargetPath = normalizePath(targetPath);

    // Check if the normalized path starts with any of the allowed directory paths.
    const isAllowed = ALLOWED_DIRECTORIES.some(allowedDir => {
      const absoluteAllowedDir = path.resolve(PROJECT_ROOT, allowedDir);
      return absoluteTargetPath.startsWith(absoluteAllowedDir);
    });

    if (!isAllowed) {
      console.warn(
        `Path validation failed: "${targetPath}" is not within any of the allowed directories.`,
      );
      return false;
    }

    console.log(`Path validation successful for: "${targetPath}"`);
    return true;

  } catch (error) {
    console.error(`Path validation error: ${error.message}`);
    return false;
  }
}

/**
 * A utility function that combines normalization and validation.
 * Throws an error if the path is invalid or not allowed.
 *
 * @param targetPath The path to process.
 * @returns The safe, absolute path if validation succeeds.
 */
export function getSafeAbsolutePath(targetPath: string): string {
  const normalizedPath = normalizePath(targetPath);

  const isAllowed = ALLOWED_DIRECTORIES.some(allowedDir => {
    const absoluteAllowedDir = path.resolve(PROJECT_ROOT, allowedDir);
    return normalizedPath.startsWith(absoluteAllowedDir);
  });

  if (!isAllowed) {
    throw new Error(
      `The path "${targetPath}" is not in a whitelisted directory for code generation.`,
    );
  }

  return normalizedPath;
}
