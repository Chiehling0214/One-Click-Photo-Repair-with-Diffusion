import { useCallback, useMemo, useRef, useState } from 'react'

export default function ImageUpload({
  title = 'Upload an image',
  subtitle = 'Drag & drop an image here, or click to browse.',
  accept = 'image/*',
  maxSizeMB = 10,
  onChange,      // (file) => void
  onContinue,    // ({ file, previewUrl }) => void
  onBack,        // optional () => void
}) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')

  const maxBytes = useMemo(() => maxSizeMB * 1024 * 1024, [maxSizeMB])

  const cleanupPreview = useCallback((url) => {
    if (url) URL.revokeObjectURL(url)
  }, [])

  const validateAndSet = useCallback(
    (f) => {
      setError('')
      if (!f) return

      if (!f.type?.startsWith('image/')) {
        setError('Only image files are allowed.')
        return
      }
      if (f.size > maxBytes) {
        setError(`File too large. Max size is ${maxSizeMB} MB.`)
        return
      }

      setFile(f)
      const url = URL.createObjectURL(f)
      setPreviewUrl((prev) => {
        cleanupPreview(prev)
        return url
      })

      onChange?.(f)
    },
    [cleanupPreview, maxBytes, maxSizeMB, onChange]
  )

  const onPick = useCallback(() => inputRef.current?.click(), [])
  const onInputChange = useCallback(
    (e) => {
      const f = e.target.files?.[0]
      validateAndSet(f)
      e.target.value = ''
    },
    [validateAndSet]
  )

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      setIsDragging(false)
      const f = e.dataTransfer.files?.[0]
      validateAndSet(f)
    },
    [validateAndSet]
  )

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const clear = useCallback(() => {
    setFile(null)
    setError('')
    setPreviewUrl((prev) => {
      cleanupPreview(prev)
      return ''
    })
  }, [cleanupPreview])

  const continueDisabled = !file || !!error

  return (
    <div style={styles.shell}>
      {/* topRow: matches PromptPicker */}
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.title}>{title}</h2>
          <p style={styles.subtitle}>{subtitle}</p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {onBack ? (
            <button type="button" style={styles.ghostBtn} onClick={onBack}>
              Back
            </button>
          ) : null}

          <button
            type="button"
            style={styles.secondaryBtn}
            onClick={clear}
            disabled={!file && !previewUrl}
          >
            Clear
          </button>

          <button
            type="button"
            style={{ ...styles.primaryBtn, ...(continueDisabled ? styles.btnDisabled : null) }}
            onClick={() => onContinue?.({ file, previewUrl })}
            disabled={continueDisabled}
          >
            Continue to Mask
          </button>
        </div>
      </div>

      {/* field: label + content box, matches PromptPicker */}
      <div style={styles.field}>
        <div style={styles.fieldLabel}>Image</div>

        <div
          style={{
            ...styles.dropzone,
            ...(isDragging ? styles.dropzoneActive : null),
          }}
          onClick={onPick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          role="button"
          tabIndex={0}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={onInputChange}
            style={{ display: 'none' }}
          />

          {!previewUrl ? (
            <div style={styles.placeholder}>
              <div style={styles.icon} aria-hidden="true">⬆️</div>
              <div style={styles.hintLine}>
                <strong>Drop an image</strong> or <span style={styles.linkLike}>browse</span>
              </div>
              <div style={styles.smallHint}>PNG / JPG / WEBP · Up to {maxSizeMB} MB</div>
            </div>
          ) : (
            <div style={styles.previewWrap}>
              <img src={previewUrl} alt="Preview" style={styles.previewImg} />
              <div style={styles.previewMeta}>
                <div style={styles.fileName} title={file?.name}>{file?.name}</div>
                <div style={styles.fileInfo}>{(file?.size / (1024 * 1024)).toFixed(2)} MB</div>
              </div>
            </div>
          )}
        </div>

        {error ? <div style={styles.error}>{error}</div> : null}
      </div>
    </div>
  )
}

const styles = {
  // Match PromptPicker shell
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

  // Make the dropzone look like PromptPicker's chipRow box language
  dropzone: {
    border: '1px dashed rgba(255,255,255,0.22)',
    borderRadius: 16,                   // same vibe as chipRow
    padding: 12,                        // similar density
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.03)',
  },
  dropzoneActive: {
    borderColor: 'rgba(255,255,255,0.45)',
    background: 'rgba(255,255,255,0.06)',
  },

  placeholder: {
    minHeight: 180,
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    gap: 8,
    opacity: 0.95,
  },
  icon: { fontSize: 28 },
  hintLine: { fontSize: 14 },
  linkLike: { textDecoration: 'underline' },
  smallHint: { fontSize: 12, opacity: 0.75 },

  previewWrap: {
    display: 'grid',
    gridTemplateColumns: '140px 1fr',
    gap: 14,
    alignItems: 'center',
  },
  previewImg: {
    width: 140,
    height: 140,
    objectFit: 'cover',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.14)',
  },
  previewMeta: { overflow: 'hidden' },
  fileName: { fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  fileInfo: { marginTop: 6, fontSize: 12, opacity: 0.75 },

  error: {
    marginTop: 10,
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(255,80,80,0.35)',
    background: 'rgba(255,80,80,0.10)',
    color: '#ffb4b4',
    fontSize: 13,
  },

  // Buttons match PromptPicker button styling
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
