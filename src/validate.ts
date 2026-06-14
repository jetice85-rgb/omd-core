/**
 * OMD 格式校验器
 */

import { parse } from './parse.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 验证 .omd 字符串是否符合规范
 */
export function validate(omdString: string): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };

  if (!omdString || omdString.trim().length === 0) {
    result.valid = false;
    result.errors.push('文件为空');
    return result;
  }

  // 检查头部 YAML
  const headerMatch = omdString.match(/^---\n/);
  if (!headerMatch) {
    result.valid = false;
    result.errors.push('缺少头部 YAML Front-matter');
    return result;
  }

  // 尝试解析
  const doc = parse(omdString);

  if (!doc.meta.title || doc.meta.title.trim() === '') {
    result.warnings.push('title 字段为空');
  }

  // 检查尾部
  if (!omdString.includes('<!--OMD')) {
    result.warnings.push('缺少尾部 <!--OMD--> 注释块');
  }

  // 检查正文
  if (doc.body.trim().length === 0) {
    result.warnings.push('正文为空');
  }

  // 检查 Base64 图片大小
  const base64Images = doc.body.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g);
  if (base64Images) {
    for (const img of base64Images) {
      const sizeMB = (img.length * 0.75) / (1024 * 1024);
      if (sizeMB > 20) {
        result.warnings.push(`图片超过 20MB（${sizeMB.toFixed(1)}MB），AI 模型可能无法处理`);
      }
    }
  }

  return result;
}
