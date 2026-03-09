import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export default function MaskEditor({
  plan = 'starter',        // "starter" | "pro"
  imageUrl,
  imageFile,               // 給 backend / SAM 用
  onBack,                  // () => void
  onNext,                  // ({ maskBlob }) => void
  onAutoMask,              // async ({ imageFile, imageUrl, box }) => Blob | File | string | { maskBlob }
}) {
  const isPro = plan === 'pro'

  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const overlayCanvasRef = useRef(null)

  const maskRef = useRef(null)         // Uint8ClampedArray(canvasW * canvasH)
  const imgRectRef = useRef(null)      // image draw rect inside canvas
  const lastPointRef = useRef(null)
  const boxStartRef = useRef(null)

  const [brush, setBrush] = useState(28)
  const [tool, setTool] = useState('brush') // brush | erase | box
  const [isDown, setIsDown] = useState(false)
  const [previewBox, setPreviewBox] = useState(null)
  const [isAutoMasking, setIsAutoMasking] = useState(false)
  const [error, setError] = useState('')

  const size = useMemo(() => ({ w: 640, h: 420 }), [])

  const ensureBuffers = useCallback(() => {
    if (!maskRef.current || maskRef.current.length !== size.w * size.h) {
      maskRef.current = new Uint8ClampedArray(size.w * size.h)
    }

    if (!overlayCanvasRef.current) {
      const off = document.createElement('canvas')
      off.width = size.w
      off.height = size.h
      overlayCanvasRef.current = off
    }
  }, [size.h, size.w])

  const redraw = useCallback((box = null) => {
    const c = canvasRef.current
    if (!c) return
    ensureBuffers()

    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.clearRect(0, 0, c.width, c.height)

    const img = imgRef.current
    if (img && imgRectRef.current) {
      const r = imgRectRef.current
      ctx.drawImage(img, r.x, r.y, r.w, r.h)
    }

    const mask = maskRef.current
    if (mask) {
      const off = overlayCanvasRef.current
      const octx = off.getContext('2d', { willReadFrequently: true })
      const imgData = octx.createImageData(size.w, size.h)

      for (let i = 0; i < mask.length; i++) {
        const v = mask[i]
        if (!v) continue
        imgData.data[i * 4 + 0] = 255
        imgData.data[i * 4 + 1] = 60
        imgData.data[i * 4 + 2] = 60
        imgData.data[i * 4 + 3] = Math.round(v * 0.45) // overlay alpha
      }

      octx.clearRect(0, 0, off.width, off.height)
      octx.putImageData(imgData, 0, 0)
      ctx.drawImage(off, 0, 0)
    }

    if (box) {
      ctx.save()
      ctx.strokeStyle = '#60a5fa'
      ctx.lineWidth = 2
      ctx.setLineDash([8, 6])
      ctx.strokeRect(box.x, box.y, box.w, box.h)

      ctx.fillStyle = 'rgba(96, 165, 250, 0.12)'
      ctx.fillRect(box.x, box.y, box.w, box.h)
      ctx.restore()
    }
  }, [ensureBuffers, size.h, size.w])

  useEffect(() => {
    if (!imageUrl) return

    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      if (cancelled) return
      imgRef.current = img
      imgRectRef.current = fitContain(img.width, img.height, size.w, size.h)
      maskRef.current = new Uint8ClampedArray(size.w * size.h)
      setPreviewBox(null)
      setError('')
      redraw(null)
    }

    img.src = imageUrl

    return () => {
      cancelled = true
    }
  }, [imageUrl, redraw, size.h, size.w])

  const getCanvasPoint = (e) => {
    const c = canvasRef.current
    const rect = c.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (c.width / rect.width),
      y: (e.clientY - rect.top) * (c.height / rect.height),
    }
  }

  const getClampedPointInImage = (e) => {
    const p = getCanvasPoint(e)
    const r = imgRectRef.current
    if (!r) return p

    return {
      x: clamp(p.x, r.x, r.x + r.w),
      y: clamp(p.y, r.y, r.y + r.h),
    }
  }

  const paintToMask = (from, to, mode) => {
    const mask = maskRef.current
    if (!mask) return
    const value = mode === 'erase' ? 0 : 255
    paintStroke(mask, size.w, size.h, from.x, from.y, to.x, to.y, brush, value)
  }

  const clear = () => {
    maskRef.current = new Uint8ClampedArray(size.w * size.h)
    setPreviewBox(null)
    setError('')
    redraw(null)
  }

  const runAutoMask = useCallback(async (boxOnCanvas) => {
    if (!onAutoMask) return
    if (!imgRef.current || !imgRectRef.current) return

    try {
      setIsAutoMasking(true)
      setError('')

      const imageBox = canvasBoxToImageBox(
        boxOnCanvas,
        imgRectRef.current,
        imgRef.current.width,
        imgRef.current.height
      )

      const result = await onAutoMask({
        imageFile,
        imageUrl,
        box: imageBox, // original image coordinates
      })

      const autoMask = await normalizeIncomingMask(result, {
        canvasW: size.w,
        canvasH: size.h,
        imgRect: imgRectRef.current,
      })

      mergeMask(maskRef.current, autoMask)
      setPreviewBox(null)
      redraw(null)
    } catch (err) {
      setError(err?.message || 'Auto mask failed.')
      redraw(null)
    } finally {
      setIsAutoMasking(false)
    }
  }, [imageFile, imageUrl, onAutoMask, redraw, size.h, size.w])

  const onPointerDown = (e) => {
    if (isAutoMasking) return
    if (!imgRef.current) return

    e.currentTarget.setPointerCapture?.(e.pointerId)
    setIsDown(true)
    setError('')

    const p = getClampedPointInImage(e)

    if (isPro && tool === 'box') {
      boxStartRef.current = p
      const box = { x: p.x, y: p.y, w: 0, h: 0 }
      setPreviewBox(box)
      redraw(box)
      return
    }

    lastPointRef.current = p
    paintToMask(p, p, tool)
    redraw(null)
  }

  const onPointerMove = (e) => {
    if (!isDown || isAutoMasking) return

    const p = getClampedPointInImage(e)

    if (isPro && tool === 'box') {
      const start = boxStartRef.current
      if (!start) return

      const rawBox = normalizeBox(start, p)
      const clipped = clipBoxToRect(rawBox, imgRectRef.current)
      setPreviewBox(clipped)
      redraw(clipped)
      return
    }

    const prev = lastPointRef.current ?? p
    paintToMask(prev, p, tool)
    lastPointRef.current = p
    redraw(null)
  }

  const onPointerUp = async (e) => {
    if (!isDown) return

    e.currentTarget.releasePointerCapture?.(e.pointerId)
    setIsDown(false)

    if (isPro && tool === 'box') {
      const p = getClampedPointInImage(e)
      const start = boxStartRef.current
      boxStartRef.current = null

      if (!start) {
        setPreviewBox(null)
        redraw(null)
        return
      }

      const rawBox = normalizeBox(start, p)
      const clipped = clipBoxToRect(rawBox, imgRectRef.current)

      if (!clipped || clipped.w < 4 || clipped.h < 4) {
        setPreviewBox(null)
        redraw(null)
        return
      }

      setPreviewBox(clipped)
      redraw(clipped)
      await runAutoMask(clipped)
      return
    }

    lastPointRef.current = null
  }

  const exportAndNext = async () => {
    const c = canvasRef.current
    const mask = maskRef.current ?? new Uint8ClampedArray(size.w * size.h)

    const out = document.createElement('canvas')
    out.width = c.width
    out.height = c.height
    const octx = out.getContext('2d')
    const imgData = octx.createImageData(out.width, out.height)

    for (let i = 0; i < mask.length; i++) {
      const v = mask[i]
      imgData.data[i * 4 + 0] = 255
      imgData.data[i * 4 + 1] = 255
      imgData.data[i * 4 + 2] = 255
      imgData.data[i * 4 + 3] = v
    }

    octx.putImageData(imgData, 0, 0)

    out.toBlob((blob) => {
      if (blob) onNext?.({ maskBlob: blob })
    }, 'image/png')
  }

  const autoMaskDisabled = !isPro || !onAutoMask || !imageFile || isAutoMasking

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: 18, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Mask editor</h2>
          <p style={{ margin: '8px 0 0', opacity: 0.8 }}>
            {isPro
              ? 'Brush / erase manually, or use Auto Mask (box → SAM) and then refine.'
              : 'Paint the region to inpaint. Export produces a PNG mask.'}
          </p>
          {error ? (
            <p style={{ margin: '10px 0 0', color: '#fca5a5', fontSize: 13 }}>{error}</p>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setTool('brush')}
              style={tool === 'brush' ? btnActive : btnSecondary}
              disabled={isAutoMasking}
            >
              Brush
            </button>

            <button
              onClick={() => setTool('erase')}
              style={tool === 'erase' ? btnActive : btnSecondary}
              disabled={isAutoMasking}
            >
              Eraser
            </button>

            {isPro ? (
              <button
                onClick={() => setTool('box')}
                style={tool === 'box' ? btnActive : btnSecondary}
                disabled={autoMaskDisabled}
                title={!imageFile ? 'imageFile is required for SAM request' : ''}
              >
                {isAutoMasking ? 'Auto Masking...' : 'Auto Mask'}
              </button>
            ) : null}
          </div>

          <label style={{ fontSize: 13, opacity: 0.85 }}>
            Brush: {brush}px
            <input
              type="range"
              min="6"
              max="70"
              value={brush}
              onChange={(e) => setBrush(Number(e.target.value))}
              style={{ marginLeft: 10 }}
              disabled={isAutoMasking}
            />
          </label>

          <button onClick={clear} style={btnSecondary} disabled={isAutoMasking}>
            Clear
          </button>

          <button onClick={exportAndNext} style={btnPrimary} disabled={isAutoMasking}>
            Continue to Prompt
          </button>

          <button onClick={onBack} style={btnGhost} disabled={isAutoMasking}>
            Back
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, display: 'grid', placeItems: 'center' }}>
        <canvas
          ref={canvasRef}
          width={size.w}
          height={size.h}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            width: '100%',
            maxWidth: 960,
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.03)',
            touchAction: 'none',
            cursor: isPro && tool === 'box' ? 'cell' : 'crosshair',
          }}
        />
      </div>
    </div>
  )
}

