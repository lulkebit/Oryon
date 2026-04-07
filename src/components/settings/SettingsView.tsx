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
        className="flex items-center gap-3 border-b px-6 py-4"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <button
          onClick={() => setActiveView('chat')}
          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-overlay)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
          aria-label="Back"
        >
          <ArrowLeft2 size={16} color="currentColor" />
        </button>
        <h1
          className="text-base font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Settings
        </h1>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Nav */}
        <nav
          className="w-48 shrink-0 border-r p-3"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="relative flex w-full items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
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
                  className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full"
                  style={{ background: 'var(--accent)' }}
                />
              )}
              {cat}
            </button>
          ))}
        </nav>

        {/* Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeCategory === 'General' && (
            <div>
              <h2
                className="mb-4 text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Appearance
              </h2>
              <div className="mb-6">
                <label
                  className="mb-2 block text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Theme
                </label>
                <div className="flex gap-2">
                  {([
                    { value: 'system', icon: Monitor, label: 'System' },
                    { value: 'dark', icon: Moon, label: 'Dark' },
                    { value: 'light', icon: Sun1, label: 'Light' },
                  ] as const).map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value as Theme)}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors"
                      style={{
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
                      <Icon size={14} color="currentColor" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeCategory !== 'General' && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {activeCategory} settings coming soon.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
