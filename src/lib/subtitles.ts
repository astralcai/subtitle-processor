/**
 * @fileOverview This file contains definition for the data structure used to store subtitles
 */

"use strict";

import * as formatter from "./formatter";
import {EOL, INameDict} from "./formatter";

interface ISubtitleLine {
  index: string;
  timestamp: string;
  eng: string;
  chs: string;
}

/**
 * The SubtitleList contains a list of SubtitleLines
 */
export class SubtitleList {

  /**
   * Constructs a SubtitleList with the complete string extracted from a subtitle file
   *
   * @param subtitleString {string}
   */
  public static fromSubtitles(subtitleString: string): SubtitleList {
    const groupList = splitSubtitleStringIntoGroups(subtitleString);
    const lineList: ISubtitleLine[] = groupList.map(constructCcLineWithStringGroup);
    return new SubtitleList(lineList);
  }

  /**
   * Constructs a SubtitleList with the complete string extracted from a raw cc file
   *
   * @param ccString {string}
   */
  public static fromCc(ccString: string): SubtitleList {
    const groupList = splitSubtitleStringIntoGroups(ccString);
    const lineList: ISubtitleLine[] = groupList.map(constructSubtitleLineWithStringGroup);
    return new SubtitleList(lineList);
  }

  public lines: ISubtitleLine[];

  /**
   * Default constructor, not to be called directly
   *
   * @param lines {ISubtitleLine[]}
   */
  private constructor(lines: ISubtitleLine[]) {
    this.lines = lines;
  }

  /**
   * Concatenates all subtitle lines into a complete string to be printed
   *
   * @returns {string} the complete subtitle string
   */
  public toString(): string {
    let result = "";
    this.lines.forEach((line) => {
      result += printSubtitleLine(line) + EOL;
    });
    return result;
  }

  /**
   * Cleans up a raw cc subtitle list
   *
   * @returns {SubtitleList} self for chaining
   */
  public cleanUpCcLines(): SubtitleList {
    this.lines.forEach((line) => {
      line.eng = formatter.ccCleanup(line.eng);
    });
    this.lines = this.lines.filter((line) => {
      return line != null;
    });
    return this;
  }

  /**
   * Reformat all the lines
   *
   * @returns {SubtitleList} self for chaining
   */
  public reformat(): SubtitleList {
    this.lines.forEach((line) => {
      line.eng = reformatLine(line.eng);
      line.chs = reformatLine(line.chs);
    });
    this.lines = this.lines.filter((line) => line.chs || line.eng);
    return this;
  }

  /**
   * Finds all untranslated English words in all Chinese lines, typically names
   *
   * @returns {string[]}
   */
  public findUntranslatedNames(): string[] {

    // first find all untranslated strings in the Chinese lines
    const fullNames = this.lines.map((line) => line.chs)
      .filter(/[a-zA-Z]+/.test)
      .map((line) => new Set(line.match(/([a-zA-Z][a-zA-Z'\\.]*\s)*([a-zA-Z']+)/gi)))
      .reduce((prev, curr) => new Set([...prev, ...curr]));

    // find all the partial names
    const partialNames = Array.from(fullNames).map((name) => {
      const segments = name.match(/[a-zA-Z']+/gi);
      return segments.length > 1 ? new Set(segments) : new Set();
    }).reduce((prev, curr) => new Set([...prev, ...curr]));

    // filter out partial names to avoid repetition
    return Array.from(fullNames).filter((name) => !partialNames.has(name)).sort();
  }

  /**
   * Translates all names according to the name dictionary given
   *
   * @param rawNameDict {INameDict} a dictionary of names
   * @returns {SubtitleList} self for chaining
   */
  public translateNames(rawNameDict: INameDict): SubtitleList {
    let allChs = this.lines.map((line) => line.chs != null ? line.chs : "").join("\n");
    allChs = formatter.translateNames(allChs, formatter.organizeNameDict(rawNameDict));
    const allChsList = allChs.split("\n");
    this.lines.forEach((line, index) => {
      line.chs = allChsList[index] !== "" ? allChsList[index] : null;
    });
    return this;
  }
}

/**
 * Helper function that prints out a SubtitleLine
 *
 * @param line {ISubtitleLine}
 * @returns {string}
 */
function printSubtitleLine(line: ISubtitleLine): string {
  const header = line.index + EOL + line.timestamp + EOL;
  const eng = line.eng ? line.eng + EOL : "";
  const chs = line.chs ? line.chs + EOL : "";
  return header + eng + chs;
}

/**
 * Helper function that does a reformat on a subtitle string
 *
 * @param line {string}
 * @returns {string}
 */
function reformatLine(line: string): string {
  if (!line) {
    return null;
  }
  line = line.replace(/^\s*/, ""); // delete leading spaces
  line = line.replace(/\s*$/, ""); // trailing spaces
  line = formatter.formatPunctuations(line);
  line = formatter.formatLyricsIfIsLyrics(line);
  line = formatter.formatDialogIfIsDialog(line);
  return line;
}

/**
 * Takes the raw string for an entire subtitle file and split it into lines, each
 * containing the index, the timestamp, and the subtitles
 *
 * @param subString {string}
 * @returns {string[]}
 */
export function splitSubtitleStringIntoGroups(subString: string): string[] {

  // each group is a subtitle line
  const groups: string[] = [];

  // replace all EOL with "\n" for easy processing
  subString = subString.replace(/\r\n?/g, "\n");

  // split subtitle string into lines
  const rawList: string[] = subString.split(/\n *([0-9]+ *\n)/g); // separate groups by index string

  let buffer: string = rawList.shift(); // the first item is already a complete line group
  rawList.forEach((token) => {
    if (/^[0-9]+\s*\n$/.test(token)) {
      // store existing content of buffer and start new buffer for new subtitle group
      groups.push(buffer.replace(/\s*$/, "")); // remove trailing whitespace characters
      buffer = token.replace(/ /g, ""); // remove trailing spaces
    } else {
      // append content to buffer, removing trailing spaces for all internal lines
      buffer = buffer + token.replace(/ *\n/g, "\n");
    }
  });

  return groups;
}

/**
 * Takes the raw string of a cc line and create a ISubtitleLine object
 *
 * @param group {string}
 * @returns {ISubtitleLine}
 */
function constructCcLineWithStringGroup(group: string): ISubtitleLine {
  const entry = group.split("\n");
  const [index, timestamp] = entry.slice(0, 2); // index and timestamp are fixed
  const eng = entry.slice(2).join(" "); // combine subtitle into one single line for raw cc
  return {index, timestamp, eng, chs: null};
}

/**
 * Takes the raw string of a subtitle line and create a ISubtitleLine object
 *
 * @param group {string}
 * @returns {ISubtitleLine}
 */
function constructSubtitleLineWithStringGroup(group: string): ISubtitleLine {
  const entry = group.split("\n");
  const [index, timestamp] = entry.slice(0, 2); // index and timestamp are fixed
  let eng: string = null;
  let chs: string = null;
  if (entry.length === 3) {
    // assuming this group has only one Chinese line
    chs = entry[2];
  } else if (entry.length === 4) {
    // for a regular group with one English line and one Chinese line
    [eng, chs] = entry.slice(2, 4);
  } else if (entry.length > 4) {
    // throw error for groups larger than 4 lines long
    throw new Error("There are two many lines in group: \"" + group + "\"");
  }
  return {index, timestamp, eng, chs};
}