const btnPrimary = {
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.18)',
  background: '#4f46e5',
  color: 'white',
  fontWeight: 700,
  cursor: 'pointer',
}

const btnSecondary = {
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.22)',
  background: 'transparent',
  color: 'inherit',
  fontWeight: 700,
  cursor: 'pointer',
}

const btnGhost = {
  ...btnSecondary,
  opacity: 0.9,
}

const btnActive = {
  ...btnSecondary,
  background: 'rgba(79, 70, 229, 0.2)',
  border: '1px solid rgba(99, 102, 241, 0.65)',
}

function fitContain(iw, ih, cw, ch) {
  const ir = iw / ih
  const cr = cw / ch
  let w, h

  if (ir > cr) {
    w = cw
    h = cw / ir
  } else {
    h = ch
    w = ch * ir
  }

  const x = (cw - w) / 2
  const y = (ch - h) / 2
  return { x, y, w, h }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function normalizeBox(a, b) {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const w = Math.abs(a.x - b.x)
  const h = Math.abs(a.y - b.y)
  return { x, y, w, h }
}

function clipBoxToRect(box, rect) {
  if (!box || !rect) return null

  const x1 = clamp(box.x, rect.x, rect.x + rect.w)
  const y1 = clamp(box.y, rect.y, rect.y + rect.h)
  const x2 = clamp(box.x + box.w, rect.x, rect.x + rect.w)
  const y2 = clamp(box.y + box.h, rect.y, rect.y + rect.h)

  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
  }
}

