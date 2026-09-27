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
    <div className="block-viewer fixed inset-x-0 z-40 flex w-full flex-col-reverse border-t border-x border-gray-300 bg-white md:static md:inset-auto md:z-auto md:border md:bg-transparent">
      <button
        onClick={toggleCollapsed}
        className="flex w-full cursor-pointer items-center justify-between bg-white px-3 py-1.5 text-xs md:bg-transparent"
      >
        <span>block viewer</span>
        <span>{collapsed ? "+" : "−"}</span>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? "grid-rows-[1fr] border-b border-gray-300" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden bg-white md:bg-transparent">
          {selectedBlock && (
            <div className="block-viewer-content flex flex-col gap-2 p-3 text-xs md:p-0">
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
              <div className="flex flex-col gap-2 md:px-3 md:pb-3">
                <p className="font-semibold">{selectedBlock.title || "--"}</p>
                <p className="text-gray-500">{selectedBlock.description || "--"}</p>
                <p className="text-gray-400">added {formatAddedAt(selectedBlock.addedAt)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
