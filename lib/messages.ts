import { sql } from "./db";

export type ToolTrace = {
  tool: string;
  input: unknown;
  output: unknown;
};

export async function ensureConversation(id: string, productId: string) {
  await sql`
    INSERT INTO conversations (id, product_id)
    VALUES (${id}, ${productId})
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function saveMessage(input: {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  toolTrace?: ToolTrace[] | null;
}) {
  await sql`
    INSERT INTO messages (id, conversation_id, role, content, tool_trace)
    VALUES (
      ${input.id},
      ${input.conversationId},
      ${input.role},
      ${input.content},
      ${input.toolTrace ? sql.json(input.toolTrace) : null}
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function listMessages(conversationId: string) {
  const rows = await sql<
    {
      id: string;
      role: "user" | "assistant";
      content: string;
      tool_trace: ToolTrace[] | null;
    }[]
  >`
    SELECT id, role, content, tool_trace
    FROM messages
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    toolTrace: row.tool_trace ?? [],
  }));
}
