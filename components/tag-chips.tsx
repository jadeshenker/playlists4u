export default function TagChips({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null

  return (
    <div className="text-xs">
      {tags.map((tag, index) => (
        <span key={tag}>
          {index > 0 && " / "}
          {tag}
        </span>
      ))}
    </div>
  )
}
