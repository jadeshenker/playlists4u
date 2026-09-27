"use client"

import { createContext, useCallback, useContext, useState } from "react"
import type { ArenaContentBlock } from "@/lib/arena"

type BlockViewerContextValue = {
  selectedBlock: ArenaContentBlock | null
  open: boolean
  selectBlock: (block: ArenaContentBlock) => void
  close: () => void
}

const BlockViewerContext = createContext<BlockViewerContextValue | null>(null)

export function useBlockViewer() {
  const context = useContext(BlockViewerContext)
  if (!context) throw new Error("useBlockViewer must be used inside BlockViewerProvider")
  return context
}

/** Shared selection state between the content grid (which sets it on click)
 * and the block viewer (which displays it). Scoped to a single playlist page.
 * The selected block is kept after closing so the viewer can animate out
 * with its content still in place. */
export default function BlockViewerProvider({ children }: { children: React.ReactNode }) {
  const [selectedBlock, setSelectedBlock] = useState<ArenaContentBlock | null>(null)
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])

  function selectBlock(block: ArenaContentBlock) {
    setSelectedBlock(block)
    setOpen(true)
  }

  return (
    <BlockViewerContext.Provider
      value={{
        selectedBlock,
        open,
        selectBlock,
        close,
      }}
    >
      {children}
    </BlockViewerContext.Provider>
  )
}
