import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  isStepCount,
  type UIMessage,
} from "ai";
import { chatModel, instructionsFor } from "@/lib/ai";
import { requireProduct } from "@/lib/catalog";
import { ensureConversation, saveMessage, type ToolTrace } from "@/lib/messages";
import { createTools } from "@/lib/tools";

export const maxDuration = 60;

type ChatBody = {
  messages?: UIMessage[];
  productId?: string;
  conversationId?: string;
};

function textOf(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export async function POST(req: Request) {
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return Response.json({ error: "请求不是 JSON" }, { status: 400 });
  }

  const messages = body.messages ?? [];
  const productId = body.productId;
  const conversationId = body.conversationId;
  const userMessage = [...messages].reverse().find((message) => message.role === "user");

  if (!productId || !conversationId || !userMessage) {
    return Response.json(
      { error: "需要 productId、conversationId 和用户消息" },
      { status: 400 },
    );
  }
  if (conversationId.length > 80) {
    return Response.json({ error: "conversationId 过长" }, { status: 400 });
  }

  try {
    const product = await requireProduct(productId);
    if (!product) {
      return Response.json({ error: "没有这个型号" }, { status: 404 });
    }

    const model = chatModel();
    const tools = createTools(product.id);
    await ensureConversation(conversationId, product.id);
    await saveMessage({
      id: userMessage.id,
      conversationId,
      role: "user",
      content: textOf(userMessage),
    });

    // 这个免费模型的流式响应里没有工具参数，工具循环会停住。
    // 先拿完整结果，再把工具轨迹和回答推给页面。
    const result = await generateText({
      model,
      instructions: instructionsFor(product.name),
      messages: await convertToModelMessages(messages, { tools }),
      tools,
      stopWhen: isStepCount(5),
    });
    const toolTrace: ToolTrace[] = result.toolResults.map((item) => ({
      tool: item.toolName,
      input: "input" in item ? item.input : undefined,
      output: "output" in item ? item.output : undefined,
    }));
    await saveMessage({
      id: crypto.randomUUID(),
      conversationId,
      role: "assistant",
      content: result.text,
      toolTrace,
    });

    const stream = createUIMessageStream({
      execute: ({ writer }) => {
        for (const call of result.toolCalls) {
          const output = result.toolResults.find(
            (item) => item.toolCallId === call.toolCallId,
          );
          writer.write({
            type: "tool-input-available",
            toolCallId: call.toolCallId,
            toolName: call.toolName,
            input: call.input,
            dynamic: true,
          });
          writer.write({
            type: "tool-output-available",
            toolCallId: call.toolCallId,
            output: output && "output" in output ? output.output : undefined,
            dynamic: true,
          });
        }

        const textId = "answer";
        writer.write({ type: "text-start", id: textId });
        writer.write({ type: "text-delta", id: textId, delta: result.text });
        writer.write({ type: "text-end", id: textId });
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    const message = error instanceof Error ? error.message : "回答失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
