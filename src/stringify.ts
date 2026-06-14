/**
 * OMD 序列化器
 * OMDDocument → omd 字符串
 */

import * as yaml from 'js-yaml';
import type { OMDDocument } from './types.js';

/**
 * 结构化文档 → .omd 文件字符串
 */
export function stringify(doc: OMDDocument): string {
  const parts: string[] = [];

  // 头部 YAML（语义元数据）
  const meta: Record<string, unknown> = { title: doc.meta.title };
  if (doc.meta.author) meta.author = doc.meta.author;
  if (doc.meta.created) meta.created = doc.meta.created;
  if (doc.meta.modified) meta.modified = doc.meta.modified;
  if (doc.meta.tags?.length) meta.tags = doc.meta.tags;
  if (doc.meta.status) meta.status = doc.meta.status;
  if (doc.meta.template) meta.template = doc.meta.template;
  if (doc.meta.version) meta.version = doc.meta.version;
  if (doc.meta.formulas && Object.keys(doc.meta.formulas).length)
    meta.formulas = doc.meta.formulas;
  if (doc.meta.relations?.length) meta.relations = doc.meta.relations;
  if (doc.meta.references?.length) meta.references = doc.meta.references;

  parts.push('---');
  parts.push(yaml.dump(meta, { lineWidth: -1, noCompatMode: true }).trim());
  parts.push('---');
  parts.push('');
  parts.push(doc.body.trim());
  parts.push('');

  // 尾部 <!--OMD-->（呈现元数据）
  if (doc.render && Object.keys(doc.render).length > 0) {
    parts.push('<!--OMD');
    parts.push(yaml.dump(doc.render, { lineWidth: -1, noCompatMode: true }).trim());
    parts.push('-->');
  } else {
    parts.push('<!--OMD');
    parts.push('-->');
  }

  return parts.join('\n') + '\n';
}
