import { describe, it, expect } from 'vitest';
import { getOutline, validate, stringify, parse } from '../src/index.js';

describe('getOutline', () => {
  it('提取标题层级树', () => {
    const omd = '---\ntitle: "T"\n---\n\n# 第一章\n## 第一节\n### 小节\n# 第二章\n<!--OMD\n-->\n';
    const outline = getOutline(omd);
    expect(outline).toHaveLength(2);
    expect(outline[0].text).toBe('第一章');
    expect(outline[0].children).toHaveLength(1);
    expect(outline[0].children[0].text).toBe('第一节');
    expect(outline[0].children[0].children[0].text).toBe('小节');
    expect(outline[1].text).toBe('第二章');
  });

  it('空文档返回空数组', () => {
    const omd = '---\ntitle: ""\n---\n\n<!--OMD\n-->\n';
    expect(getOutline(omd)).toEqual([]);
  });
});

describe('validate', () => {
  it('有效 OMD 通过校验', () => {
    const r = validate('---\ntitle: "T"\n---\n\n正文\n\n<!--OMD\n-->\n');
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('空字符串报错', () => {
    const r = validate('');
    expect(r.valid).toBe(false);
  });

  it('缺头部报错', () => {
    const r = validate('正文内容');
    expect(r.valid).toBe(false);
  });

  it('title 为空时警告', () => {
    const r = validate('---\ntitle: ""\n---\n\n正文\n\n<!--OMD\n-->\n');
    expect(r.valid).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('缺少尾部时警告', () => {
    const r = validate('---\ntitle: "T"\n---\n\n正文\n');
    expect(r.valid).toBe(true);
    expect(r.warnings.some(w => w.includes('OMD'))).toBe(true);
  });

  it('正文为空时警告', () => {
    const r = validate('---\ntitle: "T"\n---\n\n\n<!--OMD\n-->\n');
    expect(r.warnings.some(w => w.includes('正文'))).toBe(true);
  });
});

describe('stringify', () => {
  it('保留公式', () => {
    const doc = parse('---\ntitle: "T"\nformulas:\n  C3: "=SUM(A1:A2)"\n---\n\n正文\n\n<!--OMD\n-->\n');
    const out = stringify(doc);
    expect(out).toContain('=SUM(A1:A2)');
  });

  it('保留 relations', () => {
    const doc = parse('---\ntitle: "T"\nrelations:\n  - type: describes\n    source: p1\n    target: i1\n---\n\n正文\n\n<!--OMD\n-->\n');
    const out = stringify(doc);
    expect(out).toContain('describes');
    expect(out).toContain('p1');
  });
});
