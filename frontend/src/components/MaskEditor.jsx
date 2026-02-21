import { useEffect, useMemo, useRef, useState } from 'react'

export default function MaskEditor({
  imageUrl,
  onBack,             // () => void
  onNext,             // ({ maskBlob }) => void
}) {
  const canvasRef = useRef(null)
  const imgRef = useRef(null)

  const [brush, setBrush] = useState(28)
  const [isDown, setIsDown] = useState(false)

  const size = useMemo(() => ({ w: 640, h: 420 }), [])

  // draw base image into an offscreen image, then render to canvas
  useEffect(() => {
    if (!imageUrl) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imgRef.current = img
      const c = canvasRef.current
      const ctx = c.getContext('2d', { willReadFrequently: true })
      // fit image into canvas (contain)
      ctx.clearRect(0, 0, c.width, c.height)
      const r = fitContain(img.width, img.height, c.width, c.height)
      ctx.drawImage(img, r.x, r.y, r.w, r.h)
      // store bounds for brush mapping
      c.__imgRect = r
    }
    img.src = imageUrl
  }, [imageUrl])

  const draw = (e) => {
    const c = canvasRef.current
    const ctx = c.getContext('2d', { willReadFrequently: true })
    const rect = c.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (c.width / rect.width)
    const y = (e.clientY - rect.top) * (c.height / rect.height)

    // draw mask stroke as semi-transparent red overlay for UX
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = 'rgba(255, 60, 60, 0.45)'
    ctx.beginPath()
    ctx.arc(x, y, brush, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // also record mask into an alpha-only layer (stored on canvas as ImageData in a hidden buffer)
    if (!c.__mask) {
      c.__mask = new Uint8ClampedArray(c.width * c.height) // 0..255
    }
    const mask = c.__mask
    paintCircle(mask, c.width, c.height, x, y, brush, 255)
  }

  const onPointerDown = (e) => {
    setIsDown(true)
    draw(e)
  }
  const onPointerMove = (e) => {
    if (!isDown) return
    draw(e)
  }
  const onPointerUp = () => setIsDown(false)

  const clear = () => {
    const c = canvasRef.current
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.clearRect(0, 0, c.width, c.height)
    const img = imgRef.current
    if (img) {
      const r = c.__imgRect ?? fitContain(img.width, img.height, c.width, c.height)
      ctx.drawImage(img, r.x, r.y, r.w, r.h)
      c.__imgRect = r
    }
    c.__mask = new Uint8ClampedArray(c.width * c.height)
  }

  const exportAndNext = async () => {
    const c = canvasRef.current
    const mask = c.__mask ?? new Uint8ClampedArray(c.width * c.height)
  
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
      if (blob) onNext?.(blob)
    }, 'image/png')
  }
  

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: 18, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Mask editor</h2>
          <p style={{ margin: '8px 0 0', opacity: 0.8 }}>
            Paint the region to inpaint (red overlay). Export produces a PNG mask.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13, opacity: 0.85 }}>
            Brush: {brush}px
            <input
              type="range"
              min="6"
              max="70"
              value={brush}
              onChange={(e) => setBrush(Number(e.target.value))}
              style={{ marginLeft: 10 }}
            />
          </label>

          <button onClick={clear} style={btnSecondary}>Clear</button>
          <button onClick={exportAndNext} style={btnPrimary}>Continue to Prompt</button>

          <button onClick={onBack} style={btnGhost}>Back</button>
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
          style={{
            width: '100%',
            maxWidth: 960,
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.03)',
            touchAction: 'none',
            cursor: 'crosshair',
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
      if (dx * dx + dy * dy <= r2) mask[y * w + x] = value
    }
  }
}