function canvasBoxToImageBox(box, imgRect, imageW, imageH) {
  const x = ((box.x - imgRect.x) / imgRect.w) * imageW
  const y = ((box.y - imgRect.y) / imgRect.h) * imageH
  const w = (box.w / imgRect.w) * imageW
  const h = (box.h / imgRect.h) * imageH

  return {
    x: Math.round(clamp(x, 0, imageW)),
    y: Math.round(clamp(y, 0, imageH)),
    w: Math.round(clamp(w, 1, imageW)),
    h: Math.round(clamp(h, 1, imageH)),
  }
}

function paintCircle(mask, w, h, cx, cy, r, value) {
  const r2 = r * r
  const x0 = Math.max(0, Math.floor(cx - r))
  const x1 = Math.min(w - 1, Math.ceil(cx + r))
  const y0 = Math.max(0, Math.floor(cy - r))
  const y1 = Math.min(h - 1, Math.ceil(cy + r))

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= r2) {
        mask[y * w + x] = value
      }
    }
  }
}

function paintStroke(mask, w, h, x0, y0, x1, y1, r, value) {
  const dx = x1 - x0
  const dy = y1 - y0
  const dist = Math.hypot(dx, dy)
  const steps = Math.max(1, Math.ceil(dist / Math.max(1, r * 0.35)))

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = x0 + dx * t
    const y = y0 + dy * t
    paintCircle(mask, w, h, x, y, r, value)
  }
}

