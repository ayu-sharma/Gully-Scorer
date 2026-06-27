import { kv } from "@vercel/kv";
import type { MatchState } from "@/types";

const key = (id: string) => `gully:match:${id}`;

export async function PUT(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "missing id" }, { status: 400 });

  try {
    const match = (await request.json()) as MatchState;
    await kv.set(key(id), match);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json(null, { headers: { "Cache-Control": "no-store" } });

  const match = await kv.get<MatchState>(key(id));
  return Response.json(match ?? null, { headers: { "Cache-Control": "no-store" } });
}
