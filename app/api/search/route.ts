import { requireProduct } from "@/lib/catalog";
import { searchChunks } from "@/lib/retrieve";

export async function POST(req: Request) {
  const body = (await req.json()) as { productId?: string; query?: string };
  if (!body.productId || !body.query?.trim()) {
    return Response.json({ error: "需要 productId 和 query" }, { status: 400 });
  }

  const product = await requireProduct(body.productId);
  if (!product) {
    return Response.json({ error: "没有这个型号" }, { status: 404 });
  }

  try {
    const chunks = await searchChunks(product.id, body.query.trim());
    return Response.json({ product, chunks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "检索失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