function mergeMask(baseMask, nextMask) {
  if (!baseMask || !nextMask || baseMask.length !== nextMask.length) return
  for (let i = 0; i < baseMask.length; i++) {
    baseMask[i] = Math.max(baseMask[i], nextMask[i])
  }
}

async function normalizeIncomingMask(result, { canvasW, canvasH, imgRect }) {
  const raw = result?.maskBlob ?? result?.blob ?? result

  if (raw instanceof Uint8ClampedArray) {
    if (raw.length !== canvasW * canvasH) {
      throw new Error('Returned mask array size is invalid.')
    }
    return raw
  }

  let src = null
  let revokeUrl = null

  if (raw instanceof Blob || raw instanceof File) {
    revokeUrl = URL.createObjectURL(raw)
    src = revokeUrl
  } else if (typeof raw === 'string') {
    src = raw
  } else {
    throw new Error('Unsupported mask format returned from onAutoMask.')
  }

  try {
    const img = await loadImage(src)

    const off = document.createElement('canvas')
    off.width = canvasW
    off.height = canvasH
    const octx = off.getContext('2d', { willReadFrequently: true })

    // 如果 SAM 回傳的是原圖尺寸 mask，就映射到 image rect
    // 如果剛好回傳 canvas 尺寸，就直接鋪滿整個 canvas
    if (img.width === canvasW && img.height === canvasH) {
      octx.drawImage(img, 0, 0, canvasW, canvasH)
    } else {
      octx.drawImage(img, imgRect.x, imgRect.y, imgRect.w, imgRect.h)
    }

    const data = octx.getImageData(0, 0, canvasW, canvasH).data
    const mask = new Uint8ClampedArray(canvasW * canvasH)

    for (let i = 0; i < mask.length; i++) {
      const r = data[i * 4 + 0]
      const g = data[i * 4 + 1]
      const b = data[i * 4 + 2]
      const a = data[i * 4 + 3]

      const rgbSignal = Math.max(r, g, b)
      const alphaSignal = a < 255 ? a : 0
      const v = Math.max(rgbSignal, alphaSignal)

      mask[i] = v > 127 ? 255 : 0
    }

    return mask
  } finally {
    if (revokeUrl) URL.revokeObjectURL(revokeUrl)
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}