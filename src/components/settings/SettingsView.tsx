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
        className="flex h-[52px] items-center gap-[12px] border-b px-[24px]"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <button
          onClick={() => setActiveView('chat')}
          className="flex h-[32px] w-[32px] items-center justify-center rounded-[6px] transition-colors"
          style={{ color: 'var(--text-secondary)' }}
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
          className="text-[14px] font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Settings
        </h1>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Nav */}
        <nav
          className="w-[200px] shrink-0 border-r p-[12px]"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex flex-col gap-[2px]">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="relative flex h-[32px] w-full items-center rounded-[6px] px-[12px] text-[13px] font-medium transition-colors"
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
                    className="absolute left-0 top-1/2 h-[16px] w-[2px] -translate-y-1/2 rounded-full"
                    style={{ background: 'var(--accent)' }}
                  />
                )}
                {cat}
              </button>
            ))}
          </div>
        </nav>

        {/* Panel */}
        <div className="flex-1 overflow-y-auto p-[24px]">
          {activeCategory === 'General' && (
            <div>
              <h2
                className="mb-[16px] text-[14px] font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Appearance
              </h2>
              <div className="mb-[24px]">
                <label
                  className="mb-[8px] block text-[12px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Theme
                </label>
                <div className="flex gap-[8px]">
                  {([
                    { value: 'system', icon: Monitor, label: 'System' },
                    { value: 'dark', icon: Moon, label: 'Dark' },
                    { value: 'light', icon: Sun1, label: 'Light' },
                  ] as const).map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value as Theme)}
                      className="flex h-[36px] items-center gap-[8px] rounded-[6px] border px-[12px] text-[13px] font-medium transition-colors"
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
              className="text-[13px]"
              style={{ color: 'var(--text-muted)' }}
            >
              {activeCategory} settings coming soon.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
