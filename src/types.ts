/**
 * OMD 核心类型定义
 * Office Markdown — 智慧生而共通
 */

/** 语义关联类型 */
export type RelationType = 'describes' | 'supports' | 'references' | 'follows';

/** 语义关联 */
export interface Relation {
  type: RelationType;
  source: string;  // 如 "para-3" 或 "img-1"
  target: string;
}

/** 呈现元数据 — 文档视图 */
export interface RenderDocument {
  font?: string;
  font_size?: number;
  line_spacing?: number;
  page_size?: 'A4' | 'A3' | 'Letter';
  page_margin?: [number, number, number, number];
  header?: string;
  footer?: string;
  watermark?: string;
}

/** 呈现元数据 — 单元格样式 */
export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  color?: string;
  bg_color?: string;
  align?: 'left' | 'center' | 'right';
  border?: 'none' | 'thin' | 'medium' | 'thick';
  font_size?: number;
}

/** 呈现元数据 — 工作表 */
export interface RenderSheet {
  name: string;
  merged_cells?: string[];
  column_widths?: number[];
  row_heights?: number[];
  cell_styles?: Record<string, CellStyle>;
}

/** 呈现元数据 — 幻灯片元素 */
export interface SlideElement {
  id: string;
  type: 'textbox' | 'image' | 'shape';
  position: [number, number];
  size: [number, number];
  animation?: string;
}

/** 呈现元数据 — 幻灯片页 */
export interface SlidePage {
  page: number;
  layout?: string;
  transition?: string;
  notes?: string;
  elements?: SlideElement[];
}

/** 呈现元数据 — 幻灯片 */
export interface RenderSlide {
  theme?: string;
  slide_size?: [number, number];
  background?: string;
  pages?: SlidePage[];
}

/** 尾部 <!--OMD--> 的呈现配置 */
export interface RenderConfig {
  document?: RenderDocument;
  sheet?: RenderSheet[];
  slide?: RenderSlide;
}

/** 头部 YAML 语义元数据 */
export interface OMDBody {
  title: string;
  author?: string;
  created?: string;
  modified?: string;
  tags?: string[];
  status?: string;
  template?: string;
  version?: string;
  formulas?: Record<string, string>;
  relations?: Relation[];
  references?: string[];
}

/** OMD 结构化文档 */
export interface OMDDocument {
  meta: OMDBody;
  body: string;
  render?: RenderConfig;
}

/** 提纲节点 */
export interface OutlineNode {
  level: number;
  text: string;
  line: number;
  children: OutlineNode[];
}
