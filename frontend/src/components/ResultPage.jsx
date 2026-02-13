export default function ResultPage({
    inputUrl,
    maskUrl,
    resultUrls,
    onRestart,     // () => void
    onBack,        // () => void (back to mask)
  }) {
    return (
      <div style={styles.panel}>
        <div style={styles.topRow}>
          <div>
            <h2 style={styles.h2}>Result</h2>
            <p style={styles.p}>Select your preferred inpaint result.</p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={onBack} style={styles.btnSecondary}>Back to mask</button>
            <button onClick={onRestart} style={styles.btnPrimary}>Start over</button>
          </div>
        </div>

        {/* Input + Mask */}
        <div style={styles.grid2}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Input</div>
            <img src={inputUrl} alt="input" style={styles.img} />
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Mask</div>
            <img src={maskUrl} alt="mask" style={styles.img} />
          </div>
        </div>

        {/* Results */}
        <div style={{ marginTop: 20 }}>
          <div style={styles.sectionTitle}>Generated Results</div>

          <div style={styles.gridDynamic}>
            {(resultUrls || []).map((url, i) => (
              <div key={i} style={styles.card}>
                <div style={styles.cardTitle}>Option {i + 1}</div>
                <img src={url} alt={`result-${i}`} style={styles.img} />

                <div style={styles.actionRow}>
                  <a href={url} target="_blank" rel="noreferrer" style={styles.link}>
                    Open
                  </a>
                  <a href={url} download={`result-${i + 1}.png`} style={styles.link}>
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>

          {(!resultUrls || resultUrls.length === 0) ? (
            <div style={{ marginTop: 10, opacity: 0.6 }}>No results</div>
          ) : null}
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
    grid2: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
      marginTop: 14,
    },

    gridDynamic: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: 12,
      marginTop: 12,
    },

    sectionTitle: {
      fontSize: 14,
      fontWeight: 700,
      opacity: 0.9,
    },

    actionRow: {
      marginTop: 10,
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 12,
    },

  }
  