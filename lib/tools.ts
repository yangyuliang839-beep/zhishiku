import { tool } from "ai";
import { z } from "zod";
import { getSpec, searchChunks } from "./retrieve";

export function createTools(productId: string) {
  return {
    searchDocs: tool({
      description:
        "在当前产品的说明书段落里检索和问题相关的原文。查操作、指示灯、安全说明时使用。",
      inputSchema: z.object({
        query: z.string().describe("用来检索手册的问题"),
      }),
      execute: async ({ query }) => {
        const chunks = await searchChunks(productId, query);
        return {
          found: chunks.length > 0,
          chunks: chunks.map((chunk) => ({
            documentTitle: chunk.documentTitle,
            heading: chunk.heading,
            content: chunk.content,
            score: chunk.score,
          })),
        };
      },
    }),
    getSpec: tool({
      description:
        "查询当前产品的固定参数，例如电池容量、额定功率。数字以这个工具的返回值为准。",
      inputSchema: z.object({
        name: z.string().describe("参数名，例如电池容量、额定功率"),
      }),
      execute: async ({ name }) => {
        const spec = await getSpec(productId, name);
        if (!spec) return { found: false as const, name };
        return { found: true as const, name: spec.name, value: spec.value };
      },
    }),
  };
}
