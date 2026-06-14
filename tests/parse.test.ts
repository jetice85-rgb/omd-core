import { describe, it, expect } from 'vitest';
import { parse, stringify, fromMarkdown, toMarkdown } from '../src/index.js';

const sampleOMD = `---
title: "品质管理办法"
tags: [品质, ISO9001]
formulas:
  C3: "=SUM(A1:A2)"
relations:
  - type: describes
    source: para-1
    target: img-1
---

# 品质管理办法

第一条 目的

为规范公司产品品质管理流程。

| 项目 | 标准 |
| --- | --- |
| 外观 | 无划痕 |

<!--OMD
document:
  font: "仿宋"
  font_size: 14
  page_size: "A4"
-->
`;

describe('parse', () => {
  it('解析头部 YAML 语义元数据', () => {
    const doc = parse(sampleOMD);
    expect(doc.meta.title).toBe('品质管理办法');
    expect(doc.meta.tags).toEqual(['品质', 'ISO9001']);
    expect(doc.meta.formulas).toEqual({ C3: '=SUM(A1:A2)' });
  });

  it('解析语义关联', () => {
    const doc = parse(sampleOMD);
    expect(doc.meta.relations).toHaveLength(1);
    expect(doc.meta.relations![0]).toEqual({
      type: 'describes',
      source: 'para-1',
      target: 'img-1',
    });
  });

  it('提取 GFM 正文', () => {
    const doc = parse(sampleOMD);
    expect(doc.body).toContain('# 品质管理办法');
    expect(doc.body).toContain('第一条 目的');
  });

  it('提取尾部呈现元数据', () => {
    const doc = parse(sampleOMD);
    expect(doc.render).toBeDefined();
    expect(doc.render!.document!.font).toBe('仿宋');
    expect(doc.render!.document!.page_size).toBe('A4');
  });
});

describe('stringify', () => {
  it('parse → stringify 往返一致', () => {
    const doc = parse(sampleOMD);
    const output = stringify(doc);
    const doc2 = parse(output);
    expect(doc2.meta.title).toBe('品质管理办法');
    expect(doc2.body).toContain('# 品质管理办法');
    expect(doc2.render!.document!.font).toBe('仿宋');
  });
});

describe('fromMarkdown / toMarkdown', () => {
  it('纯 MD 转 OMD 再转回纯 MD', () => {
    const md = '# 标题\n\n正文内容。';
    const omd = fromMarkdown(md, '标题');
    const back = toMarkdown(omd);
    expect(back.trim()).toBe(md.trim());
  });
});
