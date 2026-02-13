import { useMemo, useState } from 'react'

export default function PromptPicker({
  defaultSelected = [],
  defaultCount = 1,
  maxSelected = 12,
  onChange,      // ({ prompts: string[], count: number }) => void
  onContinue,    // ({ prompts: string[], count: number }) => void
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

  const activeItems = useMemo(() => {
    return groups.find((g) => g.group === activeGroup)?.items ?? []
  }, [groups, activeGroup])

  const emitChange = (nextSelected, nextCount) => {
    onChange?.({ prompts: nextSelected, count: nextCount })
  }

  const addPrompt = (p) => {
    setSelected((prev) => {
      if (prev.includes(p)) return prev
      if (prev.length >= maxSelected) return prev
      const next = [...prev, p]
      emitChange(next, count)
      return next
    })
  }

  const removePrompt = (p) => {
    setSelected((prev) => {
      const next = prev.filter((x) => x !== p)
      emitChange(next, count)
      return next
    })
  }

  const clearAll = () => {
    setSelected([])
    emitChange([], count)
  }

  const onCountChange = (v) => {
    const n = Number(v)
    setCount(n)
    emitChange(selected, n)
  }

  const canContinue = selected.length > 0 && count >= 1 && count <= 5

  return (
    <div style={styles.shell}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.title}>Prompt settings</h2>
          <p style={styles.subtitle}>
            Add one or more prompts and choose how many variations to generate.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {onBack ? (
            <button type="button" style={styles.ghostBtn} onClick={onBack}>
              Back
            </button>
          ) : null}

          <button type="button" style={styles.secondaryBtn} onClick={clearAll} disabled={selected.length === 0}>
            Clear
          </button>

          <button
            type="button"
            style={{ ...styles.primaryBtn, ...(canContinue ? null : styles.btnDisabled) }}
            disabled={!canContinue}
            onClick={() => onContinue?.({ prompts: selected, count })}
          >
            Continue
          </button>
        </div>
      </div>

      <div style={styles.field}>
        <div style={styles.fieldLabel}>Selected prompts</div>

        <div style={styles.chipRow}>
          {selected.length === 0 ? (
            <div style={styles.emptyHint}>No prompts selected. Click “Add” to open the menu.</div>
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
        </div>
      </div>

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
          </div>
        </div>

        <div style={styles.helperBox}>
          <div style={styles.fieldLabel}>Notes</div>
          <p style={styles.helperText}>
            Prompts are combined as a single comma-separated string. You can enforce a max selection
            limit with <code>maxSelected</code>.
          </p>
        </div>
      </div>

      {open ? (
        <div style={styles.menu}>
          <div style={styles.menuTop}>
            <div style={styles.menuTitle}>Prompt menu</div>
            <button type="button" style={styles.ghostBtn} onClick={() => setOpen(false)}>
              Close
            </button>
          </div>

          <div style={styles.menuBody}>
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
                      <span style={styles.itemState}>
                        {isSelected ? 'Added' : 'Add'}
                      </span>
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
  helperText: { margin: 0, opacity: 0.8, lineHeight: 1.6, fontSize: 13 },

  menu: {
    marginTop: 14,
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 18,
    background: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
  menuTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    padding: 12,
    borderBottom: '1px solid rgba(255,255,255,0.12)',
  },
  menuTitle: { fontWeight: 900, letterSpacing: -0.2 },

  menuBody: {
    display: 'grid',
    gridTemplateColumns: '220px 1fr',
    minHeight: 260,
  },

  groupCol: {
    borderRight: '1px solid rgba(255,255,255,0.12)',
    padding: 10,
    display: 'grid',
    gap: 8,
    alignContent: 'start',
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

  itemCol: { padding: 10, display: 'flex', flexDirection: 'column', gap: 10 },
  itemGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 8,
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
