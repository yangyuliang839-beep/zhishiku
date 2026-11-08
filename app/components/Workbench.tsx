"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useState } from "react";

type Spec = { name: string; value: string };
type DocumentInfo = {
  id: string;
  title: string;
  version: string;
  headings: string[];
};
type Product = {
  id: string;
  name: string;
  documents: DocumentInfo[];
  specs: Spec[];
};
type ToolTrace = { tool: string; input: unknown; output: unknown };
type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolTrace: ToolTrace[];
};

const suggestions = [
  "电池容量是多少？",
  "充电时指示灯是什么颜色？",
  "额定功率是多少？",
  "支持无线充电吗？",
];

function readableError(message: string) {
  try {
    const body = JSON.parse(message) as { error?: string };
    if (body.error) return body.error;
  } catch {
    return message;
  }
  return message;
}

function conversationKey(productId: string) {
  return `zhishiku-conv-${productId}`;
}

function readTool(part: UIMessage["parts"][number]) {
  if (part.type === "dynamic-tool") {
    return {
      name: part.toolName,
      state: part.state,
      input: "input" in part ? part.input : undefined,
      output: "output" in part ? part.output : undefined,
    };
  }
  if (part.type.startsWith("tool-") && "state" in part) {
    return {
      name: part.type.slice("tool-".length),
      state: part.state,
      input: "input" in part ? part.input : undefined,
      output: "output" in part ? part.output : undefined,
    };
  }
  return null;
}

function toUIMessage(message: StoredMessage): UIMessage {
  const parts: UIMessage["parts"] = message.toolTrace.map((trace, index) => ({
    type: "dynamic-tool",
    toolName: trace.tool,
    toolCallId: `${message.id}-tool-${index}`,
    state: "output-available",
    input: trace.input,
    output: trace.output,
  }));
  parts.push({ type: "text", text: message.content });
  return { id: message.id, role: message.role, parts };
}

function citationsOf(message: UIMessage) {
  return message.parts.flatMap((part) => {
    const tool = readTool(part);
    if (tool?.name !== "searchDocs" || !tool.output || typeof tool.output !== "object") {
      return [];
    }
    const chunks = (tool.output as { chunks?: unknown }).chunks;
    if (!Array.isArray(chunks)) return [];
    return chunks.flatMap((chunk) => {
      if (!chunk || typeof chunk !== "object") return [];
      const item = chunk as {
        documentTitle?: string;
        heading?: string;
        content?: string;
      };
      if (!item.heading || !item.content) return [];
      return [
        {
          documentTitle: item.documentTitle ?? "说明书",
          heading: item.heading,
          content: item.content,
        },
      ];
    });
  });
}

