import Image from "next/image"
import ClickableRow from "@/components/clickable-row"
import TagChips from "@/components/tag-chips"
import { fetchPlaylistChannels } from "@/lib/arena"
import { formatAddedAt } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function Home() {
  const playlists = await fetchPlaylistChannels()

  return (
    <main className="flex flex-1 flex-col">
      <div className="py-2 border-b border-gray-600">
      <p className="px-6 font-semibold text-sm">
        playlists 4u
      </p>
      <p className="px-6">
        powered by{" "}
        <a href="https://www.are.na/jade-s-d2yaygzp528/playlists4u/table" className="link">
          are.na
        </a>
      </p>
      </div>
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-10" />
          <col className="w-1/5" />
          <col className="w-1/3" />
          <col className="w-1/5" />
          <col className="w-10" />
          <col className="w-32" />
        </colgroup>
        <tbody>
          {playlists.map((playlist, index) => (
            <ClickableRow
              key={playlist.slug}
              href={`/playlists/${playlist.appSlug}`}
              className="border-b border-black hover:bg-gray-50"
            >
              <td className="py-2 pl-6 pr-4 align-middle text-gray-400">{index + 1}</td>
              <td className="truncate py-2 pr-4 align-middle">{playlist.title}</td>
              <td className="overflow-hidden py-2 pr-4 align-middle">
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
              <td className="py-2 pr-4 align-middle">
                <TagChips tags={playlist.tags} />
              </td>
              <td className="py-2 pr-4 align-middle">
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
              <td className="py-2 pr-6 align-middle">{formatAddedAt(playlist.addedAt)}</td>
            </ClickableRow>
          ))}
        </tbody>
      </table>
    </main>
  )
}
