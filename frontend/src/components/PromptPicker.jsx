import { useEffect, useMemo, useState } from 'react'

export default function PromptPicker({
  defaultSelected = [],
  defaultCount = 1,
  defaultUserPrompt = '',
  defaultNegativePrompt = '',
  defaultThinkLonger = false,
  maxSelected = 12,
  onChange,      // ({ prompts, count, userPrompt, negativePrompt, thinkLonger, finalPrompt }) => void
  onContinue,    // ({ prompts, count, userPrompt, negativePrompt, thinkLonger, finalPrompt }) => void
  onBack,        // optional () => void
}) {
  const groups = useMemo(
    () => [
      {
        group: 'General Fill',
        items: [
          'clean background',
          'natural background',
          'realistic background',
          'seamless background',
          'fill with natural texture',
          'remove object and restore background naturally',
        ],
      },
      {
        group: 'Outdoor',
        items: [
          'natural scenery',
          'clear sky',
          'urban background',
          'street background',
          'green grass',
          'trees and bushes',
        ],
      },
      {
        group: 'Indoor',
        items: [
          'clean wall',
          'plain wall',
          'interior background',
          'modern interior',
          'minimalist background',
        ],
      },
      {
        group: 'Quality Boost',
        items: [
          'highly detailed',
          'photorealistic',
          'high resolution',
          'realistic lighting',
          'natural shadows',
        ],
      },
    ],
    []
  )

  const [selected, setSelected] = useState(defaultSelected)
  const [count, setCount] = useState(defaultCount)
  const [open, setOpen] = useState(false)
  const [activeGroup, setActiveGroup] = useState(groups[0]?.group ?? '')

  const [userPrompt, setUserPrompt] = useState(defaultUserPrompt)
  const [negativePrompt, setNegativePrompt] = useState(defaultNegativePrompt)
  const [thinkLonger, setThinkLonger] = useState(Boolean(defaultThinkLonger))

  const activeItems = useMemo(() => {
    return groups.find((g) => g.group === activeGroup)?.items ?? []
  }, [groups, activeGroup])

  const computeFinalPrompt = (promptsArr, userText) => {
    const base = (promptsArr ?? []).join(', ')
    const extra = (userText ?? '').trim()
    if (!base && !extra) return ''
    if (!base) return extra
    if (!extra) return base
    return `${base}, ${extra}`
  }

  const finalPrompt = useMemo(() => {
    return computeFinalPrompt(selected, userPrompt)
  }, [selected, userPrompt])

  const negativePreview = useMemo(() => {
    return (negativePrompt ?? '').trim()
  }, [negativePrompt])

  // ✅ Emit onChange as a normal side-effect when state changes
  useEffect(() => {
    onChange?.({
      prompts: selected,
      count,
      userPrompt,
      negativePrompt,
      thinkLonger,
      finalPrompt,
    })
  }, [selected, count, userPrompt, negativePrompt, thinkLonger, finalPrompt, onChange])

  // Close popup with ESC
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const addPrompt = (p) => {
    setSelected((prev) => {
      if (prev.includes(p)) return prev
      if (prev.length >= maxSelected) return prev
      return [...prev, p]
    })
  }

  const removePrompt = (p) => {
    setSelected((prev) => prev.filter((x) => x !== p))
  }

  const clearPresets = () => setSelected([])

  const clearAll = () => {
    setSelected([])
    setUserPrompt('')
    setNegativePrompt('')
    setThinkLonger(false)
  }

  const onCountChange = (v) => setCount(Number(v))
  const toggleThinkLonger = () => setThinkLonger((prev) => !prev)

  // allow no prompt selected; only validate count range
  const canContinue = count >= 1 && count <= 5

  return (
    <div style={styles.shell}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.title}>Prompt settings</h2>
          <p style={styles.subtitle}>
            Presets are optional. You can also type a custom prompt and a negative prompt.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {onBack ? (
            <button type="button" style={styles.ghostBtn} onClick={onBack}>
              Back
            </button>
          ) : null}

          <button type="button" style={styles.secondaryBtn} onClick={clearAll}>
            Clear all
          </button>

          <button
            type="button"
            style={{ ...styles.primaryBtn, ...(canContinue ? null : styles.btnDisabled) }}
            disabled={!canContinue}
            onClick={() =>
              onContinue?.({
                prompts: selected,
                count,
                userPrompt,
                negativePrompt,
                thinkLonger,
                finalPrompt,
              })
            }
          >
            Continue
          </button>
        </div>
      </div>

      {/* Presets */}
      <div style={styles.field}>
        <div style={styles.fieldLabel}>Selected preset prompts (optional)</div>

        <div style={styles.chipRow}>
          {selected.length === 0 ? (
            <div style={styles.emptyHint}>No presets selected. Click “Add” to open the menu.</div>
          ) : (
            selected.map((p) => (
              <div key={p} style={styles.chip}>
                <span style={styles.chipText}>{p}</span>
                <button
                  type="button"
                  aria-label={`Remove ${p}`}
                  style={styles.chipX}
                  onClick={() => removePrompt(p)}
                >
                  ×
                </button>
              </div>
            ))
          )}

          <button type="button" style={styles.addBtn} onClick={() => setOpen((v) => !v)}>
            Add
          </button>

          <button
            type="button"
            style={{ ...styles.ghostBtn, padding: '8px 12px' }}
            onClick={clearPresets}
            disabled={selected.length === 0}
          >
            Clear presets
          </button>
        </div>
      </div>

      {/* User prompt */}
      <div style={styles.field}>
        <div style={styles.fieldLabel}>User prompt (optional)</div>
        <textarea
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          placeholder="Type your own prompt..."
          style={styles.textarea}
          rows={3}
        />
        <div style={styles.helperLine}>Appended after presets. You can leave this empty.</div>
      </div>

      {/* Negative prompt */}
      <div style={styles.field}>
        <div style={styles.fieldLabel}>Negative prompt (optional)</div>
        <textarea
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          placeholder="What to avoid (e.g., people, text, watermark, artifacts)..."
          style={styles.textarea}
          rows={3}
        />
        <div style={styles.helperLine}>
          Sent to backend as <code>negative_prompt</code> (you can leave this empty).
        </div>
      </div>

      {/* Variations + Preview */}
      <div style={styles.row2}>
        <div style={styles.countBox}>
          <div style={styles.fieldLabel}>Variations</div>
          <div style={styles.countRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onCountChange(n)}
                style={{
                  ...styles.countBtn,
                  ...(count === n ? styles.countBtnActive : null),
                }}
              >
                {n}
              </button>
            ))}

            <button
              type="button"
              onClick={toggleThinkLonger}
              style={{
                ...styles.countBtn,
                ...(thinkLonger ? styles.countBtnActive : null),
                padding: '10px 14px',
                minWidth: 0,
              }}
              title="Use a slower/more thorough generation mode (backend-dependent)."
            >
              Think longer
            </button>
          </div>

          <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13, lineHeight: 1.5 }}>
            Mode: <strong>{thinkLonger ? 'Think longer ON' : 'Normal'}</strong>
          </div>
        </div>

        <div style={styles.helperBox}>
          <div style={styles.fieldLabel}>Preview</div>

          <div style={styles.previewBox}>
            <div style={styles.previewLine}>
              <span style={styles.previewLabel}>Final prompt</span>
              <div style={styles.previewValue}>
                {finalPrompt ? finalPrompt : <span style={{ opacity: 0.7 }}>Empty (allowed)</span>}
              </div>
            </div>

            <div style={styles.previewLine}>
              <span style={styles.previewLabel}>Negative prompt</span>
              <div style={styles.previewValue}>
                {negativePreview ? negativePreview : <span style={{ opacity: 0.7 }}>Empty</span>}
              </div>
            </div>

            <div style={styles.previewLine}>
              <span style={styles.previewLabel}>Variations</span>
              <div style={styles.previewValue}>{count}</div>
            </div>

            <div style={styles.previewLine}>
              <span style={styles.previewLabel}>Think longer</span>
              <div style={styles.previewValue}>{thinkLonger ? 'On' : 'Off'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Preset popup (small modal) */}
      {open ? (
        <div
          style={styles.overlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={styles.modalTop}>
              <div style={styles.menuTitle}>Preset menu</div>
              <button type="button" style={styles.ghostBtn} onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.groupCol}>
                {groups.map((g) => (
                  <button
                    key={g.group}
                    type="button"
                    style={{
                      ...styles.groupBtn,
                      ...(activeGroup === g.group ? styles.groupBtnActive : null),
                    }}
                    onClick={() => setActiveGroup(g.group)}
                  >
                    <span>{g.group}</span>
                    <span style={styles.groupMeta}>{g.items.length}</span>
                  </button>
                ))}
              </div>

              <div style={styles.itemCol}>
                <div style={styles.itemGrid}>
                  {activeItems.map((p) => {
                    const isSelected = selected.includes(p)
                    const isFull = !isSelected && selected.length >= maxSelected
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => addPrompt(p)}
                        disabled={isFull}
                        style={{
                          ...styles.itemBtn,
                          ...(isSelected ? styles.itemBtnSelected : null),
                          ...(isFull ? styles.itemBtnDisabled : null),
                        }}
                        title={isFull ? `Max selected: ${maxSelected}` : ''}
                      >
                        <span style={{ textAlign: 'left' }}>{p}</span>
                        <span style={styles.itemState}>{isSelected ? 'Added' : 'Add'}</span>
                      </button>
                    )
                  })}
                </div>

                <div style={styles.menuFoot}>
                  <div style={styles.menuFootText}>
                    Selected: <strong>{selected.length}</strong> / {maxSelected}
                  </div>
                  <button type="button" style={styles.secondaryBtn} onClick={() => setOpen(false)}>
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const styles = {
  shell: {
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 18,
    padding: 18,
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  title: { margin: 0, fontSize: 20, letterSpacing: -0.2 },
  subtitle: { margin: '8px 0 0', opacity: 0.8, lineHeight: 1.6, maxWidth: 70 + 'ch' },

  field: { marginTop: 14 },
  fieldLabel: { fontSize: 13, opacity: 0.8, marginBottom: 10 },

  chipRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 16,
    padding: 10,
    background: 'rgba(255,255,255,0.03)',
    minHeight: 54,
  },
  emptyHint: { opacity: 0.7, fontSize: 13 },

  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.03)',
    maxWidth: '100%',
  },
  chipText: {
    fontSize: 13,
    opacity: 0.95,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 320,
  },
  chipX: {
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    opacity: 0.8,
    fontSize: 16,
    lineHeight: 1,
  },

  addBtn: {
    marginLeft: 'auto',
    padding: '8px 12px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.22)',
    background: 'transparent',
    color: 'inherit',
    fontWeight: 700,
    cursor: 'pointer',
    opacity: 0.9,
  },

  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.03)',
    color: 'inherit',
    padding: 12,
    outline: 'none',
    resize: 'vertical',
    lineHeight: 1.5,
  },
  helperLine: { marginTop: 8, fontSize: 12, opacity: 0.75, lineHeight: 1.5 },

  row2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginTop: 14,
  },
  countBox: {
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 18,
    padding: 12,
    background: 'rgba(255,255,255,0.03)',
  },
  countRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  countBtn: {
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.22)',
    background: 'transparent',
    color: 'inherit',
    fontWeight: 800,
    cursor: 'pointer',
    minWidth: 44,
  },
  countBtnActive: {
    borderColor: 'rgba(255,255,255,0.36)',
    background: 'rgba(255,255,255,0.06)',
  },

  helperBox: {
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 18,
    padding: 12,
    background: 'rgba(255,255,255,0.03)',
  },

  previewBox: {
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 12,
    background: 'rgba(255,255,255,0.02)',
    display: 'grid',
    gap: 10,
  },
  previewLine: { display: 'grid', gap: 6 },
  previewLabel: { fontSize: 12, opacity: 0.75, fontWeight: 800 },
  previewValue: { fontSize: 13, opacity: 0.92, lineHeight: 1.5, wordBreak: 'break-word' },

  // Popup overlay + modal
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'grid',
    placeItems: 'center',
    padding: 16,
    zIndex: 9999,
  },
  modal: {
    width: 'min(900px, 96vw)',
    maxHeight: 'min(560px, 86vh)',
    overflow: 'hidden',
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.16)',
    background: 'rgba(20,20,25,0.96)',
    boxShadow: '0 20px 80px rgba(0,0,0,0.55)',
    display: 'flex',
    flexDirection: 'column',
  },
  modalTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    padding: 12,
    borderBottom: '1px solid rgba(255,255,255,0.12)',
  },
  modalBody: {
    display: 'grid',
    gridTemplateColumns: '220px 1fr',
    minHeight: 260,
    overflow: 'hidden',
  },

  menuTitle: { fontWeight: 900, letterSpacing: -0.2 },

  groupCol: {
    borderRight: '1px solid rgba(255,255,255,0.12)',
    padding: 10,
    display: 'grid',
    gap: 8,
    alignContent: 'start',
    overflowY: 'auto',
  },
  groupBtn: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    padding: '10px 10px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    opacity: 0.9,
    fontWeight: 800,
    textAlign: 'left',
  },
  groupBtnActive: {
    borderColor: 'rgba(255,255,255,0.30)',
    background: 'rgba(255,255,255,0.06)',
    opacity: 1,
  },
  groupMeta: { fontSize: 12, opacity: 0.75 },

  itemCol: {
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    overflow: 'hidden',
  },
  itemGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 8,
    overflowY: 'auto',
    paddingRight: 4,
  },
  itemBtn: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    padding: '10px 10px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.03)',
    color: 'inherit',
    cursor: 'pointer',
  },
  itemBtnSelected: {
    borderColor: 'rgba(255,255,255,0.30)',
    background: 'rgba(255,255,255,0.08)',
  },
  itemBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  itemState: { fontSize: 12, opacity: 0.75, fontWeight: 800 },

  menuFoot: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    paddingTop: 6,
  },
  menuFootText: { fontSize: 13, opacity: 0.85 },

  primaryBtn: {
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.18)',
    background: '#4f46e5',
    color: 'white',
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.22)',
    background: 'transparent',
    color: 'inherit',
    fontWeight: 700,
    cursor: 'pointer',
  },
  ghostBtn: {
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'transparent',
    color: 'inherit',
    fontWeight: 700,
    cursor: 'pointer',
    opacity: 0.9,
  },
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
}