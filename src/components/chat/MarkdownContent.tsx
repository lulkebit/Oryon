import { memo, useCallback, useState, type ComponentProps } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Copy, TickCircle } from 'iconsax-react'

interface MarkdownContentProps {
  content: string
}

export const MarkdownContent = memo(({ content }: MarkdownContentProps) => (
  <div className="markdown-body">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={COMPONENTS}
    >
      {content}
    </ReactMarkdown>
  </div>
))

MarkdownContent.displayName = 'MarkdownContent'

function CodeBlock({
  className,
  children,
}: {
  className?: string
  children: string
}) {
  const language = className?.replace('hljs language-', '') ?? ''
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children.replace(/\n$/, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [children])

  return (
    <div
      style={{
        position: 'relative',
        margin: '12px 0',
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'var(--bg-base)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{
          padding: '6px 12px',
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center transition-colors"
          style={{
            gap: '4px',
            fontSize: '11px',
            color: copied ? 'var(--status-success)' : 'var(--text-muted)',
            background: 'none',
            border: 'none',
            padding: '2px 6px',
            borderRadius: '4px',
          }}
          onMouseEnter={(e) => {
            if (!copied)
              e.currentTarget.style.color = 'var(--text-secondary)'
          }}
          onMouseLeave={(e) => {
            if (!copied)
              e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          {copied ? (
            <>
              <TickCircle size={12} color="currentColor" />
              Copied
            </>
          ) : (
            <>
              <Copy size={12} color="currentColor" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '12px 16px',
          overflow: 'auto',
          fontSize: '12px',
          lineHeight: '20px',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <code className={className}>{children}</code>
      </pre>
    </div>
  )
}

const COMPONENTS: ComponentProps<typeof ReactMarkdown>['components'] = {
  pre({ children }) {
    return <>{children}</>
  },

  code({ className, children, ...rest }) {
    const isBlock = className?.includes('language-') || className?.includes('hljs')
    const text = String(children)

    if (isBlock) {
      return <CodeBlock className={className} children={text} />
    }

    return (
      <code
        {...rest}
        style={{
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '0.9em',
          fontFamily: 'var(--font-mono)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--accent)',
        }}
      >
        {children}
      </code>
    )
  },

  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--accent)', textDecoration: 'underline' }}
      >
        {children}
      </a>
    )
  },

  table({ children }) {
    return (
      <div style={{ overflowX: 'auto', margin: '12px 0' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '12px',
          }}
        >
          {children}
        </table>
      </div>
    )
  },

  th({ children }) {
    return (
      <th
        style={{
          textAlign: 'left',
          padding: '8px 12px',
          borderBottom: '2px solid var(--border-default)',
          fontWeight: 600,
          fontSize: '12px',
          color: 'var(--text-secondary)',
        }}
      >
        {children}
      </th>
    )
  },

  td({ children }) {
    return (
      <td
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {children}
      </td>
    )
  },
}
