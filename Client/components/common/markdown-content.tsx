import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

interface MarkdownContentProps {
  content: string
  className?: string
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn("text-muted-foreground", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-6 mb-3 text-3xl font-semibold tracking-tight text-foreground first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-5 mb-3 text-2xl font-semibold tracking-tight text-foreground first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 mb-2 text-xl font-semibold tracking-tight text-foreground first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-4 leading-relaxed last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-4 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mb-4 border-l-4 border-primary/30 bg-secondary/30 py-2 pl-4 italic">
              {children}
            </blockquote>
          ),
          code: ({ children, className: codeClassName }) => {
            const isInline = !codeClassName
            if (isInline) {
              return (
                <code className="rounded bg-secondary/70 px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">
                  {children}
                </code>
              )
            }

            return (
              <code className="block overflow-x-auto rounded-lg bg-secondary/70 p-3 font-mono text-sm text-foreground">
                {children}
              </code>
            )
          },
          a: ({ href, children }) => {
            const isExternal = href?.startsWith("http")
            return (
              <a
                href={href}
                className="font-medium text-primary underline-offset-4 hover:underline"
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
              >
                {children}
              </a>
            )
          },
          hr: () => <hr className="my-6 border-border" />,
          table: ({ children }) => (
            <div className="mb-4 overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-border/70 bg-secondary/35 px-3 py-2 text-left font-semibold text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border/50 px-3 py-2 align-top">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
