import {
  type DuoColumnFrame,
  isDuo,
  NativeDuoColumn,
  NativeDuoReadable,
} from '@modules/yohaku/duo-shell'
import { createContext, type ReactNode, use, useState } from 'react'
import { StyleSheet } from 'react-native'

import { usePalette } from '@/theme/palette'

const DuoReadableContext = createContext(false)

export const useInDuoReadable = () => use(DuoReadableContext)

export function DuoReadable({
  children,
  maxWidth,
}: {
  children: ReactNode
  maxWidth?: number
}) {
  const palette = usePalette()
  const [frame, setFrame] = useState<DuoColumnFrame>()
  return (
    <NativeDuoReadable
      columnMaxWidth={maxWidth}
      style={[styles.fill, { backgroundColor: palette.surface.desk }]}
      onColumnFrame={(event) => setFrame(event.nativeEvent)}
    >
      <NativeDuoColumn
        style={[
          styles.column,
          frame ? { left: frame.left, width: frame.width } : styles.columnFill,
        ]}
      >
        <DuoReadableContext value={true}>{children}</DuoReadableContext>
      </NativeDuoColumn>
    </NativeDuoReadable>
  )
}

export function DuoReadableFrame({
  children,
  maxWidth,
}: {
  children: ReactNode
  maxWidth?: number
}) {
  return isDuo ? (
    <DuoReadable maxWidth={maxWidth}>{children}</DuoReadable>
  ) : (
    children
  )
}

const DUO_ARTICLE_MAX_WIDTH = 600

export const duoArticleColumn = isDuo
  ? StyleSheet.create({
      column: {
        alignSelf: 'center',
        maxWidth: DUO_ARTICLE_MAX_WIDTH,
        width: '100%',
      },
    }).column
  : null

const styles = StyleSheet.create({
  column: { bottom: 0, position: 'absolute', top: 0 },
  columnFill: { left: 0, right: 0 },
  fill: { flex: 1 },
})
