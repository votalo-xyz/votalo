import { handleRelay } from "@/lib/relay/handler";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return handleRelay(req, "createGroup");
}
