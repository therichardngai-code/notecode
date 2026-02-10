/**
 * Table Formatting Utilities
 * ASCII table generation for CLI output
 */

export interface Column {
  key: string;
  header: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
}

/**
 * Truncate a string to a maximum length with ellipsis
 * @param str String to truncate
 * @param maxLen Maximum length
 * @returns Truncated string with ellipsis if needed
 */
export function truncate(str: string | null | undefined, maxLen: number): string {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

/**
 * Pad a string to a specific width
 * @param str String to pad
 * @param width Target width
 * @param align Alignment (left, right, center)
 * @returns Padded string
 */
export function pad(str: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string {
  if (str.length >= width) return str;

  const padding = width - str.length;

  switch (align) {
    case 'right':
      return ' '.repeat(padding) + str;
    case 'center': {
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
    }
    default:
      return str + ' '.repeat(padding);
  }
}

/**
 * Format data as an ASCII table
 * @param rows Array of row objects
 * @param columns Column definitions
 */
export function formatTable<T extends Record<string, unknown>>(
  rows: T[],
  columns: Column[]
): void {
  if (rows.length === 0) {
    console.log('No items found.');
    return;
  }

  // Calculate column widths
  const widths = columns.map((col) => {
    const values = rows.map((row) => String(row[col.key] ?? '').length);
    return Math.max(col.header.length, ...values, col.width ?? 0);
  });

  // Print header
  const header = columns
    .map((col, i) => pad(col.header, widths[i], col.align))
    .join('  ');
  console.log(header);

  // Print separator
  const separator = columns.map((_, i) => '─'.repeat(widths[i])).join('──');
  console.log(separator);

  // Print rows
  for (const row of rows) {
    const line = columns
      .map((col, i) => {
        const value = String(row[col.key] ?? '');
        return pad(value, widths[i], col.align);
      })
      .join('  ');
    console.log(line);
  }
}

/**
 * Format data as JSON (for --json flag)
 * @param data Data to format
 */
export function formatJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Print a key-value detail line
 * @param label Label text
 * @param value Value text
 * @param labelWidth Width for label column
 */
export function printDetail(label: string, value: string | number | null | undefined, labelWidth = 12): void {
  const formattedLabel = `${label}:`.padEnd(labelWidth);
  console.log(`${formattedLabel} ${value ?? '-'}`);
}
