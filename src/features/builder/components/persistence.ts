const STORAGE_KEY = "builder_state";

interface PersistedState {
  lastPageId: string | null;
  responsiveMode: string;
  expandedGroups: string[];
  scrollPosition: number;
  lastSelectedSectionId: string | null;
  sidebarCollapsed: boolean;
  rightPanelCollapsed: boolean;
}

export const builderPersistence = {
  save(state: Partial<PersistedState>): void {
    try {
      const existing = this.load();
      const merged = { ...existing, ...state };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // sessionStorage may be unavailable
    }
  },

  load(): PersistedState {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return this.defaults();
      return { ...this.defaults(), ...JSON.parse(raw) };
    } catch {
      return this.defaults();
    }
  },

  defaults(): PersistedState {
    return {
      lastPageId: null,
      responsiveMode: "desktop",
      expandedGroups: [],
      scrollPosition: 0,
      lastSelectedSectionId: null,
      sidebarCollapsed: false,
      rightPanelCollapsed: false,
    };
  },

  clear(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // noop
    }
  },
};
