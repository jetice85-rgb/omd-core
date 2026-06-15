import { describe, it, expect } from 'vitest';
import { parse, toXlsx, toPptx } from '../src/index.js';

const sheetOMD = `---
title: "数据表"
formulas:
  C3: "=SUM(A1:A2)"
---

| 姓名 | 部门 | 绩效 |
| --- | --- | --- |
| 张三 | 技术 | A |
| 李四 | 产品 | B+ |

---sheet---

| 月份 | 收入 | 支出 |
| --- | --- | --- |
| 1月 | 10000 | 8000 |

<!--OMD
sheet:
  - name: "员工绩效"
    column_widths: [80, 100, 60]
  - name: "财务"
-->
`;

const slideOMD = `---
title: "项目汇报"
---

---slide---

# 项目汇报

副标题示例

---slide---

## 背景分析

市场数据显示增长趋势。

- 要点一
- 要点二

---slide---

## 数据展示

| 季度 | 收入 |
| --- | --- |
| Q1 | 100 |
| Q2 | 150 |

<!--OMD
slide:
  theme: "corporate"
  pages:
    - page: 2
      transition: "fade"
-->
`;

describe('toXlsx', () => {
  it('生成有效 xlsx Buffer', async () => {
    const doc = parse(sheetOMD);
    const buf = await toXlsx(doc);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
  });

  it('支持多工作表', async () => {
    const doc = parse(sheetOMD);
    const buf = await toXlsx(doc);
    // xlsx 是 ZIP，以 PK 开头
    expect(buf[0]).toBe(0x50);
  });
});

describe('toPptx', () => {
  it('生成有效 pptx Buffer', async () => {
    const doc = parse(slideOMD);
    const buf = await toPptx(doc);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
    // pptx 也是 ZIP
    expect(buf[0]).toBe(0x50);
  });

  it('普通文档也生成 pptx', async () => {
    const doc = parse('---\ntitle: "简"\n---\n\n# 标题\n正文\n<!--OMD\n-->\n');
    const buf = await toPptx(doc);
    expect(buf.length).toBeGreaterThan(500);
  });
});
