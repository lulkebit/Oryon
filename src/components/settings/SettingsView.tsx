import { useEffect, useState } from 'react'
import { ArrowLeft2, Sun1, Moon, Monitor } from 'iconsax-react'
import { useUiStore } from '@/stores/uiStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useModelHubStore } from '@/stores/modelHubStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
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
  const { setActiveView } = useUiStore()
  const { loaded, load } = useSettingsStore()

  useEffect(() => {
    if (!loaded) load()
  }, [loaded, load])

  return (
    <div className="flex h-full flex-col">
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
          className="btn-press flex items-center justify-center"
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

      <div className="flex flex-1 overflow-hidden">
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
                className="btn-press relative flex w-full items-center"
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
                  transition: 'background 150ms var(--ease-out), color 150ms var(--ease-out)',
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
                <div
                  className="absolute top-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    left: 0,
                    width: '2px',
                    height: activeCategory === cat ? '16px' : '0px',
                    background: 'var(--accent)',
                    opacity: activeCategory === cat ? 1 : 0,
                    transition:
                      'height 200ms var(--ease-out), opacity 200ms var(--ease-out)',
                  }}
                />
                {cat}
              </button>
            ))}
          </div>
        </nav>

        <div className="flex-1 overflow-y-auto" style={{ padding: '32px' }}>
          <div style={{ maxWidth: '560px' }}>
            {activeCategory === 'General' && <GeneralSettings />}
            {activeCategory === 'Models' && <ModelSettings />}
            {activeCategory === 'Agents' && <AgentSettings />}
            {activeCategory === 'Keybindings' && <KeybindingSettings />}
            {activeCategory === 'Workspace' && <WorkspaceSettings />}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Shared components ────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h2
        style={{
          marginBottom: '16px',
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ minHeight: '40px', padding: '8px 0' }}
    >
      <div style={{ flex: 1, marginRight: '16px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          {label}
        </div>
        {description && (
          <div
            style={{
              marginTop: '2px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              lineHeight: '16px',
            }}
          >
            {description}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  )
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="btn-press"
      style={{
        width: '36px',
        height: '20px',
        borderRadius: '10px',
        background: checked ? 'var(--accent)' : 'var(--bg-overlay)',
        border: '1px solid',
        borderColor: checked ? 'var(--accent)' : 'var(--border-default)',
        position: 'relative',
        transition: 'background 200ms var(--ease-out), border-color 200ms var(--ease-out)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '18px' : '2px',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: checked ? 'var(--text-inverse)' : 'var(--text-muted)',
          transition: 'left 200ms var(--ease-spring), background 200ms var(--ease-out)',
        }}
      />
    </button>
  )
}

function SelectInput({
  value,
  options,
  onChange,
  width = '160px',
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  width?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width,
        height: '32px',
        padding: '0 8px',
        borderRadius: '6px',
        border: '1px solid var(--border-default)',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        fontSize: '12px',
        outline: 'none',
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  width = '100px',
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  width?: string
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      min={min}
      max={max}
      step={step}
      style={{
        width,
        height: '32px',
        padding: '0 8px',
        borderRadius: '6px',
        border: '1px solid var(--border-default)',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        fontSize: '12px',
        outline: 'none',
      }}
    />
  )
}

function SliderRow({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step,
  displayValue,
}: {
  label: string
  description?: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  displayValue: string
}) {
  return (
    <div style={{ padding: '8px 0' }}>
      <div className="flex items-center justify-between">
        <div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            {label}
          </div>
          {description && (
            <div
              style={{
                marginTop: '2px',
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}
            >
              {description}
            </div>
          )}
        </div>
        <span
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)',
          }}
        >
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', marginTop: '8px', accentColor: 'var(--accent)' }}
      />
    </div>
  )
}

// ── General ──────────────────────────────────────────

