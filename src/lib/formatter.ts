/**
 * @fileOverview This file contains functions that formats subtitle strings
 */

"use strict";

export interface INameDict {
  [eng: string]: string;
}

export interface IOrganizedNameDict {
  fullNames: INameDict;
  partialNames: INameDict;
}

export const NAME_DELIMITER = "·";
export const EOL = "\r\n"; // using Windows style EOL

/**
 * Recognize a line in a dialog pattern and fix its formatting
 *
 * @param line {string}
 * @returns {string}
 */
export function formatDialogIfIsDialog(line: string): string {

  if (!line) {
    return line;
  }

  // recognizes the leading dash followed by a sentence
  const result = line.match(/^\s*-\s*([^\s-][^-]*)\s*-?\s*(.+)?$/);

  if (result == null) {
    return line; // do nothing if a dialog pattern is not found
  }

  let first: string = result[1];
  let second: string = result[2];

  first = first.replace(/\s+$/, "");

  if (!second) {
    return first; // if second half of the dialog is not found
  }

  second = second.replace(/\s+$/, "");

  return "- " + first + "  - " + second;

}

/**
 * Recognize a line in a lyrics pattern and fix its formatting
 *
 * @param line {string}
 * @returns {string}
 */
export function formatLyricsIfIsLyrics(line: string) {

  if (!line) {
    return line;
  }

  // recognizes the leading pound followed by the lyrics
  const result = line.match(/^\s*#\s*([^\s#][^#]*)\s*#?\s*$/);

  if (result == null) {
    return line; // do nothing if a lyrics pattern is not found
  }

  let lyrics: string = result[1];

  lyrics = lyrics.replace(/\s+$/, "");

  return "# " + lyrics + " #";
}

/**
 * Fix the number of spaces before and after punctuations, as well as replacing all
 * full-width punctuations with half-width punctuations
 *
 * @param line {string}
 * @returns {string}
 */
export function formatPunctuations(line: string): string {

  if (!line) {
    return line;
  }

  // delete leading "..."
  line = line.replace(/(^|-\s*)\.\.\./g, "$1");

  // replace "..." with "&&&" for now so that it's not affected later
  line = line.replace(/\s*\.\.\.\s*/g, "&&& ");

  // handle regular punctuations
  line = line.replace(/\s*[？?]\s*/g, "? ");
  line = line.replace(/\s*[！!]\s*/g, "! ");

  // handle commas and periods
  line = line.replace(/\s*([,.])\s*/g, "$1 ");

  // handle abbreviations
  const abbreviations = line.match(/([A-Z]\.\s*)+/g);
  abbreviations.forEach((abbreviation: string) => {
    const result = abbreviation.replace(/\.\s*/g, ".");
    line = line.replace(abbreviation, result + " ");
  });

  // handle quotes
  line = line.replace(/^\s*["“”]\s*/, "\""); // quotes at the beginning
  line = line.replace(/\s*["“”]\s*$/, "\""); // quotes at the end

  // put back the "..."
  line = line.replace(/&&&/, "...");

  return line;
}

/**
 * Cleans up a line of raw cc subtitles
 *
 * @param ccLine {string}
 * @returns {string} the result, null if it ends up being empty
 */
export function ccCleanup(ccLine: string): string {

  // check for null inputs
  if (ccLine == null) {
    return ccLine;
  }

  // remove credit
  if (/Synced and corrected by/.test(ccLine)) {
    return null;
  }

  ccLine = ccLine.replace(/\[[^\]]]/g, " "); // hearing aids enclosed in square brackets
  ccLine = ccLine.replace(/♪/g, "#"); // replace music sign with pound for lyrics lines
  ccLine = ccLine.replace(/<\/?i>/g, " "); // get rid of the italic markers
  ccLine = ccLine.replace(/\s+/g, " "); // clean up multiple spaces
  ccLine = ccLine.replace(/^\s+|\s+$/g, ""); // remove preceding and trailing spaces
  ccLine = ccLine.replace(/^_+$/, ""); // remove meaningless underscores

  if (/^\s*$/.test(ccLine)) {
    return null;
  }

  return ccLine;
}

/**
 * Takes the string of an entire name dictionary file and construct an object with it
 *
 * @param text {string}
 * @returns {INameDict}
 */
export function constructRawNameDict(text: string): INameDict {
  const entries = text.replace(/\r\n?/g, "\n").split("\n");
  const nameDict = {};
  entries.forEach((entry) => {
    const names = entry.split(/\s*=\s*/);
    const eng = names[0];
    const chs = names[1];
    if (chs) {
      nameDict[eng] = chs.replace(/\s+$/, ""); // remove trailing spaces
    }
  });
  return nameDict;
}

/**
 * Organizes a raw name dictionary into full names and partial names. For example, "Amy Santiago"
 * is a full name, while "Amy" is a partial name.
 *
 * @param rawNameDict {INameDict}
 * @returns {IOrganizedNameDict}
 */
export function organizeNameDict(rawNameDict: INameDict): IOrganizedNameDict {
  const halfNames = {};
  const fullNames = {};
  Object.keys(rawNameDict).forEach((eng) => {
    const chs = rawNameDict[eng];
    // for names written in a full name format such as "托尼·斯塔克" or "托尼/斯塔克"
    if (chs.match(/[·\/]/)) {
      const chsSegments = chs.split(/[·\/]/);
      const engSegments = eng.split(" ");
      if (engSegments.length === chsSegments.length) {
        engSegments.forEach((name, index) => {
          halfNames[name] = chsSegments[index]; // map half names to their translations
        });
      }
      fullNames[eng] = chs.replace(/\//g, NAME_DELIMITER);
    }
  });
  return {fullNames, partialNames: halfNames};
}

/**
 * Translates all the remaining untranslated names in the given subtitle string
 *
 * @param subString {string}
 * @param nameDict {IOrganizedNameDict}
 */
export function translateNames(subString: string, nameDict: IOrganizedNameDict): string {
  // first translate names in full name format
  Object.keys(nameDict.fullNames).sort((name) => name.length).reverse().forEach((eng) => {
    subString = subString.replace(new RegExp(eng, "g"), nameDict.fullNames[eng]);
  });
  // then translate partial names
  Object.keys(nameDict.partialNames).sort((name) => name.length).reverse().forEach((eng) => {
    subString = subString.replace(new RegExp(eng, "g"), nameDict.partialNames[eng]);
  });
  return subString;
}
