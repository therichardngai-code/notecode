/**
 * Regex Validation Utilities
 * Helpers for validating and testing regex patterns in approval gate configuration
 */

/**
 * Check if a string is a valid regex pattern
 * @param pattern - The regex pattern to validate
 * @returns true if valid regex, false otherwise
 */
export function isValidRegex(pattern: string): boolean {
  if (!pattern || pattern.trim() === '') {
    return true; // Empty patterns are considered valid (will be filtered out on save)
  }
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * Test if a regex pattern matches an input string
 * @param pattern - The regex pattern to test
 * @param input - The input string to test against
 * @returns true if pattern matches input, false otherwise (or if pattern is invalid)
 */
export function testRegexPattern(pattern: string, input: string): boolean {
  if (!pattern || !input) {
    return false;
  }
  try {
    return new RegExp(pattern, 'i').test(input);
  } catch {
    return false;
  }
}

/**
 * Get regex validation error message
 * @param pattern - The regex pattern to validate
 * @returns Error message if invalid, null if valid
 */
export function getRegexError(pattern: string): string | null {
  if (!pattern || pattern.trim() === '') {
    return null;
  }
  try {
    new RegExp(pattern);
    return null;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return error.message.replace('Invalid regular expression: ', '');
    }
    return 'Invalid regex pattern';
  }
}
