/**
 * Turns typewriter quotes into typographer's ("curly") quotes.
 * Runs on every piece of text the site prints, so anything typed in the
 * admin with straight quotes still comes out right.
 */
export function curly(text: string): string {
  return (
    text
      // A double quote at the start, or after a space or opening bracket, opens.
      .replace(/(^|[\s([{—–-])"/g, '$1“')
      .replace(/"/g, '”')
      // 'n' and '90s: a dropped letter or decade is an apostrophe, not an opening quote.
      .replace(/(^|[\s([{—–-])'(n'|\d0s)/g, (_, before, rest) => `${before}’${rest.replace("'", '’')}`)
      // A single quote after a space, opening bracket or opening double quote opens.
      .replace(/(^|[\s([{“—–-])'/g, '$1‘')
      // Every other one is an apostrophe or a closing quote; they are the same character.
      .replace(/'/g, '’')
  );
}

/** The reverse, for comparing text no matter which kind of quote was typed. */
export function straight(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}
