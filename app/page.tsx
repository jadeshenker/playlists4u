import Image from "next/image"
import Link from "next/link"
import SiteHeader from "@/components/site-header"
import TagChips from "@/components/tag-chips"
import { fetchPlaylistChannels, type ArenaBlockThumbnail } from "@/lib/arena"
import { formatAddedAt, formatShortDate } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function Home() {
  const playlists = await fetchPlaylistChannels()

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />

      {/* Mobile: two-line rows — title on top, author and date underneath. */}
      <ul className="md:hidden">
        {playlists.map((playlist) => (
          <li key={playlist.slug}>
            <Link
              href={`/playlists/${playlist.appSlug}`}
              className="flex items-center gap-3 border-b border-black px-3 py-2 active:bg-gray-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate">{playlist.title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                  {playlist.creator.avatarUrl ? (
                    <Image
                      src={playlist.creator.avatarUrl}
                      alt=""
                      width={16}
                      height={16}
                      className="h-4 w-4 shrink-0 rounded-full object-cover"
                    />
                  ) : null}
                  <span className="truncate">{playlist.creator.name}</span>
                  <span>·</span>
                  <span className="shrink-0">{formatShortDate(playlist.addedAt)}</span>
                </p>
              </div>
              {/* Room for exactly three thumbnails. */}
              <div className="w-[92px] shrink-0">
                <Thumbnails thumbnails={playlist.thumbnails} />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop: table. Each cell's content is its own link (padding moved
          onto the link so the whole row is clickable); only the title's link
          is focusable, so keyboard users tab once per row. */}
      <table className="hidden w-full table-fixed border-collapse md:table">
        <colgroup>
          <col className="w-10" />
          <col className="w-1/5" />
          <col className="w-1/3" />
          <col className="w-1/5" />
          <col className="w-10" />
          <col className="w-32" />
        </colgroup>
        <tbody>
          {playlists.map((playlist, index) => {
            const href = `/playlists/${playlist.appSlug}`
            return (
              <tr key={playlist.slug} className="border-b border-black hover:bg-gray-50 active:bg-gray-50">
                <td className="p-0 align-middle text-gray-400">
                  <Link href={href} tabIndex={-1} className="block py-2 pl-6 pr-4">
                    {index + 1}
                  </Link>
                </td>
                <td className="p-0 align-middle">
                  <Link href={href} className="block truncate py-2 pr-4">
                    {playlist.title}
                  </Link>
                </td>
                <td className="overflow-hidden p-0 align-middle">
                  <Link href={href} tabIndex={-1} className="block py-2 pr-4">
                    <Thumbnails thumbnails={playlist.thumbnails} />
                  </Link>
                </td>
                <td className="p-0 align-middle">
                  <Link href={href} tabIndex={-1} className="block py-2 pr-4">
                    <TagChips tags={playlist.tags} />
                  </Link>
                </td>
                <td className="p-0 align-middle">
                  <Link href={href} tabIndex={-1} className="block py-2 pr-4">
                    <div
                      className="tooltip tooltip-slim h-7 w-7"
                      data-tooltip={playlist.creator.name}
                    >
                      <div className="h-full w-full overflow-hidden rounded-full">
                        {playlist.creator.avatarUrl ? (
                          <Image
                            src={playlist.creator.avatarUrl}
                            alt={playlist.creator.name}
                            width={28}
                            height={28}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="p-0 align-middle">
                  <Link href={href} tabIndex={-1} className="block py-2 pr-6">
                    {formatAddedAt(playlist.addedAt)}
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </main>
  )
}

function Thumbnails({ thumbnails }: { thumbnails: ArenaBlockThumbnail[] }) {
  return (
    <div className="flex gap-1 overflow-hidden">
      {thumbnails.map((thumbnail) => (
        <div
          key={thumbnail.id}
          className={`flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden ${thumbnail.imageUrl ? "" : "border border-gray-200 bg-gray-50"}`}
        >
          {thumbnail.imageUrl ? (
            <Image
              src={thumbnail.imageUrl}
              alt={thumbnail.title ?? ""}
              width={28}
              height={28}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-px w-4 bg-gray-300" />
          )}
        </div>
      ))}
    </div>
  )
}
