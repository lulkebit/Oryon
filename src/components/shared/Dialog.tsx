import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// ── Base modal ───────────────────────────────────────────────────────────────

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  labelledBy?: string
  describedBy?: string
  /** Width in pixels. Defaults to 420. */
  width?: number
  /**
   * Disable closing on backdrop click. Useful for forms with unsaved input
   * where an accidental outside click would be destructive.
   */
  closeOnBackdrop?: boolean
}

export const Dialog = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 420,
  closeOnBackdrop = true,
}: DialogProps) => {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null

    // Focus first focusable element inside the dialog on open. Fall back to
    // the surface itself so Escape / Tab still work.
    const raf = requestAnimationFrame(() => {
      const surface = surfaceRef.current
      if (!surface) return
      const focusable = surface.querySelectorAll<HTMLElement>(
        FOCUSABLE_SELECTOR
      )
      const first = focusable[0]
      if (first) first.focus()
      else surface.focus()
    })

    return () => {
      cancelAnimationFrame(raf)
      // Restore focus to the triggering element on close.
      previouslyFocused.current?.focus?.()
    }
  }, [open])

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      // Focus trap
      const surface = surfaceRef.current
      if (!surface) return
      const focusable = Array.from(
        surface.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.hasAttribute('data-focus-trap-skip'))
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [onClose]
  )

  if (!open) return null

  return (
    <div
      aria-hidden={false}
      className="anim-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(2px)',
      }}
      onMouseDown={(e) => {
        if (!closeOnBackdrop) return
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={surfaceRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="popover-enter"
        style={{
          width: '100%',
          maxWidth: `${width}px`,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
          ['--popover-origin' as string]: 'center center',
        }}
      >
        <div style={{ padding: '18px 20px 12px' }}>
          <h2
            id={titleId}
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: '20px',
            }}
          >
            {title}
          </h2>
          {description && (
            <p
              id={descId}
              style={{
                marginTop: '6px',
                fontSize: '13px',
                lineHeight: '19px',
                color: 'var(--text-secondary)',
              }}
            >
              {description}
            </p>
          )}
        </div>

        {children && (
          <div style={{ padding: '0 20px 4px' }}>{children}</div>
        )}

        {footer && (
          <div
            className="flex items-center justify-end"
            style={{
              gap: '8px',
              padding: '16px 20px 18px',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Shared button styles ─────────────────────────────────────────────────────

type DialogButtonVariant = 'primary' | 'danger' | 'secondary'

const buttonStyleFor = (
  variant: DialogButtonVariant,
  disabled?: boolean
): React.CSSProperties => {
  const base: React.CSSProperties = {
    height: '32px',
    padding: '0 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    border: '1px solid transparent',
    transition:
      'background 150ms var(--ease-out), color 150ms var(--ease-out), border-color 150ms var(--ease-out), opacity 150ms var(--ease-out)',
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }

  if (variant === 'primary') {
    return {
      ...base,
      background: 'var(--accent)',
      color: 'var(--text-inverse)',
    }
  }

  if (variant === 'danger') {
    return {
      ...base,
      background: 'var(--status-error)',
      color: 'var(--text-inverse)',
    }
  }

  return {
    ...base,
    background: 'transparent',
    color: 'var(--text-secondary)',
    borderColor: 'var(--border-default)',
  }
}

export const DialogButton = ({
  variant = 'secondary',
  children,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: DialogButtonVariant
}) => (
  <button
    {...rest}
    disabled={disabled}
    className="btn-press"
    style={buttonStyleFor(variant, disabled)}
  >
    {children}
  </button>
)

// ── ConfirmDialog ────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  onConfirm: () => void
  onClose: () => void
}

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onClose,
}: ConfirmDialogProps) => {
  const handleConfirm = useCallback(() => {
    onConfirm()
    onClose()
  }, [onConfirm, onClose])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <DialogButton onClick={onClose}>{cancelLabel}</DialogButton>
          <DialogButton
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            autoFocus
          >
            {confirmLabel}
          </DialogButton>
        </>
      }
    />
  )
}

// ── PromptDialog ─────────────────────────────────────────────────────────────

interface PromptDialogProps {
  open: boolean
  title: string
  description?: string
  label?: string
  placeholder?: string
  initialValue?: string
  submitLabel?: string
  cancelLabel?: string
  /**
   * Optional validator. Return a string to display as error, or null when
   * valid. Runs on every change; submit is disabled when it returns a string.
   */
  validate?: (value: string) => string | null
  onSubmit: (value: string) => void
  onClose: () => void
}

export const PromptDialog = ({
  open,
  title,
  description,
  label,
  placeholder,
  initialValue = '',
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  validate,
  onSubmit,
  onClose,
}: PromptDialogProps) => {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setValue(initialValue)
      // Focus + select after the dialog mounts so the name is easy to replace.
      const raf = requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [open, initialValue])

  const error = validate ? validate(value) : null
  const trimmed = value.trim()
  const canSubmit = !error && trimmed.length > 0

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return
    onSubmit(trimmed)
    onClose()
  }, [canSubmit, onSubmit, onClose, trimmed])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <DialogButton onClick={onClose}>{cancelLabel}</DialogButton>
          <DialogButton
            variant="primary"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {submitLabel}
          </DialogButton>
        </>
      }
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          marginTop: '8px',
          marginBottom: '4px',
        }}
      >
        {label && (
          <label
            htmlFor="prompt-dialog-input"
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
            }}
          >
            {label}
          </label>
        )}
        <input
          id="prompt-dialog-input"
          ref={inputRef}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSubmit()
            }
          }}
          style={{
            height: '34px',
            padding: '0 10px',
            borderRadius: '6px',
            border: `1px solid ${error ? 'var(--status-error)' : 'var(--border-default)'}`,
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
            transition: 'border-color 150ms var(--ease-out)',
          }}
          onFocus={(e) => {
            if (!error) {
              e.currentTarget.style.borderColor = 'var(--border-focus)'
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error
              ? 'var(--status-error)'
              : 'var(--border-default)'
          }}
        />
        {error && (
          <span
            style={{
              fontSize: '11.5px',
              color: 'var(--status-error)',
              lineHeight: '16px',
            }}
          >
            {error}
          </span>
        )}
      </div>
    </Dialog>
  )
}
