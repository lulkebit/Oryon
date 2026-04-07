# UI Specification

## Window Structure

```
┌──────────────────────────────────────────────────────────────────┐
│ ● ● ●              Oryon — workspace-name              ─ □ ✕    │ ← Custom Titlebar
├────────────┬─────────────────────────────────────────────────────┤
│            │                                                     │
│  Sidebar   │                  Main Content                       │
│  (260px    │                                                     │
│  default,  │     Chat View  /  Model Hub  /  Settings            │
│  resizable │                                                     │
│  48–400px) │                                                     │
│            │                                                     │
│            │                                                     │
│            │                                                     │
│            │                                                     │
│            │                                                     │
│            │                                                     │
│            │                                                     │
├────────────┤                                                     │
│ ⚙ Settings │                                                     │
└────────────┴─────────────────────────────────────────────────────┘
```

- Minimum window size: 800 × 500px
- Sidebar default width: 260px
- Sidebar resize range: 48px (collapsed, icon-only) to 400px
- Resize handle: 4px drag area on the right edge of the sidebar
- Main content fills remaining width

---

## Custom Titlebar

```
┌──────────────────────────────────────────────────────────────────┐
│ ● ● ●     ◀ ▶                  Oryon                  ─ □ ✕    │
│ traffic    nav               app title             window ctrl   │
│ lights   (optional)                                              │
└──────────────────────────────────────────────────────────────────┘
```

- Height: 40px
- macOS: Traffic lights (close/minimize/fullscreen) left-aligned
- Windows/Linux: Window controls right-aligned
- App title centered, `--text-sm`, `--text-secondary`
- Draggable region: entire titlebar except buttons
- Background: `--bg-surface`
- Bottom border: 1px `--border-subtle`

---

## Sidebar

### Layout

```
┌──────────────┐
│ + New Agent  │ ← Button, full width
│ ◈ Model Hub  │ ← Button, full width
├──────────────┤
│              │
│ ▾ Workspace A│ ← Folder, expandable
│   Chat 1     │   ← Chat item
│   Chat 2     │   ← Chat item (active)
│   Chat 3     │
│              │
│ ▾ Workspace B│
│   Chat 4     │
│   Chat 5     │
│              │
│ ▸ Workspace C│ ← Collapsed
│              │
│              │
│              │ ← Scrollable area
│              │
├──────────────┤
│ ⚙ Settings   │ ← Bottom-pinned
└──────────────┘
```

### Header Buttons

- **New Agent**: Opens a new chat in the active workspace with an
  agent selector. Icon: `Add` (Iconsax). Full-width button.
- **Model Hub**: Switches the main content area to the Model Hub view.
  Icon: `Box1` (Iconsax). Full-width button. Active state when hub is open.
- Both buttons: height 36px, `--text-sm`, weight 500, `--radius-md`
- Spacing between buttons: `--space-1`
- Section padding: `--space-3` horizontal, `--space-2` vertical

### Workspace Items

- Act as expandable folder headers
- Click to toggle expand/collapse
- Right-click context menu: Rename, Remove, Open in Finder
- Icon: `Folder2` (Iconsax), 16px
- Font: `--text-sm`, `--text-secondary`, weight 500
- Height: 28px
- Indent: `--space-3` from sidebar edge
- Expand chevron: `ArrowDown2`/`ArrowRight2` (Iconsax), 14px, `--text-muted`

### Chat Items

- Displayed as flat list under their workspace
- Single-line title (auto-generated from first message, editable)
- Active chat: `--bg-overlay` background, 2px left accent bar (`--accent`)
- Hover: `--bg-overlay` at 50%
- Right-click context menu: Rename, Duplicate, Delete
- Icon: `Message` (Iconsax), 14px, `--text-muted`
- Font: `--text-sm`, `--text-primary`
- Height: 32px
- Indent: `--space-6` from sidebar edge (nested under workspace)
- Active agent indicator: small dot (`--status-running`) next to title

### Collapsed State (48px width)

When collapsed, the sidebar shows only icons:

