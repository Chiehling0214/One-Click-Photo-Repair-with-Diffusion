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
  const [progressPct, setProgressPct] = useState(0)

  const canStart = useMemo(() => !!imageFile && !!maskBlob, [imageFile, maskBlob])

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

        const promptText = prompts.join(', ')
        form.append('prompt', promptText)
        form.append('num_outputs', String(variations))

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

        // 2) Poll progress
        const base = endpoint.replace(/\/inpaint$/, '') 
        const progressUrl = `${base}/progress/${jobId}`
        const resultUrl = `${base}/result/${jobId}`

        while (!cancelled) {
          await sleep(500)

          const pr = await fetch(progressUrl, { signal: controller.signal })
          if (!pr.ok) continue
          const p = await pr.json()

          if (cancelled) return
          /* 
            pct : 總共進行的 %
            idx : 生成第幾張照片
            step : 每一張照片的step數
            global_step : 全部進行的step數 (= idx * 20 + step)    20 : 每張照片會跑的step數，這個之後可以用parameter改
            total_steps : 整個行程會跑的step數 (= variation * 20)
            status : 現在的狀態, queued = 準備生成下一張, running = 在生成照片中
          */
          const { pct, idx, step, global_step, total_steps, status } = p
          setProgressPct(pct)
          console.log(`each step: ${step}`)
          if (status == 'running') {
            setProgressText(`Generating image ${idx}/${variations}, Step ${global_step}/${total_steps} (${pct}%)`)
          }
          else if (status == 'queued') {
            setProgressText(`Generating image ${idx}/${variations}, Queued (${pct}%)`)
          }

          if (p.status === 'error') {
            throw new Error(p.error || 'Backend error')
          }

          if (p.status === 'done') {
            const rr = await fetch(resultUrl, { signal: controller.signal })
            if (!rr.ok) throw new Error('Failed to fetch result')
            const data = await rr.json()

            if (!data?.images?.length) throw new Error('Missing images')

            const urls = data.images.map(b64 => {
              const byteString = atob(b64)
              const ab = new ArrayBuffer(byteString.length)
              const ia = new Uint8Array(ab)

              for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)

              const blob = new Blob([ab], { type: 'image/png' })
              return URL.createObjectURL(blob)
            })

            setStatus('done')
            setProgressText(data.latency ? `Done in ${data.latency}s` : 'Done')
            onDone?.({ resultUrls: urls })
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
  }, [canStart, endpoint, imageFile, maskBlob, onDone, prompts, variations])

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
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
