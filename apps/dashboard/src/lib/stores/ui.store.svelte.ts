import { browser } from '$app/environment';

type Theme = 'dark' | 'light' | 'system';

class UIStore {
  sidebarCollapsed = $state(false);
  mobileSidebarOpen = $state(false);
  theme = $state<Theme>('dark');
  activeSlideOver = $state<string | null>(null);
  commandPaletteOpen = $state(false);

  constructor() {
    if (browser) {
      const stored = localStorage.getItem('vf:theme') as Theme | null;
      if (stored) this.theme = stored;
      const sb = localStorage.getItem('vf:sidebar-collapsed');
      if (sb === 'true') this.sidebarCollapsed = true;
    }
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    if (browser) localStorage.setItem('vf:sidebar-collapsed', String(this.sidebarCollapsed));
  }

  toggleMobileSidebar() {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    if (!browser) return;
    localStorage.setItem('vf:theme', theme);
    const effective =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark'
        : theme;
    document.documentElement.classList.toggle('light', effective === 'light');
    document.documentElement.classList.toggle('dark', effective === 'dark');
  }

  openSlideOver(id: string) {
    this.activeSlideOver = id;
  }

  closeSlideOver() {
    this.activeSlideOver = null;
  }
}

export const uiStore = new UIStore();
