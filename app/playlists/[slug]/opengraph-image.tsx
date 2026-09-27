import { ImageResponse } from "next/og"
import { fetchPlaylistBySlug } from "@/lib/arena"

export const size = { width: 1200, height: 1200 }
export const contentType = "image/png"

type ImageProps = { params: Promise<{ slug: string }> }

export default async function Image({ params }: ImageProps) {
  const { slug } = await params
  const playlist = await fetchPlaylistBySlug(slug)

  const firstTrackId = playlist?.trackIds[0]
  const albumArt = firstTrackId ? playlist?.trackImages[firstTrackId] : null

  if (albumArt) {
    const response = await fetch(albumArt)
    if (response.ok) {
      return new Response(response.body, {
        headers: {
          "Content-Type": response.headers.get("Content-Type") ?? "image/jpeg",
        },
      })
    }
  }

  const title = playlist?.title ?? "ilovemusic"

  const fontSize =
    title.length > 40 ? 64 : title.length > 24 ? 84 : title.length > 14 ? 104 : 132

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#74F3FF",
          padding: "100px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            fontSize,
            fontWeight: 900,
            color: "#000",
            textAlign: "center",
            justifyContent: "center",
            textTransform: "uppercase",
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
      </div>
    ),
    { ...size }
  )
}
