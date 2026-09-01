import type { ArenaContentBlock } from "@/lib/arena"

/** A grid of uniform squares, are.na-style — images are cropped to fill, text is clipped to fit. */
export default function ContentGrid({ blocks }: { blocks: ArenaContentBlock[] }) {
  if (blocks.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-2 px-6 pt-4 sm:grid-cols-3 md:grid-cols-4">
      {blocks.map((block) => (
        <div
          key={block.id}
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
      ))}
    </div>
  )
}
