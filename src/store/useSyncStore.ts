import { create } from 'zustand'

interface SyncState {
  isSyncing: boolean
  lastSyncAt: number | null  // Unix timestamp ms
  nextSyncIn: number         // seconds until next scrape
  setSyncing: (v: boolean) => void
  setLastSync: (ts: number) => void
  setNextSyncIn: (s: number) => void
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  lastSyncAt: null,
  nextSyncIn: 300,
  setSyncing: (v) => set({ isSyncing: v }),
  setLastSync: (ts) => set({ lastSyncAt: ts }),
  setNextSyncIn: (s) => set({ nextSyncIn: s }),
}))
