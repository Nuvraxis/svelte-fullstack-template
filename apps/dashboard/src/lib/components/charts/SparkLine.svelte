<script lang="ts">
  import { linearScale, smoothPath, bounds, areaPath, type XYPoint } from './helpers';

  interface Props {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
    fill?: boolean;
    label?: string;
  }

  let {
    data,
    width = 100,
    height = 28,
    color = 'var(--color-brand-500)',
    fill = true,
    label
  }: Props = $props();

  const PAD = 1;

  const points = $derived.by<XYPoint[]>(() => {
    if (data.length === 0) return [];
    const [min, max] = bounds(data);
    const sx = linearScale([0, data.length - 1 || 1], [PAD, width - PAD]);
    const sy = linearScale([min, max], [height - PAD, PAD]);
    return data.map((v, i) => ({ x: sx(i), y: sy(v) }));
  });

  const linePathD = $derived(smoothPath(points));
  const areaPathD = $derived(fill ? areaPath(points, height - PAD) : '');

  // Slugify label for SVG element ID — url(#id) breaks on spaces / punctuation.
  const slugId = $derived(`spark-grad-${(label ?? 'x').replace(/[^a-z0-9]/gi, '-')}`);
</script>

<svg
  width={width}
  height={height}
  viewBox="0 0 {width} {height}"
  role="img"
  aria-label={label ?? `Sparkline showing ${data.length} data points`}
  class="overflow-visible"
>
  {#if fill}
    <defs>
      <linearGradient id={slugId} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%"   style="stop-color: {color}; stop-opacity: 0.45;" />
        <stop offset="100%" style="stop-color: {color}; stop-opacity: 0;" />
      </linearGradient>
    </defs>
    <path d={areaPathD} fill="url(#{slugId})" />
  {/if}
  <path d={linePathD} fill="none" stroke={color} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>
