import { create } from 'zustand'

interface MapState {
  center: [number, number]
  zoom: number
  drawingMode: 'point' | 'polygon' | null
  currentPolygon: [number, number][]
  selectedMarker: { lat: number; lng: number } | null
  setCenter: (center: [number, number]) => void
  setZoom: (zoom: number) => void
  setDrawingMode: (mode: 'point' | 'polygon' | null) => void
  addPolygonVertex: (vertex: [number, number]) => void
  clearPolygon: () => void
  setSelectedMarker: (marker: { lat: number; lng: number } | null) => void
}

export const useMapStore = create<MapState>((set) => ({
  center: [0, 20],
  zoom: 2,
  drawingMode: null,
  currentPolygon: [],
  selectedMarker: null,
  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setDrawingMode: (drawingMode) => set({ drawingMode, currentPolygon: [] }),
  addPolygonVertex: (vertex) => set((state) => ({
    currentPolygon: [...state.currentPolygon, vertex]
  })),
  clearPolygon: () => set({ currentPolygon: [] }),
  setSelectedMarker: (selectedMarker) => set({ selectedMarker })
}))
