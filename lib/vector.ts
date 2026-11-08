export const EMBEDDING_DIMENSIONS = 1024;

export function vectorLiteral(values: number[]) {
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `向量维度是 ${values.length}，表结构要求 ${EMBEDDING_DIMENSIONS}。请使用 BAAI/bge-m3，或同时改 db/schema.sql 里的 vector(${EMBEDDING_DIMENSIONS}) 后重新入库。`,
    );
  }
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error("向量包含非法数字");
  }
  return `[${values.join(",")}]`;
}
