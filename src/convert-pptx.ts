/**
 * OMD → PPTX 转换器
 * 将 OMD 文档按 ---slide--- 分页转为 PowerPoint (.pptx) Buffer
 */

import PptxGenJS from 'pptxgenjs';
import type { OMDDocument } from './types.js';

/**
 * 解析 MD body 为幻灯片页
 */
function parseSlides(body: string): { title: string; content: string[]; images: string[] }[] {
  const slides: { title: string; content: string[]; images: string[] }[] = [];
  const segments = body.split(/\n?---slide---\n?/);

  for (const segment of segments) {
    const lines = segment.trim().split('\n');
    let title = '';
    const content: string[] = [];
    const images: string[] = [];

    for (const line of lines) {
      if (/^# (.+)/.test(line)) {
        title = line.replace(/^# /, '');
      } else if (/^## (.+)/.test(line)) {
        if (!title) title = line.replace(/^## /, '');
        else content.push(line.replace(/^## /, ''));
      } else if (/^!\[.*\]\(data:image/.test(line)) {
        const m = line.match(/data:image\/\w+;base64,([A-Za-z0-9+/=]+)/);
        if (m) images.push(m[1]);
      } else if (/^\|.+\|/.test(line)) {
        content.push(line); // 保留表格行
      } else if (line.trim() && !/^>/.test(line) && !/^```/.test(line)) {
        // 清理行内格式
        let t = line.replace(/^[\-\*] /, '· ');
        t = t.replace(/\*\*(.+?)\*\*/g, '$1');
        t = t.replace(/\*(.+?)\*/g, '$1');
        t = t.replace(/`([^`]+)`/g, '$1');
        content.push(t);
      }
    }

    if (title || content.length > 0 || images.length > 0) {
      slides.push({ title, content, images });
    }
  }

  return slides;
}

/**
 * OMD 文档 → pptx Buffer
 */
export async function toPptx(doc: OMDDocument): Promise<Buffer> {
  const pptx = new PptxGenJS();
  const slideMeta = doc.render?.slide;
  const slides = parseSlides(doc.body);

  // 标题幻灯片
  if (slides.length > 0 && slides[0].title) {
    const s = pptx.addSlide();
    s.addText(doc.meta.title || slides[0].title, {
      x: 1, y: 2, w: 8, h: 1.5,
      fontSize: 36, bold: true, color: '2D3748',
      align: 'center',
    });
    if (doc.meta.author) {
      s.addText(doc.meta.author, {
        x: 1, y: 4, w: 8, h: 0.5,
        fontSize: 16, color: '718096', align: 'center',
      });
    }
  }

  // 内容幻灯片
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const pageMeta = slideMeta?.pages?.[i];

    const s = pptx.addSlide();

    // 过渡效果（新版 pptxgenjs API 可能不同，安全处理）
    try {
      if (pageMeta?.transition) {
        (s as any).transition = { type: pageMeta.transition };
      }
    } catch { /* ignore */ }

    if (slide.title) {
      s.addText(slide.title, {
        x: 0.5, y: 0.3, w: 9, h: 0.8,
        fontSize: 28, bold: true, color: '2D3748',
      });
    }

    // 正文
    if (slide.content.length > 0) {
      const text = slide.content.filter(l => !/^\|/.test(l)).join('\n');
      if (text) {
        s.addText(text, {
          x: 0.8, y: 1.5, w: 8.4, h: 4,
          fontSize: 16, color: '4A5568', bullet: true,
        });
      }

      // 表格
      const tableLines = slide.content.filter(l => /^\|/.test(l));
      if (tableLines.length > 0) {
        const rows: any[] = [];
        for (const line of tableLines) {
        if (/^\|[\s\-:]+\|$/.test(line)) continue;
        const cells = line.split('|').filter(c => c.trim() !== '' || c === '').map(c => c.trim());
        rows.push(cells.map((text: string) => ({ text })));
        }
        if (rows.length > 0) {
          s.addTable(rows, {
            x: 0.5, y: 2, w: 9,
            fontSize: 14,
            border: { type: 'solid', color: 'CBD5E0' },
          });
        }
      }
    }

    // 图片
    for (const img of slide.images) {
      try {
        s.addImage({ data: `data:image/png;base64,${img}`, x: 5, y: 2, w: 4, h: 3 });
      } catch { /* skip */ }
    }
  }

  // 结尾页
  pptx.addSlide().addText('谢谢', {
    x: 1, y: 2.5, w: 8, h: 1,
    fontSize: 40, color: '2D3748', align: 'center',
  });

  return (await pptx.write({ outputType: 'nodebuffer' })) as unknown as Buffer;
}

/**
 * OMD 字符串直接转 pptx Buffer
 */
export async function omdToPptx(omdString: string): Promise<Buffer> {
  const { parse } = await import('./parse.js');
  return toPptx(parse(omdString));
}
