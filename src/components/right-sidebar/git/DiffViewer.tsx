import { useMemo } from 'react'

interface DiffLine {
  type: 'hunk' | 'added' | 'removed' | 'context' | 'header'
  content: string
  oldLineNum?: number
  newLineNum?: number
}

function parseDiff(diffText: string): DiffLine[] {
  const lines = diffText.split('\n')
  const result: DiffLine[] = []
  let oldLine = 0
  let newLine = 0

  for (const line of lines) {
    if (line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ')) {
      result.push({ type: 'header', content: line })
    } else if (line.startsWith('@@')) {
      // Parse hunk header: @@ -a,b +c,d @@
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (match) {
        oldLine = parseInt(match[1], 10)
        newLine = parseInt(match[2], 10)
      }
      result.push({ type: 'hunk', content: line })
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      result.push({ type: 'added', content: line.slice(1), newLineNum: newLine++ })
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      result.push({ type: 'removed', content: line.slice(1), oldLineNum: oldLine++ })
    } else if (line.startsWith(' ') || line === '') {
      result.push({ type: 'context', content: line.slice(1), oldLineNum: oldLine++, newLineNum: newLine++ })
    }
  }
  return result
}

interface Props {
  diffText: string
  filePath: string
}

export const DiffViewer = ({ diffText }: Props) => {
  const lines = useMemo(() => parseDiff(diffText), [diffText])

  if (!diffText.trim()) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        style={{ color: 'var(--text-muted)', fontSize: '12px' }}
      >
        No diff available
      </div>
    )
  }

  return (
    <div
      className="flex-1 overflow-auto"
      style={{
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '12px',
        lineHeight: '1.5',
      }}
    >
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '36px' }} />
          <col style={{ width: '36px' }} />
          <col />
        </colgroup>
        <tbody>
          {lines.map((line, i) => {
            if (line.type === 'header') {
              return (
                <tr key={i}>
                  <td colSpan={3} style={{ padding: '2px 8px', color: 'var(--text-muted)', fontSize: '11px', background: 'var(--bg-base)' }}>
                    {line.content}
                  </td>
                </tr>
              )
            }
            if (line.type === 'hunk') {
              return (
                <tr key={i} style={{ background: 'var(--bg-elevated)' }}>
                  <td colSpan={3} style={{ padding: '2px 8px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                    {line.content}
                  </td>
                </tr>
              )
            }

            const bg =
              line.type === 'added'
                ? 'rgba(46,160,67,0.12)'
                : line.type === 'removed'
                  ? 'rgba(248,81,73,0.12)'
                  : 'transparent'
            const borderLeft =
              line.type === 'added'
                ? '2px solid var(--status-success)'
                : line.type === 'removed'
                  ? '2px solid var(--status-error)'
                  : '2px solid transparent'

            return (
              <tr key={i} style={{ background: bg }}>
                <td
                  style={{
                    padding: '0 4px',
                    textAlign: 'right',
                    color: 'var(--text-muted)',
                    userSelect: 'none',
                    fontSize: '11px',
                    borderLeft,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {line.type !== 'added' ? line.oldLineNum ?? '' : ''}
                </td>
                <td
                  style={{
                    padding: '0 4px',
                    textAlign: 'right',
                    color: 'var(--text-muted)',
                    userSelect: 'none',
                    fontSize: '11px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {line.type !== 'removed' ? line.newLineNum ?? '' : ''}
                </td>
                <td
                  style={{
                    padding: '0 8px',
                    whiteSpace: 'pre',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color:
                      line.type === 'added'
                        ? 'var(--status-success)'
                        : line.type === 'removed'
                          ? 'var(--status-error)'
                          : 'var(--text-primary)',
                  }}
                >
                  {line.content}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
