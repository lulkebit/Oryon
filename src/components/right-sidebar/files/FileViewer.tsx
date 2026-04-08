import { useEffect, useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark'
import oneLight from 'react-syntax-highlighter/dist/esm/styles/prism/one-light'
import { useUiStore } from '@/stores/uiStore'
import { fsReadFile } from '@/lib/ipc/fs'
import type { FsFileContent } from '@/lib/ipc/fs'

const LANG_ALIASES: Record<string, string> = {
  js: 'javascript',
  mjs: 'javascript',
  ts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  py: 'python',
  sh: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
  rs: 'rust',
  rb: 'ruby',
  go: 'go',
  md: 'markdown',
  json: 'json',
  toml: 'toml',
  css: 'css',
  html: 'markup',
  htm: 'markup',
  xml: 'markup',
  kt: 'kotlin',
  swift: 'swift',
  cpp: 'cpp',
  c: 'c',
  h: 'c',
  cs: 'csharp',
  java: 'java',
  php: 'php',
  sql: 'sql',
}

function getLang(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  return LANG_ALIASES[ext] ?? 'text'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  path: string | null
}

export const FileViewer = ({ path }: Props) => {
  const resolvedTheme = useUiStore((s) => s.resolvedTheme)
  const [fileContent, setFileContent] = useState<FsFileContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!path) {
      setFileContent(null)
      return
    }
    setLoading(true)
    setError(null)
    fsReadFile(path, 2_000_000)
      .then(setFileContent)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [path])

  if (!path) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        style={{ color: 'var(--text-muted)', fontSize: '12px' }}
      >
        Select a file to preview
      </div>
    )
  }

  if (loading) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        style={{ color: 'var(--text-muted)', fontSize: '12px' }}
      >
        Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        style={{ color: 'var(--status-error)', fontSize: '12px', padding: '16px', textAlign: 'center' }}
      >
        {error}
      </div>
    )
  }

  if (!fileContent) return null

  if (fileContent.isBinary) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center"
        style={{ gap: '4px', color: 'var(--text-muted)', fontSize: '12px' }}
      >
        <span>Binary file ({formatBytes(fileContent.size)})</span>
        <span>Preview unavailable</span>
      </div>
    )
  }

  const lang = getLang(fileContent.path)
  const codeStyle = resolvedTheme === 'light' ? oneLight : oneDark

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      {fileContent.truncated && (
        <div
          style={{
            padding: '4px 12px',
            fontSize: '11px',
            color: 'var(--status-warning)',
            background: 'rgba(251,191,36,0.08)',
            borderBottom: '1px solid var(--border-subtle)',
            flexShrink: 0,
          }}
        >
          File truncated at 2 MB. Showing partial content.
        </div>
      )}
      <SyntaxHighlighter
        language={lang}
        style={codeStyle}
        showLineNumbers
        customStyle={{
          margin: 0,
          padding: '12px',
          fontSize: '11px',
          background: 'var(--bg-base)',
          flex: 1,
          minHeight: 0,
          borderRadius: 0,
          overflowY: 'auto',
        }}
        codeTagProps={{ style: { fontFamily: 'var(--font-mono, monospace)' } }}
      >
        {fileContent.content}
      </SyntaxHighlighter>
    </div>
  )
}
