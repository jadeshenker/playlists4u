"use client"

import { useBlockViewer } from "@/components/block-viewer-provider"
import { formatAddedAt } from "@/lib/format"

/** Sidebar panel: a collapsible bar that, once a block is clicked in the
 * content grid, shows that block's image/text, title, description, and the
 * date it was added to the channel. */
export default function BlockViewer() {
  const { selectedBlock, collapsed, toggleCollapsed } = useBlockViewer()

  const expanded = !collapsed && selectedBlock !== null

  return (
    <div className="hidden w-full flex-col-reverse lg:flex">
      <button
        onClick={toggleCollapsed}
        className="flex w-full cursor-pointer items-center justify-between border border-gray-300 px-3 py-1.5 text-xs"
      >
        <span>block viewer</span>
        <span>{collapsed ? "+" : "−"}</span>
      </button>

      <div
        className={`overflow-hidden border border-b-0 border-gray-300 transition-[max-height,opacity] duration-300 ease-out ${expanded ? "max-h-[28rem] opacity-100" : "max-h-0 opacity-0"}`}
      >
        {selectedBlock && (
          <div className="flex flex-col gap-2 p-3 text-xs">
            <div className="flex aspect-square items-center justify-center overflow-hidden bg-gray-50">
              {selectedBlock.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element -- natural size is unknown ahead of time
                <img
                  src={selectedBlock.imageUrl}
                  alt={selectedBlock.title ?? ""}
                  className="h-full w-full object-contain"
                />
              ) : (
                <p className="h-full w-full overflow-hidden whitespace-pre-line p-2">
                  {selectedBlock.text}
                </p>
              )}
            </div>
            <p className="font-semibold">{selectedBlock.title || "--"}</p>
            <p className="text-gray-500">{selectedBlock.description || "--"}</p>
            <p className="text-gray-400">added {formatAddedAt(selectedBlock.addedAt)}</p>
          </div>
        )}
      </div>
    </div>
  )
}
