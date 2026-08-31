import { findYoutubeMatch } from "@/lib/youtube"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const trackId = searchParams.get("trackId")
  const name = searchParams.get("name")
  const artist = searchParams.get("artist") ?? ""

  if (!trackId || !name) {
    return Response.json({ error: "Missing trackId or name" }, { status: 400 })
  }

  try {
    const match = await findYoutubeMatch(trackId, name, artist)
    return Response.json({ match })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
