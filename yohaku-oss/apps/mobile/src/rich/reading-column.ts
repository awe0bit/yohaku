import { createContext, use } from 'react'
import { useWindowDimensions } from 'react-native'

export const ReadingColumnContext = createContext<number | null>(null)

export function useReadingColumnWidth() {
  const { width } = useWindowDimensions()
  return use(ReadingColumnContext) ?? width
}
