/**
 * @sashigane/tokens
 *
 * React も @sashigane/ui も import しない。トークン層が単体で成立することが、
 * このデザインシステムの設計の証明になる（原則4）。CI で検査している。
 */
export * from './scales.ts';
export * from './color/oklch.ts';
export * from './color/cvd.ts';
export * from './color/palette.ts';
export * from './output/index.ts';
export { default as tokens } from './tokens.json' with { type: 'json' };
