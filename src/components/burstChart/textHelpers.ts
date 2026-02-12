/**
 * Text Rendering Utilities
 * Text wrapping and multi-line text helpers
 */

/**
 * Wrap text into lines with maximum characters per line
 * @param line - Text to wrap
 * @param maxCharactersPerLine - Maximum characters per line (default: 15)
 * @returns Array of wrapped lines
 */
export function wordwrap(line: string, maxCharactersPerLine = 15): string[] {
  const words = line.split(' ');
  const lines: string[] = [];
  let currentLine: string[] = [];
  let currentLength = 0;

  words.forEach((word) => {
    if (currentLength + word.length > maxCharactersPerLine) {
      if (currentLine.length) {
        lines.push(currentLine.join(' '));
      }
      currentLine = [word];
      currentLength = word.length;
    } else {
      currentLine.push(word);
      currentLength += word.length + (currentLine.length > 0 ? 1 : 0); // +1 for space
    }
  });

  if (currentLine.length) {
    lines.push(currentLine.join(' '));
  }

  return lines;
}
