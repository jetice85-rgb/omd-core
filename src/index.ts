/**
 * OMD 核心引擎
 * omd-core — 智慧生而共通
 */

export { parse, fromMarkdown, toMarkdown } from './parse.js';
export { stringify } from './stringify.js';
export { getOutline, outlineToText } from './outline.js';
export { validate } from './validate.js';
export { toDocx, omdToDocx } from './convert.js';
export type {
  OMDDocument,
  OMDBody,
  RenderConfig,
  RenderDocument,
  RenderSheet,
  RenderSlide,
  SlidePage,
  SlideElement,
  CellStyle,
  Relation,
  RelationType,
  OutlineNode,
} from './types.js';
export type { ValidationResult } from './validate.js';
