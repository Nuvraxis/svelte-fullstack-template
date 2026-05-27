<script lang="ts">
  import { linearScale, niceTicks } from './helpers';

  export interface BarDatum {
    label: string;
    value: number;
    /** override the per-bar color (e.g. for waterfall) */
    color?: string;
  }

  interface Props {
    data: BarDatum[];
    height?: number;
    color?: string;
    yFormat?: (v: number) => string;
    label: string;
    /** Reserve space for negative values (waterfall, P&L) */
    allowNegative?: boolean;
  }

  let {
    data,
    height = 280,
    color = 'var(--color-brand-500)',
    yFormat = (v) => v.toLocaleString(),
    label,
    allowNegative = false
  }: Props = $props();

  const M = { top: 16, right: 16, bottom: 32, left: 64 };
  let width = $state(640);

  const values = $derived(data.map((d) => d.value));
  const maxY = $derived(Math.max(0, ...values));
  const minY = $derived(allowNegative ? Math.min(0, ...values) : 0);
  const ticks = $derived(niceTicks(minY, maxY, 5));

  const innerW = $derived(Math.max(0, width - M.left - M.right));
  const innerH = $derived(Math.max(0, height - M.top - M.bottom));

  const sy = $derived(linearScale([minY, maxY || 1], [innerH, 0]));
  const barWidth = $derived(data.length ? (innerW / data.length) * 0.7 : 0);
  const groupWidth = $derived(data.length ? innerW / data.length : 0);
  const yZero = $derived(sy(0));

  let svgEl: SVGSVGElement | undefined = $state();
  $effect(() => {
    if (!svgEl) return;
    const ro = new ResizeObserver(() => { width = svgEl!.clientWidth || 640; });
    ro.observe(svgEl);
    return () => ro.disconnect();
  });

  let hoverIdx = $state<number | null>(null);
</script>

<div class="w-full relative" style="height:{height}px">
  <svg
    bind:this={svgEl}
    width="100%"
    height={height}
    viewBox="0 0 {width} {height}"
    role="img"
    aria-label={label}
  >
    <g transform="translate({M.left},{M.top})">
      <!-- Grid + y-axis labels -->
      {#each ticks as t (t)}
        <line x1="0" x2={innerW} y1={sy(t)} y2={sy(t)} stroke="var(--color-border-subtle)" stroke-width="1" />
        <text x="-8" y={sy(t)} dominant-baseline="middle" text-anchor="end" class="fill-[var(--color-foreground-subtle)] font-mono text-[10px]">
          {yFormat(t)}
        </text>
      {/each}

      <!-- Zero line (highlighted for waterfall) -->
      {#if allowNegative}
        <line x1="0" x2={innerW} y1={yZero} y2={yZero} stroke="var(--color-border-strong)" stroke-width="1" />
      {/if}

      <!-- Bars -->
      {#each data as d, i (i + d.label)}
        {@const x = i * groupWidth + (groupWidth - barWidth) / 2}
        {@const y = sy(Math.max(0, d.value))}
        {@const h = Math.abs(sy(d.value) - sy(0))}
        {@const fill = d.color ?? color}
        <rect
          x={x}
          y={d.value >= 0 ? y : sy(0)}
          width={barWidth}
          height={h}
          fill={fill}
          opacity={hoverIdx !== null && hoverIdx !== i ? 0.4 : 1}
          rx="2"
          role="presentation"
          aria-label={`${d.label}: ${yFormat(d.value)}`}
          onmouseenter={() => (hoverIdx = i)}
          onmouseleave={() => (hoverIdx = null)}
        ><title>{d.label}: {yFormat(d.value)}</title></rect>
      {/each}

      <!-- X-axis labels -->
      {#each data as d, i (i + d.label)}
        <text
          x={i * groupWidth + groupWidth / 2}
          y={innerH + 18}
          text-anchor="middle"
          class="fill-[var(--color-foreground-subtle)] font-mono text-[10px]"
        >{d.label}</text>
      {/each}
    </g>
  </svg>
</div>

<details class="sr-only">
  <summary>Data for {label}</summary>
  <table>
    <thead><tr><th>Label</th><th>Value</th></tr></thead>
    <tbody>{#each data as d (d.label)}<tr><td>{d.label}</td><td>{yFormat(d.value)}</td></tr>{/each}</tbody>
  </table>
</details>