```
┌──────┐
│  +   │ New Agent (tooltip on hover)
│  ◈   │ Model Hub
├──────┤
│  📁  │ Workspace A (shows workspace icon)
│  📁  │ Workspace B
│  📁  │
├──────┤
│  ⚙   │ Settings
└──────┘
```

- Icons centered, 20px
- Tooltips appear on hover (right side, 200ms delay)
- Clicking a workspace icon expands the sidebar

### Settings Button

- Pinned to the bottom of the sidebar
- Height: 40px
- Icon: `Setting2` (Iconsax), 16px
- Label: "Settings", `--text-sm`, `--text-secondary`
- Hover: `--bg-overlay`
- Separator line above: 1px `--border-subtle`

### Sidebar Interactions

- **Drag to resize**: Cursor changes to `col-resize` on right edge
- **Double-click edge**: Resets to default width (260px)
- **Collapse shortcut**: Clicking when width < 120px collapses to 48px
- **Expand shortcut**: Clicking any icon in collapsed state expands

---

## Chat View

### Layout (Default — No Active Panels)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    (scrollable area)                     │
│                                                         │
│  ┌─────────────────────────────────────┐                │
│  │ 🟢 Agent: DeepSeek Coder 33B       │  Agent header  │
│  └─────────────────────────────────────┘                │
│                                                         │
│          ┌──────────────────────────┐                   │
│          │   How can I help you     │   User message    │
│          │   with this project?     │   (right-aligned) │
│          └──────────────────────────┘                   │
│                                                         │
│  Sure, let me look at the codebase.     Agent message   │
│                                         (left-aligned)  │
│  ┌──────────────────────────────────┐                   │
│  │ ▸ Read file: src/main.rs         │   Tool call       │
│  └──────────────────────────────────┘   (collapsed)     │
│                                                         │
│  I can see the main entry point...      Agent continues │
│                                                         │
│  ┌──────────────────────────────────┐                   │
│  │ ▸ Write file: src/lib.rs (+42)   │   Tool call       │
│  └──────────────────────────────────┘                   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Message Oryon...                 📎  ▲  Agent ▾│    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Layout (With Adaptive Panels)

When a tool call produces file changes or terminal output, panels
slide in from the right:

```
┌──────────────────────────────┬──────────────────────────┐
│                              │                          │
│      Chat Messages           │    Adaptive Panel        │
│      (scrollable)            │                          │
│                              │  ┌────────────────────┐  │
│                              │  │ Tab: main.rs       │  │
│                              │  │ Tab: lib.rs (diff) │  │
│                              │  ├────────────────────┤  │
│                              │  │                    │  │
│                              │  │  File preview or   │  │
│                              │  │  diff content      │  │
│                              │  │                    │  │
│                              │  │                    │  │
│                              │  └────────────────────┘  │
│                              │                          │
├──────────────────────────────┤                          │
│  ┌────────────────────────┐  │                          │
│  │  Message...       ▲    │  │                          │
│  └────────────────────────┘  │                          │
└──────────────────────────────┴──────────────────────────┘
```

- Panel width: 50% of main content (resizable, min 300px)
- Panel slides in with `--duration-smooth` animation
- Panel has tabs for multiple files/diffs
- Close button in panel header
- Panel can show: file preview, diff view, terminal output

### Messages

**User messages:**
- Right-aligned within max-width container
- Background: `--bg-overlay`
- Border radius: `--radius-lg`
- Padding: `--space-3` horizontal, `--space-2` vertical
- Font: `--text-base`

**Agent messages:**
- Left-aligned, no bubble (flat against background)
- Font: `--text-base`
- Markdown rendering: headings, lists, bold, italic, links
- Code blocks: `--bg-surface`, `--radius-lg`, monospace font
- Code syntax highlighting with muted, theme-consistent colors

**Tool call blocks (collapsed):**
- Full width of message area
- Background: `--bg-surface`
- Border: 1px `--border-subtle`
- Border radius: `--radius-md`
- Height: 36px (collapsed)
- Left icon: tool-specific (`Document`, `CommandSquare`, `SearchNormal1`, `Git`, `Global`) from Iconsax
- Label: action summary (e.g., "Read file: src/main.rs")
- Right: chevron to expand, status indicator
- Click to expand inline, showing tool input/output

