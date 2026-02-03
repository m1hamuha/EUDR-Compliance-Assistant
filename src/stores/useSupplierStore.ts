import { create } from 'zustand'
import type { SupplierStatus, Commodity } from '@prisma/client'

interface SupplierFilter {
  status?: SupplierStatus
  commodity?: Commodity
  country?: string
  search?: string
}

interface SupplierStore {
  selectedIds: string[]
  filter: SupplierFilter
  setSelectedIds: (ids: string[]) => void
  toggleSelection: (id: string) => void
  clearSelection: () => void
  setFilter: (filter: SupplierFilter) => void
  resetFilter: () => void
}

export const useSupplierStore = create<SupplierStore>((set) => ({
  selectedIds: [],
  filter: {},
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  toggleSelection: (id) => set((state) => ({
    selectedIds: state.selectedIds.includes(id)
      ? state.selectedIds.filter(i => i !== id)
      : [...state.selectedIds, id]
  })),
  clearSelection: () => set({ selectedIds: [] }),
  setFilter: (filter) => set((state) => ({
    filter: { ...state.filter, ...filter }
  })),
  resetFilter: () => set({ filter: {} })
}))
