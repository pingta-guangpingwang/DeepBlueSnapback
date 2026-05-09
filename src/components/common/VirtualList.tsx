import { useState, useRef, useEffect, useCallback } from 'react'
import { FixedSizeList, type ListChildComponentProps } from 'react-window'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode
  height?: number | string
  width?: string
  overscan?: number
  itemKey?: (index: number, data: { items: T[] }) => string | number
  className?: string
  innerClassName?: string
  onScroll?: (scrollOffset: number) => void
}

export default function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  height = 'calc(100vh - 260px)',
  width = '100%',
  overscan = 8,
  itemKey,
  className,
  innerClassName,
  onScroll,
}: VirtualListProps<T>) {
  const listRef = useRef<FixedSizeList>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [numericHeight, setNumericHeight] = useState(0)

  const itemData = { items, renderItem }

  function Row({ index, style, data }: ListChildComponentProps<typeof itemData>) {
    return (
      <div style={style}>
        {data.renderItem(data.items[index], index, style)}
      </div>
    )
  }

  useEffect(() => {
    if (typeof height === 'number') {
      setNumericHeight(height)
      return
    }
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setNumericHeight(entry.contentRect.height)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [height])

  const innerType = innerClassName
    ? useCallback((props: any) => <div {...props} className={innerClassName} />, [innerClassName])
    : undefined

  const list = (
    <FixedSizeList
      ref={listRef}
      className={className}
      height={numericHeight || (typeof height === 'number' ? height : 400)}
      width={width as string}
      itemCount={items.length}
      itemSize={itemHeight}
      overscanCount={overscan}
      itemData={itemData}
      itemKey={itemKey}
      innerElementType={innerType}
      onScroll={onScroll ? ({ scrollOffset }) => onScroll(scrollOffset) : undefined}
    >
      {Row}
    </FixedSizeList>
  )

  if (typeof height === 'number') return list

  return (
    <div ref={containerRef} style={{ flex: 1, minHeight: 0, width: width as string }}>
      {list}
    </div>
  )
}
