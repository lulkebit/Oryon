import {
  memo,
  useCallback,
  useMemo,
  useState,
  isValidElement,
  type ComponentProps,
  type ReactNode,
} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark'
import oneLight from 'react-syntax-highlighter/dist/esm/styles/prism/one-light'
import { Copy, TickCircle } from 'iconsax-react'
import { useUiStore } from '@/stores/uiStore'

interface MarkdownContentProps {
  content: string
}

export const MarkdownContent = memo(({ content }: MarkdownContentProps) => (
  <div className="markdown-body">
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
      {content}
    </ReactMarkdown>
  </div>
))

MarkdownContent.displayName = 'MarkdownContent'

const LANG_ALIASES: Record<string, string> = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  py: 'python',
  python3: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  fish: 'bash',
  yml: 'yaml',
  rs: 'rust',
  rb: 'ruby',
  jl: 'julia',
  kt: 'kotlin',
  kts: 'kotlin',
  md: 'markdown',
  mkd: 'markdown',
  dockerfile: 'docker',
  vue: 'markup',
  svelte: 'markup',
  html: 'markup',
  htm: 'markup',
  xml: 'markup',
  plist: 'xml',
}

const SUPPORTED_LANG = new Set(
  SyntaxHighlighter.supportedLanguages as string[],
)

function getCodeString(node: ReactNode): string {
  if (node == null || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map(getCodeString).join('')
  }
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode }
    return getCodeString(props.children)
  }
  return ''
}

function parseFenceLanguage(className?: string): string {
  if (!className) return ''
  const m = /language-([\w-]+)/.exec(className)
  return m?.[1] ?? ''
}

function resolvePrismLanguage(fenceLabel: string): string {
  const key = fenceLabel.trim().toLowerCase()
  const mapped = LANG_ALIASES[key] ?? key
  if (SUPPORTED_LANG.has(mapped)) return mapped
  if (SUPPORTED_LANG.has(key)) return key
  return 'clike'
}

function CodeBlock({
  className,
  codeText,
}: {
  className?: string
  codeText: string
}) {
  const resolvedTheme = useUiStore((s) => s.resolvedTheme)
  const prismStyle = resolvedTheme === 'dark' ? oneDark : oneLight
  const fenceLabel = parseFenceLanguage(className)
  const prismLang = resolvePrismLanguage(fenceLabel)
  const headerLabel = (
    fenceLabel || (prismLang === 'clike' ? 'code' : prismLang) || 'code'
  ).toUpperCase()
  const [copied, setCopied] = useState(false)

  const trimmedCopy = useMemo(
    () => codeText.replace(/\n$/, ''),
    [codeText],
  )

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(trimmedCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [trimmedCopy])

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
          {headerLabel}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy code'}
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
      <SyntaxHighlighter
        language={prismLang}
        style={prismStyle}
        PreTag="div"
        codeTagProps={{
          style: {
            fontFamily: 'var(--font-mono)',
          },
        }}
        customStyle={{
          margin: 0,
          padding: '12px 16px',
          fontSize: '12px',
          lineHeight: '20px',
          fontFamily: 'var(--font-mono)',
          borderRadius: 0,
          background: 'transparent',
        }}
      >
        {trimmedCopy}
      </SyntaxHighlighter>
    </div>
  )
}

const COMPONENTS: ComponentProps<typeof ReactMarkdown>['components'] = {
  pre({ children }) {
    return <>{children}</>
  },

  code({ className, children, ...rest }) {
    const codeText = getCodeString(children)
    const hasFenceLang = Boolean(parseFenceLanguage(className))
    const isBlock = hasFenceLang || codeText.includes('\n')

    if (isBlock) {
      return <CodeBlock className={className} codeText={codeText} />
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

  blockquote({ children }) {
    return (
      <div
        style={{
          margin: '8px 0',
          padding: '8px 12px',
          borderRadius: '8px',
          background: 'var(--bg-base)',
          border: '1px solid var(--border-subtle)',
          fontSize: '12px',
          lineHeight: '18px',
        }}
      >
        {children}
      </div>
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
