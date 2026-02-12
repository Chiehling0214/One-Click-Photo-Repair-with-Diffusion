export default function ResultPage({
    inputUrl,
    maskUrl,
    resultUrl,
    onRestart,     // () => void
    onBack,        // () => void (back to mask)
  }) {
    return (
      <div style={styles.panel}>
        <div style={styles.topRow}>
          <div>
            <h2 style={styles.h2}>Result</h2>
            <p style={styles.p}>Your inpaint output is ready.</p>
          </div>
  
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={onBack} style={styles.btnSecondary}>Back to mask</button>
            <button onClick={onRestart} style={styles.btnPrimary}>Start over</button>
          </div>
        </div>
  
        <div style={styles.grid3}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Input</div>
            <img src={inputUrl} alt="input" style={styles.img} />
          </div>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Mask</div>
            <img src={maskUrl} alt="mask" style={styles.img} />
          </div>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Result</div>
            <img src={resultUrl} alt="result" style={styles.img} />
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
              <a href={resultUrl} target="_blank" rel="noreferrer" style={styles.link}>
                Open original
              </a>
            </div>
          </div>
        </div>
      </div>
    )
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
  
    grid3: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
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
  
    btnPrimary: {
      padding: '10px 14px',
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.18)',
      background: '#4f46e5',
      color: 'white',
      fontWeight: 700,
      cursor: 'pointer',
    },
    btnSecondary: {
      padding: '10px 14px',
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.22)',
      background: 'transparent',
      color: 'inherit',
      fontWeight: 700,
      cursor: 'pointer',
    },
    link: { color: 'inherit', opacity: 0.9, textDecoration: 'underline' },
  }
  