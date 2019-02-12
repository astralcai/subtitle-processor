/**
 * @fileOverview This is the default entry point of subtitle-processor
 */

"use strict";

import {SubtitleList} from "./lib/subtitles";

export {SubtitleList};

export function loadCc(ccString: string): SubtitleList {
  return SubtitleList.fromCc(ccString);
}

export function loadSubtitles(subtitleString: string): SubtitleList {
  return SubtitleList.fromSubtitles(subtitleString);
}
