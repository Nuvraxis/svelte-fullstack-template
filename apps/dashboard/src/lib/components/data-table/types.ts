import type { Snippet } from 'svelte';

export interface ColumnDef<T> {
  /** stable id used for visibility / sorting state */
  id: string;
  header: string;
  /** key on the row or a getter */
  accessor: keyof T | ((row: T) => unknown);
  /** custom cell renderer; receives the raw value + row */
  cell?: Snippet<[{ value: unknown; row: T }]>;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'right' | 'center';
  /** initially hidden — user can show via column toggle */
  hidden?: boolean;
  /** sticky to side of horizontally scrolling table */
  sticky?: 'left' | 'right';
  /** show in CSV exports? defaults to true */
  exportable?: boolean;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}
