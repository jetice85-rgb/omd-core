/**
 * OMD → XLSX 转换器
 * 提取 OMD 中的表格和公式，生成 Excel (.xlsx) Buffer
 */

import * as ExcelJS from 'exceljs';
import type { OMDDocument } from './types.js';

/**
 * 解析 MD body 中的表格
 */
function extractTables(body: string): { headers: string[]; rows: string[][] }[] {
  const tables: { headers: string[]; rows: string[][] }[] = [];
  const segments = body.split(/^---sheet---$/m);

  for (const segment of segments) {
    const lines = segment.trim().split('\n');
    let inTable = false;
    let headers: string[] = [];
    let rows: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!/^\|.+\|$/.test(line)) {
        if (inTable && rows.length > 0) {
          tables.push({ headers, rows });
          headers = [];
          rows = [];
          inTable = false;
        }
        continue;
      }

      if (/^\|[\s\-:]+\|$/.test(line)) continue;

      const cells = line.split('|').filter(c => c.trim() !== '' || c === '').map(c => c.trim());
      if (!inTable) {
        inTable = true;
        headers = cells;
      } else {
        rows.push(cells);
      }
    }

    if (inTable && rows.length > 0) {
      tables.push({ headers, rows });
    }
  }

  return tables;
}

/**
 * OMD 文档 → xlsx Buffer
 */
export async function toXlsx(doc: OMDDocument): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const tables = extractTables(doc.body);

  // 如果没有表格，创建空工作表
  if (tables.length === 0) {
    const ws = workbook.addWorksheet('Sheet1');
    ws.addRow([doc.meta.title || '']);
  }

  for (let ti = 0; ti < tables.length; ti++) {
    const table = tables[ti];
    const sheetMeta = doc.render?.sheet?.[ti];
    const wsName = sheetMeta?.name || `Sheet${ti + 1}`;
    const ws = workbook.addWorksheet(wsName);

    // 写入表头
    const headerRow = ws.addRow(table.headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E2F3' },
    };

    // 写入数据行
    for (const row of table.rows) {
      ws.addRow(row);
    }

    // 应用列宽
    if (sheetMeta?.column_widths) {
      ws.columns = sheetMeta.column_widths.map((w, i) => ({
        width: w / 7, // px → Excel 字符宽度
      }));
    }

    // 应用单元格样式
    if (sheetMeta?.cell_styles) {
      for (const [ref, style] of Object.entries(sheetMeta.cell_styles)) {
        const match = ref.match(/^([A-Z])(\d+)$/);
        if (!match) continue;
        const col = match[1].charCodeAt(0) - 'A'.charCodeAt(0);
        const row = parseInt(match[2]) - 1;
        const cell = ws.getCell(row + 1, col + 1);
        if (style.bold) cell.font = { ...cell.font, bold: true };
        if (style.color) cell.font = { ...cell.font, color: { argb: style.color.replace('#', 'FF') } };
        if (style.bg_color) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.bg_color.replace('#', 'FF') } };
        if (style.align) cell.alignment = { horizontal: style.align };
      }
    }

    // 应用合并单元格
    if (sheetMeta?.merged_cells) {
      for (const merge of sheetMeta.merged_cells) {
        ws.mergeCells(merge);
      }
    }
  }

  // 全局公式（头部 YAML）
  if (doc.meta.formulas) {
    const ws = workbook.worksheets[0];
    for (const [ref, formula] of Object.entries(doc.meta.formulas)) {
      const match = ref.match(/^([A-Z])(\d+)$/);
      if (!match) continue;
      const col = match[1].charCodeAt(0) - 'A'.charCodeAt(0);
      const row = parseInt(match[2]) - 1;
      ws.getCell(row + 1, col + 1).value = { formula: formula.replace(/^=/, '') };
    }
  }

  return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
}

/**
 * OMD 字符串直接转 xlsx Buffer
 */
export async function omdToXlsx(omdString: string): Promise<Buffer> {
  const { parse } = await import('./parse.js');
  return toXlsx(parse(omdString));
}
