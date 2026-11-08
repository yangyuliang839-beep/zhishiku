import { createOpenAI } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import { loadEnv } from "./env";

loadEnv();

function provider() {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("缺少 AI_API_KEY。把它写进 .env.local 后再入库或提问。");
  }
  return createOpenAI({
    apiKey,
    baseURL: process.env.AI_BASE_URL,
  });
}

export function chatModel() {
  const model = process.env.CHAT_MODEL;
  if (!model) throw new Error("缺少 CHAT_MODEL");
  return provider().chat(model);
}

export function embeddingModel() {
  const model = process.env.EMBEDDING_MODEL;
  if (!model) throw new Error("缺少 EMBEDDING_MODEL");
  return provider().embedding(model);
}

export async function embedQuery(value: string) {
  const result = await embed({
    model: embeddingModel(),
    value,
  });
  return result.embedding;
}

export async function embedDocuments(values: string[]) {
  const result = await embedMany({
    model: embeddingModel(),
    values,
  });
  return result.embeddings;
}

export function instructionsFor(productName: string) {
  return [
    "你是产品知识库助手。",
    `当前产品是「${productName}」。只查这个产品，不要改查其他型号。`,
    "说明书里的步骤、指示灯、安全说明，调用 searchDocs。",
    "电池容量、额定功率这类固定参数，调用 getSpec。数字以 getSpec 的返回值为准。",
    "只根据工具返回的内容回答。工具没有的信息，回答「资料里没有」。",
    "回答里写上章节标题或参数名。不要编造型号和数字。",
  ].join("\n");
}
