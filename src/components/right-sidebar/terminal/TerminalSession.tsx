import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { useUiStore } from '@/stores/uiStore'
import { ptyWrite, ptyResize, subscribePtyData, subscribePtyExit } from '@/lib/ipc/pty'

interface Props {
  sessionId: string
  active: boolean
  onExit: (sessionId: string) => void
}

function buildXtermTheme(resolved: 'dark' | 'light') {
  const cs = getComputedStyle(document.documentElement)
  const v = (name: string) => cs.getPropertyValue(name).trim()

  if (resolved === 'light') {
    return {
      background: '#FFFFFF',
      foreground: '#1A1A1A',
      cursor: v('--accent') || '#2D6A31',
      selectionBackground: 'rgba(0,0,0,0.15)',
      black: '#000000',
      red: '#C0392B',
      green: '#27AE60',
      yellow: '#D4AC0D',
      blue: '#2980B9',
      magenta: '#8E44AD',
      cyan: '#17A589',
      white: '#BDC3C7',
      brightBlack: '#7F8C8D',
      brightRed: '#E74C3C',
      brightGreen: '#2ECC71',
      brightYellow: '#F1C40F',
      brightBlue: '#3498DB',
      brightMagenta: '#9B59B6',
      brightCyan: '#1ABC9C',
      brightWhite: '#ECF0F1',
    }
  }

  return {
    background: v('--bg-base') || '#0F0F0F',
    foreground: v('--text-primary') || '#EBEBEB',
    cursor: v('--accent') || '#C2D8C4',
    cursorAccent: v('--bg-base') || '#0F0F0F',
    selectionBackground: 'rgba(194,216,196,0.2)',
    black: '#1A1A1A',
    red: '#F87171',
    green: '#4ADE80',
    yellow: '#FBBF24',
    blue: '#60A5FA',
    magenta: '#C084FC',
    cyan: '#22D3EE',
    white: '#D4D4D4',
    brightBlack: '#525252',
    brightRed: '#FCA5A5',
    brightGreen: '#86EFAC',
    brightYellow: '#FDE68A',
    brightBlue: '#93C5FD',
    brightMagenta: '#D8B4FE',
    brightCyan: '#67E8F9',
    brightWhite: '#F5F5F5',
  }
}

export const TerminalSession = ({ sessionId, active, onExit }: Props) => {
  const resolvedTheme = useUiStore((s) => s.resolvedTheme)
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const unlistenDataRef = useRef<(() => void) | null>(null)
  const unlistenExitRef = useRef<(() => void) | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  // Initialize xterm once
  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      theme: buildXtermTheme(resolvedTheme),
      fontFamily: 'var(--font-mono, "SF Mono", "Fira Code", monospace)',
      fontSize: 12,
      lineHeight: 1.4,
      cursorBlink: true,
      allowProposedApi: true,
      scrollback: 5000,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.open(containerRef.current)

    termRef.current = term
    fitAddonRef.current = fitAddon

    // Fit to container
    requestAnimationFrame(() => {
      fitAddon.fit()
      ptyResize(sessionId, term.cols, term.rows).catch(console.error)
    })

    // Send keystrokes to backend
    term.onData((data) => {
      ptyWrite(sessionId, data).catch(console.error)
    })

    // Subscribe to PTY data events
    subscribePtyData((event) => {
      if (event.sessionId !== sessionId) return
      const bytes = Uint8Array.from(atob(event.data), (c) => c.charCodeAt(0))
      term.write(bytes)
    }).then((unlisten) => {
      unlistenDataRef.current = unlisten
    })

    // Subscribe to PTY exit events
    subscribePtyExit((event) => {
      if (event.sessionId !== sessionId) return
      term.write('\r\n\x1b[31m[Process exited]\x1b[0m\r\n')
      onExit(sessionId)
    }).then((unlisten) => {
      unlistenExitRef.current = unlisten
    })

    // Resize observer for container changes
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (!fitAddon || !term) return
        try {
          fitAddon.fit()
          ptyResize(sessionId, term.cols, term.rows).catch(console.error)
        } catch {}
      })
    })
    observer.observe(containerRef.current)
    resizeObserverRef.current = observer

    return () => {
      unlistenDataRef.current?.()
      unlistenExitRef.current?.()
      observer.disconnect()
      term.dispose()
      termRef.current = null
      fitAddonRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // Update theme when it changes
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = buildXtermTheme(resolvedTheme)
    }
  }, [resolvedTheme])

  // Re-fit when becoming active
  useEffect(() => {
    if (active && fitAddonRef.current && termRef.current) {
      requestAnimationFrame(() => {
        try {
          fitAddonRef.current?.fit()
          const t = termRef.current
          if (t) ptyResize(sessionId, t.cols, t.rows).catch(console.error)
        } catch {}
      })
    }
  }, [active, sessionId])

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        display: active ? 'flex' : 'none',
        flexDirection: 'column',
        background: 'var(--bg-base)',
        overflow: 'hidden',
      }}
    />
  )
}
