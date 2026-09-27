"use client"

import type { ArenaContentBlock } from "@/lib/arena"
import { useBlockViewer } from "@/components/block-viewer-provider"

/** A grid of uniform squares, are.na-style — images are cropped to fill, text is clipped to fit.
 * Clicking a block opens it in the block viewer. */
export default function ContentGrid({ blocks }: { blocks: ArenaContentBlock[] }) {
  const { selectBlock } = useBlockViewer()

  if (blocks.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-4 px-6 pt-10 sm:grid-cols-3">
      {blocks.map((block) => (
        <button
          key={block.id}
          onClick={() => selectBlock(block)}
          className="flex cursor-pointer flex-col gap-1 text-left"
        >
          <div
            className={`flex aspect-square items-center justify-center overflow-hidden ${block.kind === "text" ? "border border-gray-200" : ""}`}
          >
            {block.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element -- natural size is unknown ahead of time
              <img
                src={block.imageUrl}
                alt={block.title ?? ""}
                className="h-full w-full object-contain"
              />
            ) : (
              <p className="h-full w-full overflow-hidden whitespace-pre-line p-2 text-xs">
                {block.text}
              </p>
            )}
          </div>
          <p className="truncate text-center text-xs text-gray-500">{block.title || "--"}</p>
        </button>
      ))}
    </div>
  )
}
