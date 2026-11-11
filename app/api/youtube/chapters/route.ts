import { getVideoChapters } from "@/lib/youtube"

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/

export async function GET(request: Request) {
  const videoId = new URL(request.url).searchParams.get("videoId")

  if (!videoId || !VIDEO_ID_RE.test(videoId)) {
    return Response.json({ error: "Missing or invalid videoId" }, { status: 400 })
  }

  try {
    const chapters = await getVideoChapters(videoId)
    return Response.json({ chapters })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
