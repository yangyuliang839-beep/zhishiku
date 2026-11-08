import { listMessages } from "@/lib/messages";

export async function GET(req: Request) {
  const conversationId = new URL(req.url).searchParams.get("conversationId");
  if (!conversationId || conversationId.length > 80) {
    return Response.json({ error: "需要 conversationId" }, { status: 400 });
  }

  try {
    return Response.json({ messages: await listMessages(conversationId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取对话失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
