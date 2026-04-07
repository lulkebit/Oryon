import { useState } from 'react'
import { ArrowLeft2, Sun1, Moon, Monitor } from 'iconsax-react'
import { useUiStore } from '@/stores/uiStore'
import type { Theme } from '@/lib/types'

const CATEGORIES = [
  'General',
  'Models',
  'Agents',
  'Keybindings',
  'Workspace',
] as const

type Category = (typeof CATEGORIES)[number]

export const SettingsView = () => {
  const [activeCategory, setActiveCategory] = useState<Category>('General')
  const { setActiveView, theme, setTheme } = useUiStore()

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="flex items-center border-b"
        style={{
          height: '52px',
          gap: '12px',
          padding: '0 24px',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <button
          onClick={() => setActiveView('chat')}
          className="flex items-center justify-center transition-colors"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-overlay)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
          aria-label="Back"
        >
          <ArrowLeft2 size={18} color="currentColor" />
        </button>
        <h1
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          Settings
        </h1>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Nav */}
        <nav
          className="shrink-0 border-r"
          style={{
            width: '200px',
            padding: '16px',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex flex-col" style={{ gap: '2px' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="relative flex w-full items-center transition-colors"
                style={{
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color:
                    activeCategory === cat
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)',
                  background:
                    activeCategory === cat
                      ? 'var(--bg-overlay)'
                      : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (activeCategory !== cat)
                    e.currentTarget.style.background = 'var(--bg-elevated)'
                }}
                onMouseLeave={(e) => {
                  if (activeCategory !== cat)
                    e.currentTarget.style.background = 'transparent'
                }}
              >
                {activeCategory === cat && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      left: 0,
                      width: '2px',
                      height: '16px',
                      background: 'var(--accent)',
                    }}
                  />
                )}
                {cat}
              </button>
            ))}
          </div>
        </nav>

        {/* Panel */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ padding: '32px' }}
        >
          {activeCategory === 'General' && (
            <div>
              <h2
                style={{
                  marginBottom: '20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                Appearance
              </h2>
              <div style={{ marginBottom: '32px' }}>
                <label
                  className="block"
                  style={{
                    marginBottom: '10px',
                    fontSize: '12px',
                    lineHeight: '18px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Theme
                </label>
                <div className="flex" style={{ gap: '8px' }}>
                  {([
                    { value: 'system', icon: Monitor, label: 'System' },
                    { value: 'dark', icon: Moon, label: 'Dark' },
                    { value: 'light', icon: Sun1, label: 'Light' },
                  ] as const).map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value as Theme)}
                      className="flex items-center border transition-colors"
                      style={{
                        height: '36px',
                        gap: '8px',
                        padding: '0 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                        borderColor:
                          theme === value
                            ? 'var(--accent)'
                            : 'var(--border-default)',
                        color:
                          theme === value
                            ? 'var(--text-primary)'
                            : 'var(--text-secondary)',
                        background:
                          theme === value
                            ? 'var(--accent-muted)'
                            : 'transparent',
                      }}
                    >
                      <Icon size={16} color="currentColor" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeCategory !== 'General' && (
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
              }}
            >
              {activeCategory} settings coming soon.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
