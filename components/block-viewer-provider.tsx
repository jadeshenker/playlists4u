"use client"

import { createContext, useContext, useState } from "react"
import type { ArenaContentBlock } from "@/lib/arena"

type BlockViewerContextValue = {
  selectedBlock: ArenaContentBlock | null
  collapsed: boolean
  selectBlock: (block: ArenaContentBlock) => void
  toggleCollapsed: () => void
}

const BlockViewerContext = createContext<BlockViewerContextValue | null>(null)

export function useBlockViewer() {
  const context = useContext(BlockViewerContext)
  if (!context) throw new Error("useBlockViewer must be used inside BlockViewerProvider")
  return context
}

/** Shared selection state between the content grid (which sets it on click)
 * and the sidebar's block viewer (which displays it). Scoped to a single
 * playlist page. */
export default function BlockViewerProvider({ children }: { children: React.ReactNode }) {
  const [selectedBlock, setSelectedBlock] = useState<ArenaContentBlock | null>(null)
  const [collapsed, setCollapsed] = useState(true)

  function selectBlock(block: ArenaContentBlock) {
    setSelectedBlock(block)
    setCollapsed(false)
  }

  return (
    <BlockViewerContext.Provider
      value={{
        selectedBlock,
        collapsed,
        selectBlock,
        toggleCollapsed: () => setCollapsed((isCollapsed) => !isCollapsed),
      }}
    >
      {children}
    </BlockViewerContext.Provider>
  )
}
