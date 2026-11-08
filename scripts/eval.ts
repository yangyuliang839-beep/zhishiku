import { generateText, isStepCount } from "ai";
import { chatModel, instructionsFor } from "../lib/ai";
import { requireProduct } from "../lib/catalog";
import { sql } from "../lib/db";
import { getSpec, searchChunks } from "../lib/retrieve";
import { createTools } from "../lib/tools";

type Case = {
  productId: string;
  question: string;
  include: string[];
  exclude?: string[];
};

const cases: Case[] = [
  { productId: "x1", question: "电池容量是多少？", include: ["5000"], exclude: ["8000"] },
  { productId: "x1", question: "充电时指示灯是什么颜色？", include: ["红"], exclude: ["蓝"] },
  { productId: "x1", question: "充满以后指示灯是什么颜色？", include: ["绿"] },
  { productId: "x1", question: "可以自行拆开外壳吗？", include: ["不要"] },
  { productId: "x1", question: "额定功率是多少？", include: ["20"] },
  { productId: "x2", question: "电池容量是多少？", include: ["8000"], exclude: ["5000"] },
  { productId: "x1", question: "支持无线充电吗？", include: ["没有"], exclude: ["支持无线充电。"] },
  { productId: "x1", question: "能不能带上飞机？", include: ["没有"] },
];

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function checkRetrieval() {
  const x1Power = await getSpec("x1", "额定功率");
  assert(x1Power?.value === "20W", "X1 额定功率应来自 specs 表，值为 20W");

  const x1Capacity = await getSpec("x1", "电池容量");
  assert(x1Capacity?.value === "5000mAh", "X1 电池容量应为 5000mAh");

  const x2Capacity = await getSpec("x2", "电池容量");
  assert(x2Capacity?.value === "8000mAh", "X2 电池容量应为 8000mAh");

  const chunks = await searchChunks("x1", "无线充电和电池容量");
  const text = chunks.map((chunk) => `${chunk.heading}\n${chunk.content}`).join("\n");
  assert(!text.includes("8000"), "查 X1 时检索结果出现了 X2 的容量");
  assert(!text.includes("无线充电"), "查 X1 时检索结果出现了 X2 的无线充电");
  assert(!text.includes("蓝色"), "查 X1 时检索结果出现了 X2 的蓝色指示灯");

  const lights = await searchChunks("x1", "充电时指示灯是什么颜色");
  assert(
    lights.some((chunk) => chunk.content.includes("红色")),
    "X1 指示灯问题没有检索到红色",
  );
  console.log("检索和参数表通过");
}

async function checkAnswers() {
  for (const item of cases) {
    const product = await requireProduct(item.productId);
    if (!product) throw new Error(`没有产品 ${item.productId}`);
    const result = await generateText({
      model: chatModel(),
      instructions: instructionsFor(product.name),
      prompt: item.question,
      tools: createTools(item.productId),
      stopWhen: isStepCount(5),
    });
    const answer = result.text;
    const missing = item.include.filter((word) => !answer.includes(word));
    const leaked = (item.exclude ?? []).filter((word) => answer.includes(word));
    if (missing.length > 0 || leaked.length > 0) {
      throw new Error(
        `${product.name} / ${item.question}\n回答：${answer}\n缺少：${missing.join("、") || "无"}\n不该出现：${leaked.join("、") || "无"}`,
      );
    }
    console.log(`通过 ${product.name}：${item.question}`);
  }
}

async function main() {
  await checkRetrieval();
  if (!process.env.AI_API_KEY) {
    throw new Error("检索已通过。回答验收还需要 AI_API_KEY。");
  }
  await checkAnswers();
  await sql.end();
  console.log("验收通过");
}

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  await sql.end({ timeout: 1 });
  process.exit(1);
});
