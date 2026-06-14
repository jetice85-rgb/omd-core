/**
 * OMD 解析器
 * omd 字符串 → OMDDocument
 */

import * as yaml from 'js-yaml';
import type { OMDDocument, OMDBody, RenderConfig } from './types.js';

/**
 * 解析 .omd 文件字符串为结构化文档
 */
export function parse(omdString: string): OMDDocument {
  const trimmed = omdString.trimStart();

  // 1. 提取头部 YAML（语义元数据）
  const headerMatch = trimmed.match(/^---\n([\s\S]*?)\n---\n/);
  let meta: OMDBody = { title: '' };
  let rest = trimmed;

  if (headerMatch) {
    try {
      const parsed = yaml.load(headerMatch[1]) as Record<string, unknown>;
      meta = {
        title: String(parsed.title || ''),
        author: parsed.author ? String(parsed.author) : undefined,
        created: parsed.created ? String(parsed.created) : undefined,
        modified: parsed.modified ? String(parsed.modified) : undefined,
        tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : undefined,
        status: parsed.status ? String(parsed.status) : undefined,
        template: parsed.template ? String(parsed.template) : undefined,
        version: parsed.version ? String(parsed.version) : undefined,
        formulas: parsed.formulas as Record<string, string> | undefined,
        relations: parsed.relations as OMDBody['relations'] | undefined,
        references: Array.isArray(parsed.references)
          ? parsed.references.map(String)
          : undefined,
      };
    } catch {
      // YAML 解析失败，使用默认值
    }
    rest = trimmed.slice(headerMatch[0].length);
  }

  // 2. 提取尾部 <!--OMD-->（呈现元数据）
  const renderMatch = rest.match(/<!--OMD\n([\s\S]*?)\n-->/);
  let render: RenderConfig | undefined;
  let body = rest;

  if (renderMatch) {
    try {
      render = yaml.load(renderMatch[1]) as RenderConfig;
    } catch {
      // 尾部 YAML 解析失败，忽略
    }
    body = rest.slice(0, renderMatch.index).trim();
  } else {
    body = rest.trim();
  }

  return { meta, body, render };
}

/**
 * 纯 MD 字符串 → OMD（自动补充头部尾部）
 */
export function fromMarkdown(md: string, title?: string): string {
  const t = title || (md.match(/^# (.+)$/m)?.[1] || '');
  return `---\ntitle: "${t}"\n---\n\n${md.trim()}\n\n<!--OMD\n-->\n`;
}

/**
 * OMD 字符串 → 纯 MD（去掉头部尾部）
 */
export function toMarkdown(omd: string): string {
  const doc = parse(omd);
  return doc.body;
}
