import Image from "next/image"
import ClickableRow from "@/components/clickable-row"
import SiteHeader from "@/components/site-header"
import TagChips from "@/components/tag-chips"
import { fetchPlaylistChannels } from "@/lib/arena"
import { formatAddedAt } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function Home() {
  const playlists = await fetchPlaylistChannels()

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-8 md:w-10" />
          <col className="md:w-1/5" />
          <col className="w-[100px] md:w-1/3" />
          <col className="hidden md:table-column md:w-1/5" />
          <col className="w-9 md:w-10" />
          <col className="w-28 md:w-32" />
        </colgroup>
        <tbody>
          {playlists.map((playlist, index) => (
            <ClickableRow
              key={playlist.slug}
              href={`/playlists/${playlist.appSlug}`}
              className="border-b border-black hover:bg-gray-50"
            >
              <td className="py-2 pl-3 pr-2 align-middle text-gray-400 md:pl-6 md:pr-4">{index + 1}</td>
              <td className="truncate py-2 pr-2 align-middle md:pr-4">{playlist.title}</td>
              <td className="overflow-hidden py-2 pr-2 align-middle md:pr-4">
                <div className="flex gap-1 overflow-hidden">
                  {playlist.thumbnails.map((thumbnail) => (
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
              </td>
              <td className="hidden py-2 pr-4 align-middle md:table-cell">
                <TagChips tags={playlist.tags} />
              </td>
              <td className="py-2 pr-2 align-middle md:pr-4">
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
              </td>
              <td className="py-2 pr-3 align-middle md:pr-6">{formatAddedAt(playlist.addedAt)}</td>
            </ClickableRow>
          ))}
        </tbody>
      </table>
    </main>
  )
}
