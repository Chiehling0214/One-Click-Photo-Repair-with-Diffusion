import { useEffect, useMemo, useState } from 'react'

export default function GeneratePage({
  imageFile,          // File
  maskBlob,           // Blob (png)
  imagePreviewUrl,
  maskPreviewUrl,

  // New PromptPicker outputs
  finalPrompt = '',        // string (preferred)
  negativePrompt = '',     // string
  thinkLonger = false,     // boolean

  // Backward compatibility (older flow)
  prompts = [],            // string[]
  variations = 1,          // number (1..5)

  endpoint = 'http://127.0.0.1:8000/inpaint',
  onBack,                  // () => void
  onDone,                  // ({ resultUrls: string[], meta?: any }) => void
}) {
  const [status, setStatus] = useState('idle') // idle | uploading | done | error
  const [error, setError] = useState('')
  const [progressText, setProgressText] = useState('')
  const [progressPct, setProgressPct] = useState(0)

  const canStart = useMemo(() => !!imageFile && !!maskBlob, [imageFile, maskBlob])

  // Resolve prompt text (new flow preferred)
  const promptText = useMemo(() => {
    const fp = (finalPrompt ?? '').trim()
    if (fp) return fp
    return (prompts ?? []).join(', ').trim()
  }, [finalPrompt, prompts])

  const negativeText = useMemo(() => (negativePrompt ?? '').trim(), [negativePrompt])

  useEffect(() => {
    if (!canStart) return

    let cancelled = false
    const controller = new AbortController()

    const run = async () => {
      try {
        setStatus('uploading')
        setError('')
        setProgressPct(0)
        setProgressText('Uploading image + mask...')

        const form = new FormData()
        form.append('image', imageFile)
        form.append('mask', maskBlob, 'mask.png')

        // New fields
        form.append('prompt', promptText) // can be empty (allowed)
        form.append('negative_prompt', negativeText) // can be empty
        form.append('num_outputs', String(variations))
        form.append('think_longer', thinkLonger ? '1' : '0')

        const res = await fetch(endpoint, {
          method: 'POST',
          body: form,
          signal: controller.signal,
        })

        if (!res.ok) {
          const t = await safeText(res)
          throw new Error(`HTTP ${res.status}: ${t || 'request failed'}`)
        }

        const body = await res.json()
        const jobId = body?.job_id
        if (!jobId) throw new Error('Missing job_id from backend response')

        if (cancelled) return

        setProgressText('Generating...')
        setProgressPct(1)

        // Poll progress + fetch result
        const base = endpoint.replace(/\/inpaint\/?$/, '')
        const progressUrl = `${base}/progress/${jobId}`
        const resultUrl = `${base}/result/${jobId}`

        while (!cancelled) {
          await sleep(500)

          const pr = await fetch(progressUrl, { signal: controller.signal })
          if (!pr.ok) continue

          const p = await pr.json()
          if (cancelled) return

          /*
            Expected progress payload (example):
              pct: number (0..100)
              idx: number (0-based or 1-based depending on backend)
              step: number
              global_step: number
              total_steps: number
              status: 'queued' | 'running' | 'done' | 'error'
              error?: string
          */
          const { pct, idx, global_step, total_steps, status: st } = p ?? {}
          if (typeof pct === 'number') setProgressPct(pct)

          if (st === 'running') {
            const shownIdx = typeof idx === 'number' ? idx : 0
            setProgressText(
              `Generating image ${shownIdx}/${variations} · Step ${global_step}/${total_steps} (${pct}%)`
            )
          } else if (st === 'queued') {
            const shownIdx = typeof idx === 'number' ? idx + 1 : 1
            setProgressText(`Generating image ${shownIdx}/${variations} · Queued (${pct}%)`)
          }

          if (p?.status === 'error') {
            throw new Error(p?.error || 'Backend error')
          }

          if (p?.status === 'done') {
            const rr = await fetch(resultUrl, { signal: controller.signal })
            if (!rr.ok) throw new Error('Failed to fetch result')

            const data = await rr.json()
            if (!data?.images?.length) throw new Error('Missing images')

            const urls = data.images.map((b64) => b64ToObjectUrl(b64))

            setStatus('done')
            setProgressPct(100)
            setProgressText(data?.latency ? `Done in ${data.latency}s` : 'Done')
            onDone?.({ resultUrls: urls, meta: { jobId, latency: data?.latency } })
            return
          }
        }
      } catch (e) {
        if (cancelled) return
        setStatus('error')
        setError(e?.message || 'Unknown error')
      }
    }

    run()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [
    canStart,
    endpoint,
    imageFile,
    maskBlob,
    promptText,
    negativeText,
    thinkLonger,
    variations,
    onDone,
  ])

  return (
    <div style={styles.panel}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.h2}>Generating result</h2>
          <p style={styles.p}>
            Sending your image + mask to the backend and waiting for the inpaint result.
          </p>
        </div>

        <button onClick={onBack} style={styles.btnGhost} disabled={status === 'uploading'}>
          Back
        </button>
      </div>

      <div style={styles.grid2}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Input image</div>
          {imagePreviewUrl ? (
            <img src={imagePreviewUrl} alt="input" style={styles.img} />
          ) : (
            <div style={styles.placeholder}>No preview</div>
          )}
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Mask</div>
          {maskPreviewUrl ? (
            <img src={maskPreviewUrl} alt="mask" style={styles.img} />
          ) : (
            <div style={styles.placeholder}>No mask preview</div>
          )}
        </div>
      </div>

      <div style={styles.metaBox}>
        <div style={styles.metaLine}>
          <span style={styles.metaKey}>Variations</span>
          <span style={styles.metaVal}>{variations}</span>
        </div>
        <div style={styles.metaLine}>
          <span style={styles.metaKey}>Think longer</span>
          <span style={styles.metaVal}>{thinkLonger ? 'On' : 'Off'}</span>
        </div>
        <div style={styles.metaLine}>
          <span style={styles.metaKey}>Prompt</span>
          <span style={styles.metaVal}>
            {promptText ? promptText : <span style={{ opacity: 0.7 }}>Empty</span>}
          </span>
        </div>
        <div style={styles.metaLine}>
          <span style={styles.metaKey}>Negative</span>
          <span style={styles.metaVal}>
            {negativeText ? negativeText : <span style={{ opacity: 0.7 }}>Empty</span>}
          </span>
        </div>
      </div>

      <div style={styles.statusBox}>
        {status === 'uploading' ? (
          <>
            <div style={styles.spinner} aria-hidden="true" />
            <div style={{ flex: 1 }}>
              <div style={styles.statusTitle}>Working…</div>
              <div style={styles.statusText}>{progressText}</div>

              <div style={styles.progressOuter} aria-label="progress">
                <div
                  style={{
                    ...styles.progressInner,
                    width: `${clampPct(progressPct)}%`,
                  }}
                />
              </div>
              <div style={styles.progressMeta}>{clampPct(progressPct)}%</div>
            </div>
          </>
        ) : status === 'error' ? (
          <div style={{ width: '100%' }}>
            <div style={styles.errorTitle}>Error</div>
            <div style={styles.errorText}>{error}</div>
          </div>
        ) : status === 'done' ? (
          <div style={{ width: '100%' }}>
            <div style={styles.statusTitle}>Done</div>
            <div style={styles.statusText}>{progressText || 'Completed.'}</div>
          </div>
        ) : (
          <div style={{ width: '100%' }}>
            <div style={styles.statusTitle}>Ready</div>
            <div style={styles.statusText}>Starting…</div>
          </div>
        )}
      </div>

      {status === 'error' ? (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={() => window.location.reload()} style={styles.btnSecondary}>
            Reload
          </button>
        </div>
      ) : null}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

function b64ToObjectUrl(b64) {
  // Accept either pure base64 or data URL; normalize to base64 payload
  const pure = String(b64 || '').includes(',') ? String(b64).split(',')[1] : String(b64 || '')
  const byteString = atob(pure)
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
  const blob = new Blob([ab], { type: 'image/png' })
  return URL.createObjectURL(blob)
}

async function safeText(res) {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function clampPct(n) {
  const x = Number.isFinite(n) ? n : 0
  return Math.max(0, Math.min(100, Math.round(x)))
}

const styles = {
  panel: {
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 18,
    padding: 18,
  },
  topRow: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  h2: { margin: 0, fontSize: 20 },
  p: { margin: '8px 0 0', opacity: 0.8, lineHeight: 1.6 },

  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginTop: 14,
  },
  card: {
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 18,
    padding: 12,
    background: 'rgba(255,255,255,0.03)',
  },
  cardTitle: { fontSize: 13, opacity: 0.8, marginBottom: 10 },
  img: {
    width: '100%',
    height: 260,
    objectFit: 'cover',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.14)',
  },
  placeholder: {
    height: 260,
    display: 'grid',
    placeItems: 'center',
    opacity: 0.6,
    borderRadius: 14,
    border: '1px dashed rgba(255,255,255,0.20)',
  },

  metaBox: {
    marginTop: 14,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.14)',
    padding: 12,
    background: 'rgba(255,255,255,0.02)',
    display: 'grid',
    gap: 8,
  },
  metaLine: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr',
    gap: 10,
    alignItems: 'baseline',
  },
  metaKey: { fontSize: 12, opacity: 0.75, fontWeight: 800 },
  metaVal: { fontSize: 13, opacity: 0.92, lineHeight: 1.5, wordBreak: 'break-word' },

  statusBox: {
    marginTop: 14,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.14)',
    padding: 14,
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    background: 'rgba(255,255,255,0.03)',
  },
  statusTitle: { fontWeight: 800 },
  statusText: { opacity: 0.8, marginTop: 2 },

  progressOuter: {
    marginTop: 10,
    height: 10,
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  progressInner: {
    height: '100%',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.35)',
    width: '0%',
    transition: 'width 200ms ease',
  },
  progressMeta: { marginTop: 6, fontSize: 12, opacity: 0.75 },

  spinner: {
    width: 18,
    height: 18,
    borderRadius: 999,
    border: '2px solid rgba(255,255,255,0.25)',
    borderTopColor: 'rgba(255,255,255,0.85)',
    animation: 'spin 1s linear infinite',
    marginTop: 2,
  },

  errorTitle: { fontWeight: 900, color: '#ffb4b4' },
  errorText: { marginTop: 6, opacity: 0.9, lineHeight: 1.5 },

  btnSecondary: {
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.22)',
    background: 'transparent',
    color: 'inherit',
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnGhost: {
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'transparent',
    color: 'inherit',
    fontWeight: 700,
    cursor: 'pointer',
    opacity: 0.9,
  },
}