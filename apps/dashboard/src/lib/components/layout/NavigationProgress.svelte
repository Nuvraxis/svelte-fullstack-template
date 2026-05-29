<script lang="ts">
  import { navigating } from '$app/state';

  type State = 'idle' | 'loading' | 'done';
  let state = $state<State>('idle');
  let startTimer: ReturnType<typeof setTimeout> | undefined;
  let doneTimer: ReturnType<typeof setTimeout> | undefined;

  // Skip the bar for sub-100ms navigations (cache hits) so it doesn't flash.
  const START_DELAY = 100;
  const FADE_OUT = 300;

  $effect(() => {
    const isNavigating = !!navigating.to;

    if (isNavigating) {
      clearTimeout(doneTimer);
      if (state === 'idle') {
        startTimer = setTimeout(() => {
          state = 'loading';
        }, START_DELAY);
      }
    } else {
      clearTimeout(startTimer);
      if (state === 'loading') {
        state = 'done';
        doneTimer = setTimeout(() => {
          state = 'idle';
        }, FADE_OUT);
      } else {
        state = 'idle';
      }
    }
  });
</script>

{#if state !== 'idle'}
  <div
    class="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[2px]"
    aria-hidden="true"
  >
    <div class="bar bg-primary shadow-[0_0_8px_var(--color-primary)]" class:loading={state === 'loading'} class:done={state === 'done'}></div>
  </div>
{/if}

<style>
  .bar {
    height: 100%;
    width: 0%;
    transform-origin: left;
  }
  .bar.loading {
    animation: trickle 8s cubic-bezier(0, 0.5, 0.3, 1) forwards;
  }
  .bar.done {
    animation: finish 300ms ease-out forwards;
  }
  @keyframes trickle {
    0%   { width: 0%; opacity: 1; }
    30%  { width: 45%; }
    60%  { width: 70%; }
    100% { width: 88%; opacity: 1; }
  }
  @keyframes finish {
    0%   { width: 88%; opacity: 1; }
    50%  { width: 100%; opacity: 1; }
    100% { width: 100%; opacity: 0; }
  }
</style>
