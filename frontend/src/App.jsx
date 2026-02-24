import { useMemo, useState } from 'react'
import './App.css'

import ImageUpload from './components/ImageUpload.jsx'
import MaskEditor from './components/MaskEditor.jsx'
import PromptPicker from './components/PromptPicker.jsx'
import GeneratePage from './components/GeneratePage.jsx'
import ResultPage from './components/ResultPage.jsx'

export default function App() {
  const [page, setPage] = useState('home') // home | upload | mask | prompt | generate | result

  const [variations, setVariations] = useState(1) // 1..5
  const [selectedPrompts, setSelectedPrompts] = useState([]) 
  const [userPrompt, setUserPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [thinkLonger, setThinkLonger] = useState(false)
  const [finalPrompt, setFinalPrompt] = useState('') // optional but recommended for preview + backend

  const [imageFile, setImageFile] = useState(null)
  const [imageUrl, setImageUrl] = useState('')     // preview
  const [maskBlob, setMaskBlob] = useState(null)
  const [maskUrl, setMaskUrl] = useState('')       // preview
  const [resultUrls, setResultUrls] = useState([])

  const features = useMemo(
    () => [
      { title: 'Guided 5-Step Flow', desc: 'A frictionless wizard (Upload → Mask → Prompt → Generate → Result) that keeps users moving and reduces setup mistakes.' },
      { title: 'Precision Mask Edito', desc: 'Paint exactly what should be changed, with a clear mask preview before you generate—no guessing.'},
      { title: 'Preset Prompt Library', desc: 'Curated prompt categories (General / Outdoor / Indoor / Quality Boost) to get strong results without prompt engineering.'}, 
      { title: 'Custom Prompt + Live Preview', desc: 'Add your own text prompt and see the final combined prompt immediately, so you know exactly what the backend receives.'},
      { title: 'Negative Prompt Support', desc: 'Tell the model what to avoid (e.g., text, watermark, artifacts) for cleaner, more controlled outputs.'},
      { title: 'Multi-Variation Generation + “Think Longer” Toggle', desc: 'Generate 1–5 variations per request, and optionally enable “Think longer” for higher-quality/slow mode (backend-dependent).'}
    ],
    []
  )

  const resetFlow = () => {
    setImageFile(null)
    setImageUrl('')
    setMaskBlob(null)
    setMaskUrl('')
    setResultUrls([])
    setPage('upload')
  }

  // ---------- Upload ----------
  if (page === 'upload') {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brandMark" aria-hidden="true">◆</span>
            <span className="brandName">AppName</span>
          </div>
          <button className="ghostBtn" onClick={() => setPage('home')}>Back to home</button>
        </header>

        <main className="main">
          <section className="hero">
            <div className="heroCopy">
              <ImageUpload
                title="Upload an image"
                subtitle="Choose an image to start inpainting, then continue to mask."
                onChange={(f) => setImageFile(f)}
                onContinue={({ file, previewUrl }) => {
                  setImageFile(file)
                  setImageUrl(previewUrl)
                  setPage('mask')
                }}
              />
            </div>

            <div className="heroMock">
              <div className="mockCard">
                <div className="mockTop">
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                </div>

                <div className="mockBody">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Selected"
                      style={{
                        width: '100%',
                        height: 280,
                        objectFit: 'cover',
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,0.14)',
                      }}
                    />
                  ) : (
                    <>
                      <div className="mockLine strong" />
                      <div className="mockLine" />
                      <div className="mockLine" />
                      <div className="mockGrid">
                        <div className="mockTile" />
                        <div className="mockTile" />
                        <div className="mockTile" />
                      </div>
                    </>
                  )}
                </div>

                <div className="mockFooter" style={{ justifyContent: 'space-between' }}>
                  <span className="cardText">Step 1/5: Upload</span>
                  <span className="cardText">Next: Mask</span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    )
  }

  // ---------- Mask ----------
  if (page === 'mask') {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brandMark" aria-hidden="true">◆</span>
            <span className="brandName">AppName</span>
          </div>
          <button className="ghostBtn" onClick={() => setPage('upload')}>Back</button>
        </header>

        <main className="main">
          <section className="hero">
            <div className="heroCopy">
              <MaskEditor
                imageUrl={imageUrl}
                onBack={() => setPage('upload')}
                onNext={(blob) => {
                  setMaskBlob(blob)
                  const url = URL.createObjectURL(blob)
                  setMaskUrl(url)
                  setPage('prompt')
                }}
              />
            </div>

            <div className="heroMock">
              <div className="mockCard">
                <div className="mockTop">
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                </div>
                <div className="mockBody">
                  <p className="cardText" style={{ marginTop: 4 }}>
                    Paint the region to inpaint. Then continue.
                  </p>
                  {maskUrl ? (
                    <img
                      src={maskUrl}
                      alt="Mask preview"
                      style={{
                        width: '100%',
                        height: 280,
                        objectFit: 'cover',
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,0.14)',
                        marginTop: 12,
                      }}
                    />
                  ) : (
                    <>
                      <div className="mockLine strong" />
                      <div className="mockLine" />
                      <div className="mockLine" />
                    </>
                  )}
                </div>
                <div className="mockFooter" style={{ justifyContent: 'space-between' }}>
                  <span className="cardText">Step 2/5: Mask</span>
                  <span className="cardText">Next: Prompt</span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    )
  }

  // ---------- Prompt ----------
  if (page === 'prompt') {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brandMark" aria-hidden="true">◆</span>
            <span className="brandName">AppName</span>
          </div>
          <button className="ghostBtn" onClick={() => setPage('mask')}>
            Back to mask
          </button>
        </header>
  
        <main className="main">
          <section className="hero">
            <div className="heroCopy">
              <PromptPicker
                defaultSelected={selectedPrompts}
                defaultCount={variations}
                defaultUserPrompt={userPrompt}
                defaultNegativePrompt={negativePrompt}
                defaultThinkLonger={thinkLonger}
                maxSelected={12}
                onChange={(v) => {
                  const ps = Array.isArray(v?.prompts) ? v.prompts : []
                  setSelectedPrompts(ps)
                  setUserPrompt(v?.userPrompt ?? '')
                  setNegativePrompt(v?.negativePrompt ?? '')
                  setThinkLonger(Boolean(v?.thinkLonger))
                  setVariations(Number(v?.count ?? 1))
                  setFinalPrompt(v?.finalPrompt ?? '')
                }}
                onBack={() => setPage('mask')}
                onContinue={(v) => {
                  const ps = Array.isArray(v?.prompts) ? v.prompts : []
                  setSelectedPrompts(ps)
                  setUserPrompt(v?.userPrompt ?? '')
                  setNegativePrompt(v?.negativePrompt ?? '')
                  setThinkLonger(Boolean(v?.thinkLonger))
                  setVariations(Number(v?.count ?? 1))
                  setFinalPrompt(v?.finalPrompt ?? '')
                  setPage('generate')
                }}
              />
            </div>
  
            <div className="heroMock">
            <div className="mockCard">
              <div className="mockTop">
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                </div>
                <div className="mockBody">
                  <p className="cardText" style={{ marginTop: 4 }}>
                    Selected prompts will be combined as a single string and sent to the backend.
                  </p>
  
                  <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                    <div className="pill">Step 3/5: Prompt</div>
                    <div className="pill">Variations: {variations}</div>
                    <div className="pill">Selected: {selectedPrompts?.length ?? 0}</div>
                    <div className="pill">Think longer: {thinkLonger ? 'On' : 'Off'}</div>
                  </div>
                </div>
                <div className="mockFooter" style={{ justifyContent: 'space-between' }}>
                  <span className="cardText">Next: Generate</span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    )
  }

  // ---------- Generate (wait) ----------
  if (page === 'generate') {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brandMark" aria-hidden="true">◆</span>
            <span className="brandName">AppName</span>
          </div>
          <button className="ghostBtn" onClick={() => setPage('mask')}>
            Back to mask
          </button>
        </header>

        <main className="main">
          <section className="hero">
            <div className="heroCopy">
              <GeneratePage
                imageFile={imageFile}
                maskBlob={maskBlob}
                imagePreviewUrl={imageUrl}
                maskPreviewUrl={maskUrl}
                finalPrompt={finalPrompt}
                negativePrompt={negativePrompt}
                thinkLonger={thinkLonger}
                variations={variations}
                endpoint="http://127.0.0.1:8000/inpaint"
                onBack={() => setPage('prompt')}
                onDone={({ resultUrls: urls }) => {
                  setResultUrls(urls)
                  setPage('result')
                }}
              />
            </div>

            <div className="heroMock">
              <div className="mockCard">
                <div className="mockTop">
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                </div>
                <div className="mockBody">
                  <div className="mockLine strong" />
                  <div className="mockLine" />
                  <div className="mockLine" />
                  <p className="cardText" style={{ marginTop: 12 }}>
                    Waiting for backend. If your backend is slow, consider returning a jobId and polling.
                  </p>
                </div>
                <div className="mockFooter" style={{ justifyContent: 'space-between' }}>
                  <span className="cardText">Step 4/5: Generate</span>
                  <span className="cardText">Next: Result</span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    )
  }

  // ---------- Result ----------
  if (page === 'result') {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brandMark" aria-hidden="true">◆</span>
            <span className="brandName">AppName</span>
          </div>
          <button className="ghostBtn" onClick={() => setPage('home')}>Home</button>
        </header>

        <main className="main">
          <section className="hero">
            <div className="heroCopy">
              <ResultPage
                inputUrl={imageUrl}
                maskUrl={maskUrl}
                resultUrls={resultUrls}
                onBack={() => setPage('mask')}
                onRestart={resetFlow}
              />
            </div>

            <div className="heroMock">
              <div className="mockCard">
                <div className="mockTop">
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                </div>
                <div className="mockBody">
                  <p className="cardText" style={{ marginTop: 4 }}>
                    You can add “Download” / “Share link” / “Regenerate with new prompt” here.
                  </p>
                </div>
                <div className="mockFooter" style={{ justifyContent: 'space-between' }}>
                  <span className="cardText">Step 5/5: Result</span>
                  <span className="cardText">Done</span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    )
  }

  // ========= Home page =========
  return (
    <div className="app-shell homeShell">
      {/* Animated background */}
      <div className="bgFx" aria-hidden="true">
        <div className="blob blob1" />
        <div className="blob blob2" />
        <div className="blob blob3" />
        <div className="sparkles">
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} className="spark" style={{ '--i': i }} />
          ))}
        </div>
      </div>

      <header className="topbar topbarGlass">
        <div className="brand">
          <span className="brandMark" aria-hidden="true">◆</span>
          <span className="brandName">AppName</span>
        </div>
        <nav className="nav">
          <a className="navLink" href="#features">Features</a>
          <a className="navLink" href="#pricing">Pricing</a>
          <a className="navLink" href="#faq">FAQ</a>
        </nav>
      </header>

      <main className="main">
        <section className="hero heroDynamic">
          <div className="heroCopy">
            <div className="badgeRow">
              <span className="badge">No credit card</span>
              <span className="badge">Export-ready</span>
              <span className="badge">Built for demos</span>
            </div>

            <h1 className="title titleDynamic">
              Inpaint faster. <span className="titleGlow">Ship better visuals.</span>
            </h1>

            <p className="subtitle">
              AppName is a lightweight product front-end for image inpainting workflows:
              upload → mask → prompt → generate → share.
            </p>

            <div className="ctaRow">
              <button className="primaryBtn primaryPulse" onClick={() => setPage('upload')}>
                Start using AppName
              </button>

              <button
                className="secondaryBtn"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See features
              </button>
            </div>

            <div className="trustRow">
              <span className="trustItem">• Guided flow</span>
              <span className="trustItem">• Prompt + negative prompt</span>
              <span className="trustItem">• 1–5 variations</span>
            </div>
          </div>

          <div className="heroMock heroMockDynamic">
            <div className="mockCard mockFloat" style={{ perspective: 900 }}>
              <div className="mockCardInner">
                <div className="mockTop">
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                </div>

                <div className="mockBody">
                  <div className="mockLine strong" />
                  <div className="mockLine" />
                  <div className="mockLine" />

                  <div className="mockGrid">
                    <div className="mockTile mockTileAnim" />
                    <div className="mockTile mockTileAnim" />
                    <div className="mockTile mockTileAnim" />
                  </div>

                  <div className="miniSteps">
                    {['Upload', 'Mask', 'Prompt', 'Generate', 'Result'].map((s, idx) => (
                      <div key={s} className="miniStep" style={{ '--d': `${idx * 120}ms` }}>
                        <span className="miniDot" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mockFooter">
                  <button className="mockBtn" type="button" onClick={() => setPage('upload')}>
                    Try it
                  </button>
                  <span className="mockHint">~ 10s to first result</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="section">
          <h2 className="sectionTitle">Features</h2>
          <div className="grid gridAnim">
            {features.map((f, idx) => (
              <div key={f.title} className="card cardAnim" style={{ '--delay': `${idx * 90}ms` }}>
                <h3 className="cardTitle">{f.title}</h3>
                <p className="cardText">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="section">
          <h2 className="sectionTitle">Pricing</h2>
          <div className="grid">
            <div className="card cardAnim" style={{ '--delay': `0ms` }}>
              <h3 className="cardTitle">Starter</h3>
              <p className="cardText">For quick demos and small projects.</p>
              <p className="price">$0</p>
              <button className="primaryBtn" onClick={() => setPage('upload')}>
                Start free
              </button>
            </div>

            <div className="card highlight cardAnim" style={{ '--delay': `90ms` }}>
              <h3 className="cardTitle">Pro</h3>
              <p className="cardText">For teams shipping consistently.</p>
              <p className="price">$19</p>
              <button className="primaryBtn" onClick={() => setPage('upload')}>
                Start Pro
              </button>
            </div>

            <div className="card cardAnim" style={{ '--delay': `180ms` }}>
              <h3 className="cardTitle">Enterprise</h3>
              <p className="cardText">SSO, SLAs, custom deployments.</p>
              <p className="price">Let’s talk</p>
              <button className="secondaryBtn" onClick={() => alert('TODO: contact sales')}>
                Contact sales
              </button>
            </div>
          </div>
        </section>

        <section id="faq" className="section">
          <h2 className="sectionTitle">FAQ</h2>
          <div className="faq">
            <details className="faqItem">
              <summary>Does this include the backend model?</summary>
              <p className="cardText">
                Not yet—this is the front page + app entry UI. Hook buttons to your API/router next.
              </p>
            </details>
            <details className="faqItem">
              <summary>How do I connect it to the real app?</summary>
              <p className="cardText">
                Replace the <code>started</code> state with routing (React Router) and navigate to <code>/app</code>.
              </p>
            </details>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span className="footerText">© {new Date().getFullYear()} AppName</span>
        <span className="footerText">Privacy · Terms</span>
      </footer>
    </div>
  )
}
