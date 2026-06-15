import { describe, it, expect } from 'vitest';
import { parse, stringify, toDocx } from '../src/index.js';

const testOMD = `---
title: "测试文档"
author: "张三"
created: "2026-06-14"
tags: [测试]
formulas: { C1: "=SUM(A1:A2)" }
---

# 标题一

这是**加粗**和*斜体*文本。

## 标题二

> 这是一段引用。

- 列表项一
- 列表项二

| 姓名 | 部门 |
| --- | --- |
| 张三 | 技术 |
| 李四 | 产品 |

<!--OMD
document:
  font: "仿宋"
  font_size: 14
-->
`;

describe('toDocx', () => {
  it('生成有效的 docx Buffer', async () => {
    const doc = parse(testOMD);
    const buf = await toDocx(doc);
    expect(buf).toBeInstanceOf(Buffer);
    // docx 文件以 PK (ZIP) 开头
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });

  it('包含标题和正文内容', async () => {
    const doc = parse(testOMD);
    const buf = await toDocx(doc);
    expect(buf.length).toBeGreaterThan(1000);
  });

  it('parse → toDocx 不报错', async () => {
    const simple = parse('---\ntitle: "简"\n---\n\n# 你好\n\n正文\n\n<!--OMD\n-->\n');
    const buf = await toDocx(simple);
    expect(buf.length).toBeGreaterThan(500);
  });
});
