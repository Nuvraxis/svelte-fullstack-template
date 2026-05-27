/**
 * Tiny chart helpers — SVG scales, path builders, axis ticks.
 * Hand-rolled (no d3) so chart components stay tree-shakable and small.
 */

export interface Series {
  label: string;
  data: number[];
  color?: string;
}

export interface XYPoint {
  x: number;
  y: number;
}

export function linearScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (v: number) => r0 + ((v - d0) / span) * (r1 - r0);
}

export function bounds(values: number[], padBottom = 0): [number, number] {
  if (!values.length) return [0, 1];
  const min = Math.min(...values, padBottom);
  const max = Math.max(...values);
  if (min === max) return [min - 1, max + 1];
  return [min, max];
}

export function niceTicks(min: number, max: number, count = 5): number[] {
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = (count * step) / span;
  let s = step;
  if (err <= 0.15) s *= 10;
  else if (err <= 0.35) s *= 5;
  else if (err <= 0.75) s *= 2;
  const start = Math.ceil(min / s) * s;
  const ticks: number[] = [];
  for (let v = start; v <= max + 1e-9; v += s) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

/** SVG path string for a polyline through points */
export function linePath(points: XYPoint[]): string {
  if (!points.length) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
}

/** Closed area path (line down to baseline) */
export function areaPath(points: XYPoint[], baselineY: number): string {
  if (!points.length) return '';
  const top = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
  const last = points[points.length - 1]!;
  const first = points[0]!;
  return `${top} L ${last.x.toFixed(2)} ${baselineY.toFixed(2)} L ${first.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
}

/** Smooth curve using monotone cubic spline approximation (visually nicer than raw poly) */
export function smoothPath(points: XYPoint[]): string {
  if (points.length < 2) return linePath(points);
  let path = `M ${points[0]!.x.toFixed(2)} ${points[0]!.y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return path;
}
