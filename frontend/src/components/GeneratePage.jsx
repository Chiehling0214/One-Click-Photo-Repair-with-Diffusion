import { useEffect, useMemo, useState } from 'react'

export default function GeneratePage({
  imageFile,     // File
  maskBlob,      // Blob (png)
  imagePreviewUrl,
  maskPreviewUrl,
  prompts = [],
  variations = 1,
  endpoint = 'http://127.0.0.1:8000/inpaint',
  onBack,        // () => void
  onDone,        // ({ resultUrl, meta? }) => void
}) {
  const [status, setStatus] = useState('idle') // idle | uploading | done | error
  const [error, setError] = useState('')
  const [progressText, setProgressText] = useState('')

  const canStart = useMemo(() => !!imageFile && !!maskBlob, [imageFile, maskBlob])

  useEffect(() => {
    if (!canStart) return
    let cancelled = false

    const run = async () => {
      try {
        setStatus('uploading')
        setError('')
        setProgressText('Uploading image + mask...')

        const form = new FormData()
        form.append('image', imageFile)
        form.append('mask', maskBlob, 'mask.png')

        const promptText = prompts.join(', ')
        form.append('prompt', promptText)
        form.append('num_outputs', String(variations))

        const res = await fetch(endpoint, {
          method: 'POST',
          body: form,
        })

        if (!res.ok) {
          const t = await safeText(res)
          throw new Error(`HTTP ${res.status}: ${t || 'request failed'}`)
        }

        setProgressText('Generating...')

        const blob = await res.blob()
        const resultUrl = URL.createObjectURL(blob)
        const latency = res.headers.get("X-Latency")

        if (cancelled) return
        setStatus('done')
        // setProgressText('Done')
        setProgressText(`Done in ${latency}s`)
        onDone?.({ resultUrl })
      } catch (e) {
        if (cancelled) return
        setStatus('error')
        setError(e?.message || 'Unknown error')
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [canStart, endpoint, imageFile, maskBlob, onDone])

  return (
    <div style={styles.panel}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.h2}>Generating result</h2>
          <p style={styles.p}>
            We’re sending your image + mask to the backend and waiting for the inpaint result.
          </p>
        </div>

        <button onClick={onBack} style={styles.btnGhost} disabled={status === 'uploading'}>
          Back to mask
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

      <div style={styles.statusBox}>
        {status === 'uploading' ? (
          <>
            <div style={styles.spinner} aria-hidden="true" />
            <div>
              <div style={styles.statusTitle}>Working…</div>
              <div style={styles.statusText}>{progressText}</div>
            </div>
          </>
        ) : status === 'error' ? (
          <>
            <div style={styles.errorTitle}>Error</div>
            <div style={styles.errorText}>{error}</div>
          </>
        ) : (
          <>
            <div style={styles.statusTitle}>Ready</div>
            <div style={styles.statusText}>Starting…</div>
          </>
        )}
      </div>

      {status === 'error' ? (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={() => window.location.reload()} style={styles.btnSecondary}>
            Reload
          </button>
        </div>
      ) : null}
    </div>
  )
}

async function safeText(res) {
  try {
    return await res.text()
  } catch {
    return ''
  }
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

  statusBox: {
    marginTop: 14,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.14)',
    padding: 14,
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    background: 'rgba(255,255,255,0.03)',
  },
  statusTitle: { fontWeight: 800 },
  statusText: { opacity: 0.8, marginTop: 2 },

  spinner: {
    width: 18,
    height: 18,
    borderRadius: 999,
    border: '2px solid rgba(255,255,255,0.25)',
    borderTopColor: 'rgba(255,255,255,0.85)',
    animation: 'spin 1s linear infinite',
  },

  errorTitle: { fontWeight: 900, color: '#ffb4b4' },
  errorText: { marginTop: 6, opacity: 0.9 },

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
