import { loadCatalog } from "@/lib/catalog";

export async function GET() {
  try {
    return Response.json({ products: await loadCatalog() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "数据库查询失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