function GeneralSettings() {
  const { theme, setTheme } = useUiStore()
  const { reducedMotion, setReducedMotion } = useSettingsStore()
  const [appInfo, setAppInfo] = useState({ name: 'Oryon', version: '0.0.0' })

  useEffect(() => {
    import('@/lib/ipc').then((ipc) =>
      ipc.getAppInfo().then(setAppInfo).catch(console.error)
    )
  }, [])

  return (
    <>
      <Section title="Appearance">
        <SettingRow label="Theme" description="Choose the app color scheme">
          <div className="flex" style={{ gap: '6px' }}>
            {(
              [
                { value: 'system', icon: Monitor, label: 'System' },
                { value: 'dark', icon: Moon, label: 'Dark' },
                { value: 'light', icon: Sun1, label: 'Light' },
              ] as const
            ).map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value as Theme)}
                className="btn-press flex items-center border"
                style={{
                  height: '32px',
                  gap: '6px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
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
                    theme === value ? 'var(--accent-muted)' : 'transparent',
                }}
              >
                <Icon size={14} color="currentColor" />
                {label}
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow
          label="Reduced Motion"
          description="Minimize animations throughout the app"
        >
          <Toggle checked={reducedMotion} onChange={setReducedMotion} />
        </SettingRow>
      </Section>

      <Section title="About">
        <div className="flex flex-col" style={{ gap: '8px' }}>
          <InfoRow label="App" value={appInfo.name} />
          <InfoRow label="Version" value={`v${appInfo.version}`} />
          <InfoRow label="Framework" value="Tauri 2" />
          <InfoRow label="Engine" value="llama.cpp" />
        </div>
      </Section>
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between" style={{ height: '28px' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span
        style={{
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-secondary)',
        }}
      >
        {value}
      </span>
    </div>
  )
}

// ── Models ───────────────────────────────────────────

