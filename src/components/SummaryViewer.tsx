"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

type Props = {
  markdown: string;
  className?: string;
};

type MyCodeProps = React.HTMLAttributes<HTMLElement> & {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
};

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), "className"],
    h1: [...((defaultSchema.attributes as any)?.h1 || []), "id"],
    h2: [...((defaultSchema.attributes as any)?.h2 || []), "id"],
    h3: [...((defaultSchema.attributes as any)?.h3 || []), "id"],
    h4: [...((defaultSchema.attributes as any)?.h4 || []), "id"],
    h5: [...((defaultSchema.attributes as any)?.h5 || []), "id"],
    h6: [...((defaultSchema.attributes as any)?.h6 || []), "id"],
  },
};

const CodeRenderer = ({ inline, className, children, ...props }: MyCodeProps) =>
  inline ? (
    <code className="px-1 py-0.5 rounded bg-gray-100" {...props}>
      {children}
    </code>
  ) : (
    <pre className="rounded-xl border bg-gray-50 p-3 overflow-x-auto">
      <code className={className} {...props}>
        {children}
      </code>
    </pre>
  );

const markdownComponents: Components = {
  h1: ({ node, ...props }) => <h1 className="mb-3" {...props} />,
  h2: ({ node, ...props }) => <h2 className="mt-6" {...props} />,
  h3: ({ node, ...props }) => <h3 className="mt-4" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc pl-6" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal pl-6" {...props} />,
  blockquote: ({ node, ...props }) => (
    <blockquote className="border-l-4 pl-4 italic text-gray-700" {...props} />
  ),
  a: ({ node, ...props }) => (
    <a target="_blank" rel="noopener noreferrer" {...props} />
  ),
  code: CodeRenderer,
};

export default function SummaryViewer({ markdown, className }: Props) {
  const [raw, setRaw] = useState(false);
  const articleRef = useRef<HTMLElement>(null);

  const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>(
    []
  );
  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;
    const nodes = Array.from(el.querySelectorAll("h1, h2, h3"));
    const items = nodes
      .map((n) => ({
        id: n.id,
        text: n.textContent?.trim() || "",
        level: Number(n.tagName.substring(1)),
      }))
      .filter((i) => i.id && i.text);
    setToc(items);
  }, [markdown, raw]);

  const downloadMd = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "summary.md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copyMd = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      /* noop */
    }
  };

  const hasToc = useMemo(() => toc.length > 1, [toc]);

  return (
    <div className={className}>
      {hasToc && !raw && (
        <nav className="mb-4 rounded-xl border bg-white p-3">
          <div className="mb-2 text-xs font-semibold text-gray-500">
            Outline
          </div>
          <ul className="space-y-1 text-sm">
            {toc.map((h) => (
              <li key={h.id} className="leading-5">
                <a
                  href={`#${h.id}`}
                  className="text-gray-700 hover:underline"
                  style={{ paddingLeft: (h.level - 1) * 12 }}
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <article ref={articleRef} className="prose max-w-none">
        {raw ? (
          <pre className="whitespace-pre-wrap text-sm">{markdown}</pre>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[
              rehypeSlug,
              [rehypeAutolinkHeadings, { behavior: "append" }],
              [rehypeSanitize, sanitizeSchema],
            ]}
            components={markdownComponents}
          >
            {markdown}
          </ReactMarkdown>
        )}
      </article>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-1.5">
        <button
          onClick={() => setRaw((v) => !v)}
          className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50 cursor-pointer"
          aria-label="Toggle raw/rendered view"
        >
          {raw ? "Show rendered" : "Show raw"}
        </button>
        <button
          onClick={copyMd}
          className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50 cursor-pointer"
          aria-label="Copy Markdown"
        >
          Copy
        </button>
        <button
          onClick={downloadMd}
          className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50 cursor-pointer"
          aria-label="Download Markdown file"
        >
          Download
        </button>
      </div>
    </div>
  );
}
