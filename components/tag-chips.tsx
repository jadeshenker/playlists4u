export default function TagChips({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="text-xs"
        >
          [{tag}]
        </span>
      ))}
    </div>
  )
}