function ModelSettings() {
  const { downloadedModels, loadDownloaded } = useModelHubStore()
  const {
    defaultModelId,
    setDefaultModelId,
    autoLoadDefaultEnabled,
    setAutoLoadDefault,
    inferenceDefaults,
    setInferenceDefaults,
    gpuLayers,
    setGpuLayers,
    contextWindow,
    setContextWindow,
    autoUnloadEnabled,
    autoUnloadMinutes,
    setAutoUnload,
    modelStoragePath,
  } = useSettingsStore()

  useEffect(() => {
    loadDownloaded()
  }, [loadDownloaded])

  const diskUsage = downloadedModels.reduce(
    (acc, m) => acc + (m.fileSize ?? 0),
    0
  )

  return (
    <>
      <Section title="Default Model">
        <SettingRow
          label="Model for new chats"
          description="Automatically selected when creating a new chat"
        >
          <SelectInput
            value={defaultModelId ?? ''}
            onChange={(v) => setDefaultModelId(v || null)}
            options={[
              { value: '', label: 'None' },
              ...downloadedModels.map((m) => ({
                value: m.id,
                label: m.name,
              })),
            ]}
            width="200px"
          />
        </SettingRow>
        <SettingRow
          label="Load on startup"
          description="Automatically load the default model when Oryon starts"
        >
          <Toggle
            checked={autoLoadDefaultEnabled}
            onChange={setAutoLoadDefault}
          />
        </SettingRow>
      </Section>

      <Section title="Inference Defaults">
        <SliderRow
          label="Temperature"
          description="Higher values produce more creative output"
          value={inferenceDefaults.temperature}
          onChange={(v) => setInferenceDefaults({ temperature: v })}
          min={0}
          max={2}
          step={0.1}
          displayValue={inferenceDefaults.temperature.toFixed(1)}
        />
        <SliderRow
          label="Top P"
          description="Nucleus sampling threshold"
          value={inferenceDefaults.topP}
          onChange={(v) => setInferenceDefaults({ topP: v })}
          min={0}
          max={1}
          step={0.05}
          displayValue={inferenceDefaults.topP.toFixed(2)}
        />
        <SettingRow label="Top K" description="Top-K sampling limit">
          <NumberInput
            value={inferenceDefaults.topK}
            onChange={(v) => setInferenceDefaults({ topK: v })}
            min={1}
            max={200}
            step={1}
          />
        </SettingRow>
        <SettingRow label="Max Tokens" description="Maximum output length">
          <NumberInput
            value={inferenceDefaults.maxTokens}
            onChange={(v) => setInferenceDefaults({ maxTokens: v })}
            min={128}
            max={32768}
            step={128}
            width="120px"
          />
        </SettingRow>
      </Section>

      <Section title="Hardware">
        <SliderRow
          label="GPU Layers"
          description="Layers offloaded to GPU (999 = all)"
          value={gpuLayers}
          onChange={setGpuLayers}
          min={0}
          max={999}
          step={1}
          displayValue={gpuLayers >= 999 ? 'All' : String(gpuLayers)}
        />
        <SettingRow
          label="Context Window"
          description="Maximum context length for inference"
        >
          <SelectInput
            value={String(contextWindow)}
            onChange={(v) => setContextWindow(parseInt(v, 10))}
            options={[
              { value: '2048', label: '2,048' },
              { value: '4096', label: '4,096' },
              { value: '8192', label: '8,192' },
              { value: '16384', label: '16,384' },
              { value: '32768', label: '32,768' },
            ]}
          />
        </SettingRow>
      </Section>

      <Section title="Memory Management">
        <SettingRow
          label="Auto-unload idle models"
          description="Free RAM when no inference runs for a while"
        >
          <Toggle
            checked={autoUnloadEnabled}
            onChange={(v) => setAutoUnload(v, autoUnloadMinutes)}
          />
        </SettingRow>
        {autoUnloadEnabled && (
          <SettingRow
            label="Idle timeout"
            description="Minutes before the model is unloaded"
          >
            <NumberInput
              value={autoUnloadMinutes}
              onChange={(v) => setAutoUnload(true, v)}
              min={1}
              max={240}
              step={1}
              width="80px"
            />
          </SettingRow>
        )}
      </Section>

      <Section title="Storage">
        <div className="flex flex-col" style={{ gap: '8px' }}>
          <InfoRow
            label="Storage path"
            value={modelStoragePath || '(default app data)'}
          />
          <InfoRow
            label="Total disk usage"
            value={formatBytes(diskUsage)}
          />
          <InfoRow
            label="Downloaded models"
            value={String(downloadedModels.length)}
          />
        </div>
      </Section>
    </>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

// ── Agents ───────────────────────────────────────────

const ALL_TOOLS = [
  'file_read',
  'file_write',
  'file_create',
  'file_patch',
  'file_delete',
  'glob',
  'grep',
  'shell_exec',
  'git_status',
  'git_diff',
  'git_commit',
  'git_log',
] as const

function AgentSettings() {
  const { defaultTools, setDefaultTools, shellBlocklist, setShellBlocklist } =
    useSettingsStore()
  const [newBlockItem, setNewBlockItem] = useState('')

  const toggleTool = (tool: string) => {
    const next = defaultTools.includes(tool)
      ? defaultTools.filter((t) => t !== tool)
      : [...defaultTools, tool]
    setDefaultTools(next)
  }

  const addBlockItem = () => {
    const trimmed = newBlockItem.trim()
    if (!trimmed || shellBlocklist.includes(trimmed)) return
    setShellBlocklist([...shellBlocklist, trimmed])
    setNewBlockItem('')
  }

  const removeBlockItem = (item: string) => {
    setShellBlocklist(shellBlocklist.filter((i) => i !== item))
  }

  return (
    <>
      <Section title="Default Tool Permissions">
        <p
          style={{
            marginBottom: '12px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            lineHeight: '18px',
          }}
        >
          Tools enabled by default when creating new agents.
        </p>
        <div className="flex flex-col" style={{ gap: '2px' }}>
          {ALL_TOOLS.map((tool) => (
            <label
              key={tool}
              className="flex items-center"
              style={{
                gap: '8px',
                height: '28px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={defaultTools.includes(tool)}
                onChange={() => toggleTool(tool)}
                style={{ accentColor: 'var(--accent)' }}
              />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{tool}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Shell Command Blocklist">
        <p
          style={{
            marginBottom: '12px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            lineHeight: '18px',
          }}
        >
          Commands containing these patterns will be blocked from execution.
        </p>
        <div className="flex flex-col" style={{ gap: '4px' }}>
          {shellBlocklist.map((item) => (
            <div
              key={item}
              className="flex items-center justify-between"
              style={{
                height: '32px',
                padding: '0 10px',
                borderRadius: '6px',
                background: 'var(--bg-elevated)',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                }}
              >
                {item}
              </span>
              <button
                onClick={() => removeBlockItem(item)}
                style={{
                  fontSize: '11px',
                  color: 'var(--status-error)',
                  background: 'none',
                  border: 'none',
                  padding: '2px 6px',
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="flex" style={{ gap: '6px', marginTop: '8px' }}>
          <input
            value={newBlockItem}
            onChange={(e) => setNewBlockItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addBlockItem()}
            placeholder="Add blocked pattern…"
            style={{
              flex: 1,
              height: '32px',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-base)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <button
            onClick={addBlockItem}
            disabled={!newBlockItem.trim()}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--bg-base)',
              background: 'var(--accent)',
              opacity: newBlockItem.trim() ? 1 : 0.5,
            }}
          >
            Add
          </button>
        </div>
      </Section>
    </>
  )
}

// ── Keybindings ──────────────────────────────────────

const SHORTCUTS = [
  { keys: '⌘ N', action: 'New Chat' },
  { keys: '⌘ W', action: 'Close Chat' },
  { keys: '⌘ ,', action: 'Open Settings' },
  { keys: '⌘ B', action: 'Toggle Sidebar' },
  { keys: '⌘ ⇧ M', action: 'Open Model Hub' },
  { keys: '⌘ ⇧ A', action: 'Open Agents' },
  { keys: '⌘ Enter', action: 'Send Message' },
  { keys: 'Escape', action: 'Stop Generation' },
  { keys: '⌘ ↑', action: 'Previous Chat' },
  { keys: '⌘ ↓', action: 'Next Chat' },
  { keys: '⌘ K', action: 'Command Palette' },
  { keys: '⌘ L', action: 'Focus Chat Input' },
] as const

function KeybindingSettings() {
  return (
    <Section title="Keyboard Shortcuts">
      <div
        className="border"
        style={{
          borderRadius: '8px',
          borderColor: 'var(--border-subtle)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-elevated)',
              }}
            >
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Action
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '8px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Shortcut
              </th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map(({ keys, action }, i) => (
              <tr
                key={action}
                style={{
                  borderBottom:
                    i < SHORTCUTS.length - 1
                      ? '1px solid var(--border-subtle)'
                      : 'none',
                }}
              >
                <td
                  style={{
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                  }}
                >
                  {action}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                  <kbd
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {keys}
                  </kbd>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

// ── Workspace ────────────────────────────────────────

function WorkspaceSettings() {
  const { workspaces, chats } = useWorkspaceStore()
  const { excludedPatterns, setExcludedPatterns } = useSettingsStore()
  const [newPattern, setNewPattern] = useState('')

  const addPattern = () => {
    const trimmed = newPattern.trim()
    if (!trimmed || excludedPatterns.includes(trimmed)) return
    setExcludedPatterns([...excludedPatterns, trimmed])
    setNewPattern('')
  }

  const removePattern = (p: string) => {
    setExcludedPatterns(excludedPatterns.filter((x) => x !== p))
  }

  return (
    <>
      <Section title="Overview">
        <div className="flex flex-col" style={{ gap: '8px' }}>
          <InfoRow
            label="Total workspaces"
            value={String(workspaces.length)}
          />
          <InfoRow label="Total chats" value={String(chats.length)} />
        </div>

        {workspaces.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div
              className="flex flex-col"
              style={{
                gap: '4px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
              }}
            >
              {workspaces.map((ws) => {
                const wsChats = chats.filter(
                  (c) => c.workspaceId === ws.id
                )
                return (
                  <div
                    key={ws.id}
                    className="flex items-center justify-between"
                    style={{
                      height: '36px',
                      padding: '0 12px',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {ws.name}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {wsChats.length} chat{wsChats.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Section>

      <Section title="Excluded File Patterns">
        <p
          style={{
            marginBottom: '12px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            lineHeight: '18px',
          }}
        >
          Glob patterns excluded from file search tools.
        </p>
        <div className="flex" style={{ gap: '6px', flexWrap: 'wrap' }}>
          {excludedPatterns.map((p) => (
            <span
              key={p}
              className="flex items-center"
              style={{
                height: '26px',
                gap: '4px',
                padding: '0 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {p}
              <button
                onClick={() => removePattern(p)}
                style={{
                  marginLeft: '2px',
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  background: 'none',
                  border: 'none',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex" style={{ gap: '6px', marginTop: '8px' }}>
          <input
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPattern()}
            placeholder="Add pattern (e.g. *.log)…"
            style={{
              flex: 1,
              height: '32px',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-base)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <button
            onClick={addPattern}
            disabled={!newPattern.trim()}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--bg-base)',
              background: 'var(--accent)',
              opacity: newPattern.trim() ? 1 : 0.5,
            }}
          >
            Add
          </button>
        </div>
      </Section>
    </>
  )
}
