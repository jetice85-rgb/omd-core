/**
 * OMD → DOCX 转换器
 * 将 OMD 结构化文档转为 Word (.docx) Buffer
 */

import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ImageRun,
} from 'docx';
import type { OMDDocument } from './types.js';

/**
 * MD 正文行类型
 */
type LineType =
  | { kind: 'h1'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'h4'; text: string }
  | { kind: 'paragraph'; parts: InlinePart[] }
  | { kind: 'quote'; text: string }
  | { kind: 'hr' }
  | { kind: 'list-item'; text: string }
  | { kind: 'table-row'; cells: string[]; isHeader: boolean }
  | { kind: 'code-block'; text: string }
  | { kind: 'blank' };

type InlinePart =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'code'; value: string }
  | { type: 'link'; text: string; url: string }
  | { type: 'image'; alt: string; data: string; mime: string };

/**
 * 解析 MD body 为结构化行
 */
function parseBody(body: string): LineType[] {
  const lines = body.split('\n');
  const result: LineType[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 代码块
    if (/^```/.test(line)) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      result.push({ kind: 'code-block', text: codeLines.join('\n') });
      i++;
      continue;
    }

    // 表格
    if (/^\|.+\|/.test(line)) {
      const rows: { cells: string[]; isHeader: boolean }[] = [];
      let isFirst = true;
      while (i < lines.length && /^\|.+\|/.test(lines[i])) {
        const l = lines[i];
        if (/^\|[\s\-:]+\|$/.test(l)) { i++; continue; }
        const cells = l.split('|').filter(c => c.trim() !== '').map(c => c.trim());
        rows.push({ cells, isHeader: isFirst });
        isFirst = false;
        i++;
      }
      for (const row of rows) result.push({ kind: 'table-row', ...row });
      continue;
    }

    // 标题
    if (/^#### (.+)/.test(line)) { result.push({ kind: 'h4', text: line.slice(5) }); i++; continue; }
    if (/^### (.+)/.test(line)) { result.push({ kind: 'h3', text: line.slice(4) }); i++; continue; }
    if (/^## (.+)/.test(line)) { result.push({ kind: 'h2', text: line.slice(3) }); i++; continue; }
    if (/^# (.+)/.test(line)) { result.push({ kind: 'h1', text: line.slice(2) }); i++; continue; }

    // 引用
    if (/^> (.+)/.test(line)) { result.push({ kind: 'quote', text: line.slice(2) }); i++; continue; }

    // 水平线
    if (/^---+$/.test(line.trim())) { result.push({ kind: 'hr' }); i++; continue; }

    // 列表
    if (/^[\-\*] (.+)/.test(line)) {
      result.push({ kind: 'list-item', text: line.slice(2) });
      i++;
      continue;
    }

    // 空行
    if (/^\s*$/.test(line)) { result.push({ kind: 'blank' }); i++; continue; }

    // 段落（含行内格式）
    const parts = parseInline(line);
    result.push({ kind: 'paragraph', parts });
    i++;
  }

  return result;
}

/**
 * 解析行内格式：粗体、斜体、代码、链接、图片
 */
function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // 图片
    const imgMatch = remaining.match(/^!\[([^\]]*)\]\(data:(image\/\w+);base64,([^)]+)\)/);
    if (imgMatch) {
      parts.push({ type: 'image', alt: imgMatch[1], mime: imgMatch[2], data: imgMatch[3] });
      remaining = remaining.slice(imgMatch[0].length);
      continue;
    }

    // 粗斜体
    const biMatch = remaining.match(/^\*\*\*(.+?)\*\*\*/);
    if (biMatch) { parts.push({ type: 'bold', value: biMatch[1] }); parts.push({ type: 'italic', value: biMatch[1] }); remaining = remaining.slice(biMatch[0].length); continue; }

    // 粗体
    const bMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (bMatch) { parts.push({ type: 'bold', value: bMatch[1] }); remaining = remaining.slice(bMatch[0].length); continue; }

    // 斜体
    const iMatch = remaining.match(/^\*(.+?)\*/);
    if (iMatch) { parts.push({ type: 'italic', value: iMatch[1] }); remaining = remaining.slice(iMatch[0].length); continue; }

    // 行内代码
    const cMatch = remaining.match(/^`([^`]+)`/);
    if (cMatch) { parts.push({ type: 'code', value: cMatch[1] }); remaining = remaining.slice(cMatch[0].length); continue; }

    // 链接
    const lMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (lMatch) { parts.push({ type: 'link', text: lMatch[1], url: lMatch[2] }); remaining = remaining.slice(lMatch[0].length); continue; }

    // 普通文本到下一个特殊标记
    const nextSpecial = remaining.search(/!\[|(\*\*\*|\*\*|\*)|`|\[/);
    if (nextSpecial === -1) {
      if (remaining) parts.push({ type: 'text', value: remaining });
      break;
    }
    if (nextSpecial > 0) {
      parts.push({ type: 'text', value: remaining.slice(0, nextSpecial) });
    }
    remaining = remaining.slice(nextSpecial);
  }

  return parts;
}

/**
 * 将 InlinePart 转为 docx TextRun 数组
 */
function partsToRuns(parts: InlinePart[]): (TextRun | ImageRun)[] {
  const runs: (TextRun | ImageRun)[] = [];
  for (const p of parts) {
    switch (p.type) {
      case 'text':
        runs.push(new TextRun({ text: p.value }));
        break;
      case 'bold':
        runs.push(new TextRun({ text: p.value, bold: true }));
        break;
      case 'italic':
        runs.push(new TextRun({ text: p.value, italics: true }));
        break;
      case 'code':
        runs.push(new TextRun({ text: p.value, font: 'Consolas', size: 20 }));
        break;
      case 'link':
        runs.push(new TextRun({ text: p.text, style: 'Hyperlink' }));
        break;
      case 'image':
        // Image support via docx library — skip for now, add [图片] placeholder
        runs.push(new TextRun({ text: `[图片: ${p.alt || '未命名'}]`, italics: true, color: '888888' }));
        break;
    }
  }
  return runs;
}

/**
 * 将 OMD 文档转为 docx Buffer
 */
export async function toDocx(doc: OMDDocument): Promise<Buffer> {
  const lines = parseBody(doc.body);
  const children: (Paragraph | Table)[] = [];

  // 文档标题
  children.push(new Paragraph({
    text: doc.meta.title,
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
  }));

  // 元信息
  if (doc.meta.author || doc.meta.created) {
    const metaText = [doc.meta.author, doc.meta.created].filter(Boolean).join(' · ');
    children.push(new Paragraph({
      text: metaText,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }));
  }

  let pendingTableRows: { cells: string[]; isHeader: boolean }[] = [];

  function flushTable() {
    if (pendingTableRows.length === 0) return;
    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: pendingTableRows.map(row =>
        new TableRow({
          children: row.cells.map(cell =>
            new TableCell({
              children: [new Paragraph({
                text: cell,
                ...(row.isHeader ? { bold: true } : {}),
              })],
              ...(row.isHeader ? { shading: { fill: 'D9E2F3' } } : {}),
            })
          ),
        })
      ),
    });
    children.push(table);
    pendingTableRows = [];
  }

  for (const line of lines) {
    if (line.kind !== 'table-row') flushTable();

    switch (line.kind) {
      case 'h1':
        children.push(new Paragraph({ text: line.text, heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 150 } }));
        break;
      case 'h2':
        children.push(new Paragraph({ text: line.text, heading: HeadingLevel.HEADING_2, spacing: { before: 250, after: 120 } }));
        break;
      case 'h3':
        children.push(new Paragraph({ text: line.text, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }));
        break;
      case 'h4':
        children.push(new Paragraph({ text: line.text, heading: HeadingLevel.HEADING_4 }));
        break;
      case 'paragraph':
        if (line.parts.length > 0) {
          children.push(new Paragraph({ children: partsToRuns(line.parts) }));
        }
        break;
      case 'quote':
        children.push(new Paragraph({
          children: [new TextRun({ text: line.text, italics: true })],
          indent: { left: 720 },
          border: { left: { style: BorderStyle.SINGLE, size: 3, color: '4472C4' } },
        }));
        break;
      case 'list-item':
        children.push(new Paragraph({ text: line.text, bullet: { level: 0 } }));
        break;
      case 'hr':
        children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE } } }));
        break;
      case 'code-block':
        children.push(new Paragraph({
          children: [new TextRun({ text: line.text, font: 'Consolas', size: 20 })],
          shading: { type: 'solid', fill: 'F2F2F2' },
        }));
        break;
      case 'blank':
        children.push(new Paragraph({ text: '' }));
        break;
      case 'table-row':
        pendingTableRows.push(line);
        break;
    }
  }
  flushTable();

  const docx = new Document({
    styles: {
      default: {
        document: {
          run: { font: doc.render?.document?.font || '宋体', size: doc.render?.document?.font_size ? doc.render.document.font_size * 2 : 28 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: doc.render?.document?.page_margin
            ? { top: doc.render.document.page_margin[0] * 567, bottom: doc.render.document.page_margin[1] * 567, left: doc.render.document.page_margin[2] * 567, right: doc.render.document.page_margin[3] * 567 }
            : { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      children,
    }],
  });

  return await Packer.toBuffer(docx);
}

/**
 * OMD 字符串直接转 docx Buffer
 */
export async function omdToDocx(omdString: string): Promise<Buffer> {
  const { parse } = await import('./parse.js');
  return toDocx(parse(omdString));
}
