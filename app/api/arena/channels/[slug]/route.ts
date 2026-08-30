import { fetchArenaChannel } from "@/lib/arena"

type RouteContext = { params: Promise<{ slug: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params

  try {
    const channel = await fetchArenaChannel(slug)
    return Response.json(channel)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