**Tool call blocks (expanded):**
- Expands below the collapsed header
- Shows: tool input (command/path), output (truncated with "show more")
- Code-style rendering for file contents and terminal output
- Max expanded height: 400px (scrollable)

**Agent status indicator:**
- Shown below the last agent message while agent is working
- Animated dot sequence or typing indicator
- Text: "Thinking...", "Reading files...", "Running command..."

### Chat Input

- Fixed to bottom of chat view
- Background: `--bg-input`
- Border: 1px `--border-default`, focus: `--border-focus`
- Border radius: `--radius-lg`
- Min height: 44px, max height: 200px (auto-grows with content)
- Padding: `--space-3`
- Placeholder: "Message Oryon...", `--text-muted`
- Submit: Enter (Shift+Enter for newline)
- **Attach button** (📎): File attachment for context
- **Send button** (▲): Visible when input has content, `--accent` color
- **Agent selector** (dropdown): Shows current agent/model, click to change
- When agent is running: Send button becomes Stop button (■)

### Empty State (No Chat Selected)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                                                         │
│                    ◈                                    │
│              Start a new chat                           │
│                                                         │
│     Select a workspace and create a new agent chat      │
│     to get started.                                     │
│                                                         │
│            [ + New Chat ]                               │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Centered vertically and horizontally
- Icon: 48px, `--text-muted`
- Heading: `--text-lg`, `--text-primary`
- Subtext: `--text-base`, `--text-secondary`
- Button: primary style

---

## Model Hub View

Replaces the chat view when activated via sidebar button.

### Layout

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Model Hub                                    ✕ Close   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 🔍 Search models...                             │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Filters:                                               │
│  [All] [Code] [Chat] [Reasoning]   Size: [Any ▾]       │
│  Provider: [Any ▾]    Compatibility: [My Hardware ▾]    │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Model Card  │  │  Model Card  │  │  Model Card  │  │
│  │              │  │              │  │              │  │
│  │  Qwen 2.5   │  │  DeepSeek    │  │  Llama 3.3  │  │
│  │  Coder 7B   │  │  Coder V2    │  │  70B         │  │
│  │  Q4_K_M     │  │  Lite 16B    │  │  Q4_K_S      │  │
│  │              │  │              │  │              │  │
│  │  4.2 GB     │  │  9.1 GB      │  │  38.5 GB     │  │
│  │  [Download]  │  │  [Download]  │  │  [Too large] │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Model Card  │  │  Model Card  │  │  Model Card  │  │
│  │  ...         │  │  ...         │  │  ...         │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│  Downloaded Models                                      │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ✓ Qwen 2.5 Coder 7B Q4_K_M    4.2 GB   [Delete]│   │
│  │ ↓ DeepSeek Coder V2 Lite      ████░░░░  62%     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Search Bar

- Prominent, full-width, top of the hub
- Height: 44px
- Icon: `SearchNormal1` (Iconsax), left side
- Searches HF Hub in real-time (debounced 300ms)
- Shows recent searches as suggestions

### Filter Bar

- Below search bar
- Type filters as toggle chips: All, Code, Chat, Reasoning, Vision
- Dropdowns for: Size range, Provider/Family, Hardware compatibility
- Active filters show count badge
- "Clear all" link when filters are active

### Model Cards (Grid)

- Grid: responsive, 3 columns at 1200px+, 2 at 900px, 1 below
- Card content:
  - Model name (bold, `--text-md`)
  - Provider/family tag (`--text-xs`, `--accent-muted` bg)
  - Quantization variant
  - File size
  - RAM requirement estimate
  - Compatibility indicator (green/yellow/red based on hardware)
  - Download button or status
- Card style: per STYLE_GUIDE.md card pattern

### Download Manager (Bottom Section)

- Always visible when downloads exist (active or completed)
- Collapsible section header: "Downloaded Models"
- Each row shows: model name, size, status
- Active downloads: progress bar, speed, ETA, pause/cancel buttons
- Completed: delete button, "Use in chat" action
- Queued downloads shown with position indicator

---

## Settings View

Full-page view replacing the main content area.

