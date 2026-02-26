import { useEffect, useMemo, useRef, useState } from 'react'

export default function PromptPicker({
  defaultSelected = [],
  defaultCount = 1,
  defaultUserPrompt = '',
  defaultNegativePrompt = '',
  defaultThinkLonger = false,
  defaultMode = 'normal',
  maxSelected = 12,
  onChange,      // ({ prompts, count, userPrompt, negativePrompt, thinkLonger, finalPrompt }) => void
  onContinue,    // same payload
  onBack,
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

  const [selected, setSelected] = useState(Array.isArray(defaultSelected) ? defaultSelected : [])
  const [count, setCount] = useState(Number(defaultCount ?? 1))
  const [userPrompt, setUserPrompt] = useState(defaultUserPrompt ?? '')
  const [negativePrompt, setNegativePrompt] = useState(defaultNegativePrompt ?? '')
  const [mode, setMode] = useState(defaultMode ?? 'normal')
  const [thinkLonger, setThinkLonger] = useState(Boolean(defaultThinkLonger))

  // Suggestions only show when input is focused
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeGroup, setActiveGroup] = useState(groups[0]?.group ?? '')
  const inputRef = useRef(null)

  const computeFinalPrompt = (promptsArr, userText) => {
    const base = (promptsArr ?? []).join(', ')
    const extra = (userText ?? '').trim()
    if (!base && !extra) return ''
    if (!base) return extra
    if (!extra) return base
    return `${base}, ${extra}`
  }

  const finalPrompt = useMemo(() => computeFinalPrompt(selected, userPrompt), [selected, userPrompt])
  const negativePreview = useMemo(() => (negativePrompt ?? '').trim(), [negativePrompt])

  // emit
  useEffect(() => {
    onChange?.({
      prompts: selected,
      count,
      userPrompt,
      negativePrompt,
      thinkLonger,
      mode, 
      finalPrompt,
    })
  }, [selected, count, userPrompt, negativePrompt, thinkLonger, finalPrompt, onChange, mode])

  const allItems = useMemo(() => {
    const out = []
    for (const g of groups) {
      for (const item of g.items) out.push({ group: g.group, item })
    }
    return out
  }, [groups])

  const query = useMemo(() => (userPrompt ?? '').trim().toLowerCase(), [userPrompt])

  // If query empty -> show active group; else search across all groups
  const filtered = useMemo(() => {
    if (!query) {
      const g = groups.find((x) => x.group === activeGroup)
      const items = g?.items ?? []
      return items.map((item) => ({ group: activeGroup, item }))
    }
    return allItems
      .filter(({ item }) => item.toLowerCase().includes(query))
      .slice(0, 12)
  }, [query, groups, activeGroup, allItems])

  const addPrompt = (p) => {
    const trimmed = (p ?? '').trim()
    if (!trimmed) return
    setSelected((prev) => {
      if (prev.includes(trimmed)) return prev
      if (prev.length >= maxSelected) return prev
      return [...prev, trimmed]
    })
  }

  const removePrompt = (p) => setSelected((prev) => prev.filter((x) => x !== p))

  const clearAll = () => {
    setSelected([])
    setUserPrompt('')
    setNegativePrompt('')
    setThinkLonger(false)
    setCount(1)
  }

  const canContinue = count >= 1 && count <= 5

  const handlePromptKeyDown = (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()

    const raw = (userPrompt ?? '').trim()
    if (!raw) return

    // If no match, Enter creates a new prompt chip
    if (filtered.length === 0) {
      addPrompt(raw)
      setUserPrompt('')
      setTimeout(() => inputRef.current?.focus(), 0)
      return
    }

    // If you want Enter to add the first suggestion when there IS match, uncomment:
    // addPrompt(filtered[0].item)
    // setUserPrompt('')
  }

  return (
    <div style={styles.shell}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.title}>Prompt settings</h2>
          <p style={styles.subtitle}>
            Focus the prompt field to show suggestions. If your text has no match, press Enter to add it as a new chip.
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
                mode,
                finalPrompt,
              })
            }
          >
            Continue
          </button>
        </div>
      </div>

      {/* Prompt: chips + input */}
      <div style={styles.field}>
        <div style={styles.fieldLabel}>Prompt (chips + free text)</div>

        <div style={styles.promptBox}>
          <div style={styles.chipRow}>
            {selected.map((p) => (
              <div key={p} style={styles.chip}>
                <span style={styles.chipText}>{p}</span>
                <button
                  type="button"
                  style={styles.chipX}
                  onClick={() => removePrompt(p)}
                  aria-label={`Remove ${p}`}
                >
                  ×
                </button>
              </div>
            ))}

            <input
              ref={inputRef}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              onKeyDown={handlePromptKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={(e) => {
                // If blur is caused by clicking inside suggestions panel, don't close
                if (e.relatedTarget && e.relatedTarget.closest?.('[data-suggest-panel="1"]')) return
                setShowSuggestions(false)
              }}
              placeholder="Type here… (Enter adds it as a chip if no match)"
              style={styles.promptInput}
            />

            <button
              type="button"
              style={styles.smallGhost}
              onClick={() => {
                setSelected([])
                setUserPrompt('')
                setTimeout(() => inputRef.current?.focus(), 0)
              }}
              disabled={selected.length === 0 && !userPrompt.trim()}
            >
              Clear prompt
            </button>
          </div>
        </div>

        <div style={styles.helperLine}>
          Final prompt = chips + free text combined. Chips come from suggestions or Enter-to-create.
        </div>
      </div>

      {/* Suggestions: shown only when input focused */}
      {showSuggestions ? (
        <div style={styles.field} data-suggest-panel="1">
          <div style={styles.fieldLabel}>Suggestions</div>

          <div style={styles.groupTabs}>
            {groups.map((g) => (
              <button
                key={g.group}
                type="button"
                onMouseDown={(e) => e.preventDefault()} // keep input focused
                onClick={() => setActiveGroup(g.group)}
                style={{
                  ...styles.groupTab,
                  ...(activeGroup === g.group ? styles.groupTabActive : null),
                }}
              >
                {g.group}
              </button>
            ))}
          </div>

          <div style={styles.suggestPanel}>
            <div style={styles.suggestList}>
              {filtered.length === 0 ? (
                <div style={styles.suggestEmpty}>
                  No matches. Press <strong>Enter</strong> to add{' '}
                  <code>{(userPrompt ?? '').trim() || '...'}</code> as a new prompt chip.
                </div>
              ) : (
                filtered.map(({ group, item }) => {
                  const isSelected = selected.includes(item)
                  const isFull = !isSelected && selected.length >= maxSelected
                  return (
                    <button
                      key={`${group}:${item}`}
                      type="button"
                      disabled={isFull}
                      onMouseDown={(e) => e.preventDefault()} // keep input focused
                      onClick={() => {
                        addPrompt(item)
                        setTimeout(() => inputRef.current?.focus(), 0)
                      }}
                      style={{
                        ...styles.suggestRow,
                        ...(isSelected ? styles.suggestRowSelected : null),
                        ...(isFull ? styles.suggestRowDisabled : null),
                      }}
                      title={isFull ? `Max selected: ${maxSelected}` : ''}
                    >
                      <span style={styles.suggestText}>
                        {item}
                        <span style={styles.suggestMeta}> · {group}</span>
                      </span>
                      <span style={styles.suggestAction}>{isSelected ? 'Added' : 'Add'}</span>
                    </button>
                  )
                })
              )}
            </div>

            <div style={styles.suggestFoot}>
              <div style={styles.suggestFootText}>
                Selected: <strong>{selected.length}</strong> / {maxSelected}
              </div>
              <button
                type="button"
                style={styles.secondaryBtn}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSelected([])}
                disabled={selected.length === 0}
              >
                Clear chips
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Negative prompt */}
      <div style={styles.field}>
        <div style={styles.fieldLabel}>Negative prompt (optional)</div>
        <textarea
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          placeholder="What to avoid (e.g., text, watermark, artifacts)…"
          style={styles.textarea}
          rows={3}
        />
        <div style={styles.helperLine}>
          Sent to backend as <code>negative_prompt</code>.
        </div>
      </div>

      {/* Variations + Think longer + Preview */}
      <div style={styles.row2}>
        <div style={styles.countBox}>
          <div style={styles.fieldLabel}>Variations</div>
          <div style={styles.countRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                style={{ ...styles.countBtn, ...(count === n ? styles.countBtnActive : null) }}
              >
                {n}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setThinkLonger((p) => !p)}
              style={{
                ...styles.countBtn,
                ...(thinkLonger ? styles.countBtnActive : null),
                padding: '10px 14px',
                minWidth: 0,
              }}
            >
              Think longer
            </button>

            <div style={{ marginTop: 12 }}>
              <div style={styles.fieldLabel}>Mode</div>
              <div style={styles.countRow}>
                {['normal', 'fill', 'gen'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    style={{
                      ...styles.countBtn,
                      ...(mode === m ? styles.countBtnActive : null),
                      minWidth: 96, // optional: make them wider like a segmented control
                    }}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                {mode === 'fill'
                  ? 'Fill ignores prompts.'
                  : mode === 'gen'
                  ? 'Fill first, then generate with prompt.'
                  : 'Generate with prompt.'}
              </div>
            </div>
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
    </div>
  )
}

const styles = {
  shell: { border: '1px solid rgba(255,255,255,0.14)', borderRadius: 18, padding: 18 },
  topRow: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' },
  title: { margin: 0, fontSize: 20, letterSpacing: -0.2 },
  subtitle: { margin: '8px 0 0', opacity: 0.8, lineHeight: 1.6, maxWidth: 90 + 'ch' },

  field: { marginTop: 14 },
  fieldLabel: { fontSize: 13, opacity: 0.8, marginBottom: 10 },

  promptBox: {
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 16,
    padding: 10,
    background: 'rgba(255,255,255,0.03)',
  },
  chipRow: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', minHeight: 54 },

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
  chipText: { fontSize: 13, opacity: 0.95, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 },
  chipX: { border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', opacity: 0.8, fontSize: 16, lineHeight: 1 },

  promptInput: {
    flex: 1,
    minWidth: 260,
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.02)',
    color: 'inherit',
    outline: 'none',
  },

  groupTabs: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    padding: 10,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.02)',
  },
  groupTab: {
    padding: '8px 10px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: 12,
    opacity: 0.9,
  },
  groupTabActive: {
    borderColor: 'rgba(255,255,255,0.30)',
    background: 'rgba(255,255,255,0.06)',
    opacity: 1,
  },

  suggestPanel: {
    marginTop: 10,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
  suggestList: { maxHeight: 320, overflowY: 'auto', padding: 10 },
  suggestRow: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    padding: '10px 10px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.03)',
    color: 'inherit',
    cursor: 'pointer',
    textAlign: 'left',
    marginBottom: 8,
  },
  suggestRowSelected: { borderColor: 'rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.08)' },
  suggestRowDisabled: { opacity: 0.55, cursor: 'not-allowed' },
  suggestText: { fontSize: 13, opacity: 0.95 },
  suggestMeta: { fontSize: 12, opacity: 0.65 },
  suggestAction: { fontSize: 12, opacity: 0.75, fontWeight: 900 },
  suggestEmpty: { padding: 12, opacity: 0.8, fontSize: 13, lineHeight: 1.6 },

  suggestFoot: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    padding: 10,
    borderTop: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.02)',
  },
  suggestFootText: { fontSize: 12, opacity: 0.8 },

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

  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 },
  countBox: { border: '1px solid rgba(255,255,255,0.14)', borderRadius: 18, padding: 12, background: 'rgba(255,255,255,0.03)' },
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
  countBtnActive: { borderColor: 'rgba(255,255,255,0.36)', background: 'rgba(255,255,255,0.06)' },

  helperBox: { border: '1px solid rgba(255,255,255,0.14)', borderRadius: 18, padding: 12, background: 'rgba(255,255,255,0.03)' },
  previewBox: { border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: 12, background: 'rgba(255,255,255,0.02)', display: 'grid', gap: 10 },
  previewLine: { display: 'grid', gap: 6 },
  previewLabel: { fontSize: 12, opacity: 0.75, fontWeight: 800 },
  previewValue: { fontSize: 13, opacity: 0.92, lineHeight: 1.5, wordBreak: 'break-word' },

  primaryBtn: { padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)', background: '#4f46e5', color: 'white', fontWeight: 700, cursor: 'pointer' },
  secondaryBtn: { padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.22)', background: 'transparent', color: 'inherit', fontWeight: 700, cursor: 'pointer' },
  ghostBtn: { padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)', background: 'transparent', color: 'inherit', fontWeight: 700, cursor: 'pointer', opacity: 0.9 },
  smallGhost: { padding: '8px 10px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)', background: 'transparent', color: 'inherit', fontWeight: 800, cursor: 'pointer', opacity: 0.9 },
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },

  
}