import { useMemo, useState } from 'react'
import './App.css'

import ImageUpload from './components/ImageUpload.jsx'
import MaskEditor from './components/MaskEditor.jsx'
import PromptPicker from './components/PromptPicker.jsx'
import GeneratePage from './components/GeneratePage.jsx'
import ResultPage from './components/ResultPage.jsx'

export default function App() {
  const [page, setPage] = useState('home') // home | upload | mask | prompt | generate | result

  const [prompts, setPrompts] = useState([]) // selected prompts
  const [variations, setVariations] = useState(1) // 1..5

  const [imageFile, setImageFile] = useState(null)
  const [imageUrl, setImageUrl] = useState('')     // preview
  const [maskBlob, setMaskBlob] = useState(null)
  const [maskUrl, setMaskUrl] = useState('')       // preview
  const [resultUrl, setResultUrl] = useState('')

  const features = useMemo(
    () => [
      { title: 'Fast setup', desc: 'Go from zero to value in minutes with a clean, guided flow.' },
      { title: 'Smart defaults', desc: 'Opinionated presets so you don’t waste time on configuration.' },
      { title: 'Shareable results', desc: 'Export or share outputs with a single link.' },
    ],
    []
  )

  const resetFlow = () => {
    setImageFile(null)
    setImageUrl('')
    setMaskBlob(null)
    setMaskUrl('')
    setResultUrl('')
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
              <div className="mockCard" style={{ width: '100%', maxWidth: 420 }}>
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
              <div className="mockCard" style={{ width: '100%', maxWidth: 420 }}>
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
                defaultSelected={prompts}
                defaultCount={variations}
                maxSelected={12}
                onChange={({ prompts: ps, count }) => {
                  setPrompts(ps)
                  setVariations(count)
                }}
                onBack={() => setPage('mask')}
                onContinue={({ prompts: ps, count }) => {
                  setPrompts(ps)
                  setVariations(count)
                  setPage('generate') // ✅ proceed to generate
                }}
              />
            </div>
  
            <div className="heroMock">
              <div className="mockCard" style={{ width: '100%', maxWidth: 420 }}>
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
                    <div className="pill">Selected: {prompts.length}</div>
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
                prompts={prompts}
                variations={variations}
                endpoint="http://127.0.0.1:8000/inpaint"
                onBack={() => setPage('prompt')}
                onDone={({ resultUrl: url }) => {
                  setResultUrl(url)
                  setPage('result')
                }}
              />
            </div>

            <div className="heroMock">
              <div className="mockCard" style={{ width: '100%', maxWidth: 420 }}>
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
                resultUrl={resultUrl}
                onBack={() => setPage('mask')}
                onRestart={resetFlow}
              />
            </div>

            <div className="heroMock">
              <div className="mockCard" style={{ width: '100%', maxWidth: 420 }}>
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
    <div className="app-shell">
      <header className="topbar">
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
        <section className="hero">
          <div className="heroCopy">
            <h1 className="title">Inpaint faster. Ship better visuals.</h1>
            <p className="subtitle">
              AppName is a lightweight product front-end for image inpainting workflows:
              upload → mask → generate → share.
            </p>

            <div className="ctaRow">
              <button className="primaryBtn" onClick={() => setPage('upload')}>
                Start using AppName
              </button>
              <button
                className="secondaryBtn"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See features
              </button>
            </div>

            <div className="metaRow">
              <span className="pill">No credit card</span>
              <span className="pill">Export-ready</span>
              <span className="pill">Built for demos</span>
            </div>
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
                <div className="mockGrid">
                  <div className="mockTile" />
                  <div className="mockTile" />
                  <div className="mockTile" />
                </div>
              </div>
              <div className="mockFooter">
                <button className="mockBtn" type="button" onClick={() => setPage('upload')}>
                  Try it
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="section">
          <h2 className="sectionTitle">Features</h2>
          <div className="grid">
            {features.map((f) => (
              <div key={f.title} className="card">
                <h3 className="cardTitle">{f.title}</h3>
                <p className="cardText">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="section">
          <h2 className="sectionTitle">Pricing</h2>
          <div className="grid">
            <div className="card">
              <h3 className="cardTitle">Starter</h3>
              <p className="cardText">For quick demos and small projects.</p>
              <p className="price">$0</p>
              <button className="primaryBtn" onClick={() => setStarted(true)}>
                Start free
              </button>
            </div>

            <div className="card highlight">
              <h3 className="cardTitle">Pro</h3>
              <p className="cardText">For teams shipping consistently.</p>
              <p className="price">$19</p>
              <button className="primaryBtn" onClick={() => setStarted(true)}>
                Start Pro
              </button>
            </div>

            <div className="card">
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