### Layout

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ← Back                    Settings                     │
│                                                         │
│  ┌────────────┬────────────────────────────────────┐    │
│  │            │                                    │    │
│  │  General   │  General Settings                  │    │
│  │  Models    │                                    │    │
│  │  Agents    │  Theme                             │    │
│  │  Keys      │  ○ System  ● Dark  ○ Light         │    │
│  │  Workspace │                                    │    │
│  │            │  Language                           │    │
│  │            │  [English            ▾]             │    │
│  │            │                                    │    │
│  │            │  Appearance                        │    │
│  │            │  Sidebar default width             │    │
│  │            │  [────●─────] 260px                │    │
│  │            │                                    │    │
│  │            │  Reduced motion                    │    │
│  │            │  [toggle]                          │    │
│  │            │                                    │    │
│  └────────────┴────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Navigation

- Left sidebar within settings: category list
- Categories: General, Models, Agents, Keybindings, Workspace
- Active category: `--bg-overlay`, `--accent` left bar
- "Back" button top-left returns to previous view (chat or hub)

### Settings Categories

**General:**
- Theme selector (System / Dark / Light)
- Language
- Sidebar default width
- Reduced motion toggle
- Notification preferences

**Models:**
- Default model selector (from downloaded models)
- Inference settings: temperature, top_p, top_k, max tokens
- GPU layer offloading (slider: 0–100% of layers)
- Context window size
- Auto-unload after idle (timeout slider)
- Model storage directory

**Agents:**
- Default tool permissions (checklist per tool type)
- Shell command blocklist
- Workspace path restrictions
- Max concurrent agents
- System prompt template editor

**Keybindings:**
- Table: Action | Shortcut | Edit button
- Searchable
- Conflict detection
- Reset to defaults

**Workspace:**
- Active workspace path (read-only)
- Excluded file patterns (glob list editor)
- Auto-index toggle
- Workspace-specific model override

---

## Toast Notifications

```
                                        ┌─────────────────────┐
                                        │ ✓ Agent completed   │
                                        │   task in Chat 3    │
                                        │              Close  │
                                        └─────────────────────┘
```

- Position: top-right, below titlebar
- Width: 320px
- Auto-dismiss: 5 seconds (configurable)
- Manual dismiss: click close or swipe right
- Stack: max 3 visible, older ones fade
- Types: success (green icon), error (red), warning (yellow), info (blue)
- Animation: slide in from right, `--duration-enter`, `--ease-spring`

---

## Badge Indicators (Sidebar)

- Shown on chat items when agent has activity in background
- Small dot (6px), `--status-running` color
- Positioned top-right of the chat item icon
- Pulses gently while agent is actively working
- Static when agent completed with unread results
- Disappears when user views the chat

---

## Keyboard Shortcuts (Default)

| Action                  | macOS            | Windows/Linux     |
| ----------------------- | ---------------- | ----------------- |
| New chat                | `⌘ N`            | `Ctrl+N`          |
| Toggle sidebar          | `⌘ B`            | `Ctrl+B`          |
| Focus chat input        | `⌘ L`            | `Ctrl+L`          |
| Stop agent              | `⌘ .`            | `Ctrl+.`          |
| Open settings           | `⌘ ,`            | `Ctrl+,`          |
| Open model hub          | `⌘ ⇧ M`          | `Ctrl+Shift+M`    |
| Switch workspace (next) | `⌘ ⇧ ]`          | `Ctrl+Shift+]`    |
| Switch workspace (prev) | `⌘ ⇧ [`          | `Ctrl+Shift+[`    |
| Switch chat (next)      | `⌘ ]`            | `Ctrl+]`          |
| Switch chat (prev)      | `⌘ [`            | `Ctrl+[`          |
| Close current view      | `Escape`          | `Escape`          |

---

## Responsive Behavior

| Window Width  | Layout Adaptation                                 |
| ------------- | ------------------------------------------------- |
| ≥ 1200px      | Sidebar expanded + full chat + panels side-by-side|
| 900–1199px    | Sidebar expanded + chat (panels overlay)          |
| 800–899px     | Sidebar collapsed by default + full-width chat    |

The app enforces a minimum window size of 800×500px.
