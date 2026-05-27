<script lang="ts">
  export interface DonutDatum {
    label: string;
    value: number;
    color?: string;
  }

  interface Props {
    data: DonutDatum[];
    size?: number;
    thickness?: number;
    label: string;
    centerLabel?: string;
    centerValue?: string;
  }

  let {
    data,
    size = 200,
    thickness = 28,
    label,
    centerLabel,
    centerValue
  }: Props = $props();

  const DEFAULT_COLORS = [
    'var(--color-brand-500)',
    'var(--color-info)',
    'var(--color-success)',
    'var(--color-warning)',
    'var(--color-danger)',
    'var(--color-brand-700)',
    '#a78bfa',
    '#22d3ee'
  ];

  const total = $derived(data.reduce((s, d) => s + d.value, 0) || 1);
  const radius = $derived(size / 2);
  const innerRadius = $derived(radius - thickness);

  interface Arc {
    label: string;
    value: number;
    color: string;
    pct: number;
    path: string;
  }

  function buildArc(start: number, end: number, color: string, label: string, value: number, pct: number): Arc {
    const a0 = (start - 0.25) * 2 * Math.PI;
    const a1 = (end - 0.25) * 2 * Math.PI;
    const large = end - start > 0.5 ? 1 : 0;
    const x0o = radius + radius * Math.cos(a0);
    const y0o = radius + radius * Math.sin(a0);
    const x1o = radius + radius * Math.cos(a1);
    const y1o = radius + radius * Math.sin(a1);
    const x0i = radius + innerRadius * Math.cos(a1);
    const y0i = radius + innerRadius * Math.sin(a1);
    const x1i = radius + innerRadius * Math.cos(a0);
    const y1i = radius + innerRadius * Math.sin(a0);
    return {
      label,
      value,
      color,
      pct,
      path:
        `M ${x0o.toFixed(2)} ${y0o.toFixed(2)} ` +
        `A ${radius} ${radius} 0 ${large} 1 ${x1o.toFixed(2)} ${y1o.toFixed(2)} ` +
        `L ${x0i.toFixed(2)} ${y0i.toFixed(2)} ` +
        `A ${innerRadius} ${innerRadius} 0 ${large} 0 ${x1i.toFixed(2)} ${y1i.toFixed(2)} ` +
        `Z`
    };
  }

  const arcs = $derived.by<Arc[]>(() => {
    let acc = 0;
    return data.map((d, i) => {
      const pct = d.value / total;
      const start = acc;
      acc += pct;
      return buildArc(start, acc, d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]!, d.label, d.value, pct);
    });
  });

  let hoverIdx = $state<number | null>(null);
</script>

<div class="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
  <div class="relative shrink-0" style="width:{size}px; height:{size}px">
    <svg
      width={size}
      height={size}
      viewBox="0 0 {size} {size}"
      role="img"
      aria-label={label}
    >
      {#each arcs as arc, i (arc.label)}
        <path
          d={arc.path}
          fill={arc.color}
          opacity={hoverIdx !== null && hoverIdx !== i ? 0.35 : 1}
          role="presentation"
          aria-label={`${arc.label}: ${arc.value.toLocaleString()}`}
          onmouseenter={() => (hoverIdx = i)}
          onmouseleave={() => (hoverIdx = null)}
        ><title>{arc.label}: {arc.value.toLocaleString()} ({(arc.pct * 100).toFixed(1)}%)</title></path>
      {/each}
    </svg>
    {#if centerLabel || centerValue}
      <div
        class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
      >
        {#if centerValue}<span class="font-mono text-2xl font-semibold tabular-nums">{centerValue}</span>{/if}
        {#if centerLabel}<span class="text-xs text-muted">{centerLabel}</span>{/if}
      </div>
    {/if}
  </div>

  <ul class="flex-1 space-y-2 text-sm">
    {#each arcs as arc, i (arc.label)}
      <li
        class="flex items-center justify-between gap-3"
        onmouseenter={() => (hoverIdx = i)}
        onmouseleave={() => (hoverIdx = null)}
      >
        <span class="flex items-center gap-2 truncate">
          <span class="h-2.5 w-2.5 shrink-0 rounded-sm" style="background:{arc.color}"></span>
          <span class="truncate capitalize">{arc.label.replace(/_/g, ' ')}</span>
        </span>
        <span class="flex shrink-0 items-center gap-2 font-mono text-xs tabular-nums text-muted">
          <span>{arc.value.toLocaleString()}</span>
          <span class="w-10 text-right">{(arc.pct * 100).toFixed(1)}%</span>
        </span>
      </li>
    {/each}
  </ul>
</div>

<details class="sr-only">
  <summary>Data for {label}</summary>
  <table>
    <thead><tr><th>Label</th><th>Value</th><th>%</th></tr></thead>
    <tbody>{#each arcs as a (a.label)}<tr><td>{a.label}</td><td>{a.value}</td><td>{(a.pct * 100).toFixed(1)}%</td></tr>{/each}</tbody>
  </table>
</details>
