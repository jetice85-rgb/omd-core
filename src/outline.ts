/**
 * 提纲提取器
 * 从 .omd 字符串中提取标题层级树
 */

import type { OutlineNode } from './types.js';
import { parse } from './parse.js';

/**
 * 获取 .omd 文件的提纲
 */
export function getOutline(omdString: string): OutlineNode[] {
  const doc = parse(omdString);
  const lines = doc.body.split('\n');
  const nodes: OutlineNode[] = [];
  const stack: OutlineNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length;
    const text = match[2].trim();
    const node: OutlineNode = { level, text, line: i + 1, children: [] };

    // 找到合适的父级
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      nodes.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  }

  return nodes;
}

/**
 * 将提纲扁平化为带缩进的文本
 */
export function outlineToText(outline: OutlineNode[], indent = 0): string {
  let result = '';
  for (const node of outline) {
    result += '  '.repeat(indent) + `${node.level}. ${node.text}\n`;
    result += outlineToText(node.children, indent + 1);
  }
  return result;
}