export function Workbench() {
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [productId, setProductId] = useState("x1");
  const [input, setInput] = useState("");
  const [transport] = useState(() => new DefaultChatTransport({ api: "/api/chat" }));
  const { messages, sendMessage, setMessages, status, error } = useChat({ transport });
  const product = products.find((item) => item.id === productId) ?? products[0];
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/catalog")
      .then(async (response) => {
        const body = (await response.json()) as { products?: Product[]; error?: string };
        if (!response.ok) throw new Error(body.error ?? "目录加载失败");
        if (!cancelled) {
          setProducts(body.products ?? []);
          setCatalogError(null);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setCatalogError(reason instanceof Error ? reason.message : "目录加载失败");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(conversationKey(productId));
    const id = stored ?? crypto.randomUUID();
    localStorage.setItem(conversationKey(productId), id);
    let cancelled = false;
    fetch(`/api/messages?conversationId=${encodeURIComponent(id)}`)
      .then(async (response) => {
        const body = (await response.json()) as { messages?: StoredMessage[]; error?: string };
        if (!response.ok) throw new Error(body.error ?? "对话加载失败");
        if (!cancelled) setMessages((body.messages ?? []).map(toUIMessage));
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, setMessages]);

  function ask(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const stored = localStorage.getItem(conversationKey(productId));
    const id = stored ?? crypto.randomUUID();
    localStorage.setItem(conversationKey(productId), id);
    setInput("");
    void sendMessage({ text: question }, { body: { productId, conversationId: id } });
  }

  return (
    <main className="grid h-screen grid-cols-1 bg-stone-100 text-stone-900 md:grid-cols-[320px_1fr]">
      <aside className="overflow-y-auto border-b border-stone-200 bg-white p-5 md:border-r md:border-b-0">
        <p className="text-xs font-medium tracking-wide text-stone-500">产品知识库</p>
        <h1 className="mt-1 text-xl font-semibold">型号和资料</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          左边来自数据库。右边的助手只能查当前选中的型号。
        </p>
        {catalogError ? (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm leading-6 text-red-700">{catalogError}</p>
        ) : null}
        <div className="mt-5 flex gap-2">
          {products.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setProductId(item.id)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                item.id === product?.id
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-700"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
        {product?.documents.map((document) => (
          <section key={document.id} className="mt-6">
            <h2 className="text-sm font-semibold">{document.title}</h2>
            <p className="text-xs text-stone-500">版本 {document.version}</p>
            {document.headings.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">还没有切片。先运行入库脚本。</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-stone-700">
                {document.headings.map((heading) => (
                  <li key={heading}>{heading}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <section className="mt-6">
          <h2 className="text-sm font-semibold">参数表</h2>
          <dl className="mt-2 space-y-2 text-sm">
            {product?.specs.map((spec) => (
              <div key={spec.name} className="flex justify-between gap-4 border-b border-stone-100 pb-2">
                <dt className="text-stone-500">{spec.name}</dt>
                <dd className="font-medium">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </aside>
      <section className="flex min-h-0 flex-col">
        <div className="border-b border-stone-200 bg-white px-5 py-4">
          <h2 className="font-semibold">{product ? `问 ${product.name}` : "问产品"}</h2>
          <p className="mt-1 text-sm text-stone-600">
            回答上方会显示调用了哪个工具、返回了什么。引用可以展开原文。
          </p>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <p className="text-sm text-stone-500">从下面的问题开始，或者自己输入。</p>
          ) : null}
          {messages.map((message) => {
            const tools = message.parts.flatMap((part) => {
              const tool = readTool(part);
              return tool ? [tool] : [];
            });
            const citations = citationsOf(message);
            return (
              <article key={message.id} className="space-y-2">
                <p className="text-xs text-stone-500">{message.role === "user" ? "你" : "助手"}</p>
                {tools.length > 0 ? (
                  <div className="space-y-2">
                    {tools.map((tool, index) => (
                      <pre
                        key={`${message.id}-tool-${index}`}
                        className="overflow-x-auto rounded-md bg-stone-900 p-3 text-xs leading-5 text-stone-100"
                      >
                        {tool.name} · {tool.state}
                        {"\n"}
                        {JSON.stringify({ input: tool.input, output: tool.output }, null, 2)}
                      </pre>
                    ))}
                  </div>
                ) : null}
                {message.parts
                  .filter((part) => part.type === "text" && part.text)
                  .map((part, index) => (
                    <p key={`${message.id}-text-${index}`} className="whitespace-pre-wrap text-sm leading-7">
                      {part.type === "text" ? part.text : ""}
                    </p>
                  ))}
                {citations.map((citation) => (
                  <details key={`${message.id}-${citation.heading}`} className="rounded-md bg-white p-3 text-sm">
                    <summary className="cursor-pointer font-medium">
                      {citation.documentTitle} · {citation.heading}
                    </summary>
                    <p className="mt-2 leading-6 text-stone-700">{citation.content}</p>
                  </details>
                ))}
              </article>
            );
          })}
          {error ? <p className="text-sm text-red-700">{readableError(error.message)}</p> : null}
        </div>
        <form
          className="border-t border-stone-200 bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            ask(input);
          }}
        >
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={busy}
                onClick={() => ask(suggestion)}
                className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700 disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="问当前型号的问题"
              className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-md bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {busy ? "回答中" : "发送"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
