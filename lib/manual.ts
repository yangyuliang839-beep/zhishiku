export type ManualSection = {
  heading: string;
  content: string;
};

export type Manual = {
  id: string;
  productId: string;
  title: string;
  version: string;
  sections: ManualSection[];
};

export function parseManual(raw: string, fileName: string): Manual {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`${fileName} 缺少开头的 --- 元数据`);
  }

  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    meta[line.slice(0, index).trim()] = line
      .slice(index + 1)
      .trim()
      .replace(/^"|"$/g, "");
  }

  const sections = match[2]
    .split(/^## /m)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [headingLine, ...rest] = part.split(/\r?\n/);
      return {
        heading: headingLine.trim(),
        content: rest.join("\n").trim(),
      };
    })
    .filter((section) => section.heading && section.content);

  const manual = {
    id: meta.id,
    productId: meta.productId,
    title: meta.title,
    version: meta.version,
    sections,
  };

  if (!manual.id || !manual.productId || !manual.title || !manual.version) {
    throw new Error(`${fileName} 的 id、productId、title、version 必须都写上`);
  }
  if (sections.length === 0) {
    throw new Error(`${fileName} 没有以 ## 开头的章节`);
  }

  return manual;
}
