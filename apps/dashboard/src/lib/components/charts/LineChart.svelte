<script lang="ts">
  import { linearScale, smoothPath, areaPath, bounds, niceTicks, type XYPoint } from './helpers';

  export interface LinePoint {
    label: string;
    value: number;
  }

  interface Props {
    data: LinePoint[];
    height?: number;
    color?: string;
    fill?: boolean;
    yFormat?: (v: number) => string;
    label: string;
  }

  let {
    data,
    height = 280,
    color = 'var(--color-brand-500)',
    fill = true,
    yFormat = (v) => v.toLocaleString(),
    label
  }: Props = $props();

  const M = { top: 16, right: 16, bottom: 28, left: 56 };
  let width = $state(640);

  const values = $derived(data.map((d) => d.value));
  const [minY, maxY] = $derived.by(() => bounds(values, 0));
  const ticks = $derived(niceTicks(minY, maxY, 5));

  const innerW = $derived(Math.max(0, width - M.left - M.right));
  const innerH = $derived(Math.max(0, height - M.top - M.bottom));

  const sx = $derived(linearScale([0, Math.max(1, data.length - 1)], [0, innerW]));
  const sy = $derived(linearScale([minY, Math.max(maxY, minY + 1)], [innerH, 0]));

  const points = $derived<XYPoint[]>(
    data.map((d, i) => ({ x: sx(i), y: sy(d.value) }))
  );

  const linePathD = $derived(smoothPath(points));
  const areaPathD = $derived(fill ? areaPath(points, innerH) : '');

  // Show ~6 x-axis labels max to avoid clutter
  const xLabelStride = $derived(Math.max(1, Math.ceil(data.length / 6)));

  // Slugify label for use in SVG element IDs — `url(#id)` references break on spaces / punctuation.
  const slugId = $derived(`line-grad-${label.replace(/[^a-z0-9]/gi, '-')}`);

  let svgEl: SVGSVGElement | undefined = $state();
  $effect(() => {
    if (!svgEl) return;
    const ro = new ResizeObserver(() => {
      width = svgEl!.clientWidth || 640;
    });
    ro.observe(svgEl);
    return () => ro.disconnect();
  });

  // Hover state for tooltip
  let hoverIdx = $state<number | null>(null);
  function onMove(e: MouseEvent) {
    if (!svgEl || data.length === 0) return;
    const rect = svgEl.getBoundingClientRect();
    const x = e.clientX - rect.left - M.left;
    const t = x / innerW;
    const i = Math.round(t * (data.length - 1));
    hoverIdx = Math.max(0, Math.min(data.length - 1, i));
  }
  function onLeave() {
    hoverIdx = null;
  }
</script>

<div class="relative w-full" style="height:{height}px">
  <svg
    bind:this={svgEl}
    width="100%"
    height={height}
    viewBox="0 0 {width} {height}"
    role="img"
    aria-label={label}
    onmousemove={onMove}
    onmouseleave={onLeave}
  >
    <!-- Gradient fill — stop-color must be set via inline style for CSS vars to resolve in SVG -->
    {#if fill}
      <defs>
        <linearGradient id={slugId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   style="stop-color: {color}; stop-opacity: 0.35;" />
          <stop offset="55%"  style="stop-color: {color}; stop-opacity: 0.12;" />
          <stop offset="100%" style="stop-color: {color}; stop-opacity: 0;" />
        </linearGradient>
      </defs>
    {/if}

    <g transform="translate({M.left},{M.top})">
      <!-- Grid + y-axis -->
      {#each ticks as t (t)}
        <line x1="0" x2={innerW} y1={sy(t)} y2={sy(t)} stroke="var(--color-border-subtle)" stroke-width="1" />
        <text x="-8" y={sy(t)} dominant-baseline="middle" text-anchor="end" class="fill-[var(--color-foreground-subtle)] font-mono text-[10px]">
          {yFormat(t)}
        </text>
      {/each}

      <!-- X-axis labels -->
      {#each data as d, i (i)}
        {#if i % xLabelStride === 0 || i === data.length - 1}
          <text x={sx(i)} y={innerH + 18} text-anchor="middle" class="fill-[var(--color-foreground-subtle)] font-mono text-[10px]">
            {d.label}
          </text>
        {/if}
      {/each}

      <!-- Area + line -->
      {#if fill}
        <path d={areaPathD} fill="url(#{slugId})" />
      {/if}
      <path d={linePathD} fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />

      <!-- Hover marker -->
      {#if hoverIdx !== null && data[hoverIdx]}
        {@const hp = points[hoverIdx]!}
        <line x1={hp.x} x2={hp.x} y1="0" y2={innerH} stroke="var(--color-border-strong)" stroke-width="1" stroke-dasharray="2 3" />
        <circle cx={hp.x} cy={hp.y} r="4" fill={color} stroke="var(--color-surface-0)" stroke-width="2" />
      {/if}
    </g>
  </svg>

  {#if hoverIdx !== null && data[hoverIdx]}
    {@const hp = points[hoverIdx]!}
    <div
      role="status"
      class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-default bg-surface-2 px-2.5 py-1.5 text-xs shadow-elevated"
      style="left:{M.left + hp.x}px; top:{M.top + hp.y - 8}px"
    >
      <div class="text-subtle">{data[hoverIdx].label}</div>
      <div class="font-mono font-semibold tabular-nums">{yFormat(data[hoverIdx].value)}</div>
    </div>
  {/if}
</div>

<!-- Accessible data table for screen readers -->
<details class="sr-only">
  <summary>Data for {label}</summary>
  <table>
    <thead><tr><th>Label</th><th>Value</th></tr></thead>
    <tbody>
      {#each data as d (d.label)}
        <tr><td>{d.label}</td><td>{yFormat(d.value)}</td></tr>
      {/each}
    </tbody>
  </table>
</details>
