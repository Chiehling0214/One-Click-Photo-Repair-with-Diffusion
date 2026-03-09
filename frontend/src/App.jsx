import { useEffect, useMemo, useState } from 'react'
import './App.css'

import DemoShowcase from './components/DemoShowcase.jsx'
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
  const [mode, setMode] = useState('normal')

  const [imageFile, setImageFile] = useState(null)
  const [imageUrl, setImageUrl] = useState('')     // preview
  const [maskBlob, setMaskBlob] = useState(null)
  const [maskUrl, setMaskUrl] = useState('')       // preview
  const [resultUrls, setResultUrls] = useState([])

  const [plan, setPlan] = useState('starter') // starter | pro | advanced

  useEffect(() => {
    if (!maskBlob) {
      setMaskUrl('')
      return
    }

    const url = URL.createObjectURL(maskBlob)
    setMaskUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [maskBlob])

  async function handleAutoMask({ imageFile, box }) {
    const form = new FormData()
    form.append('image', imageFile)
    form.append('x', String(box.x))
    form.append('y', String(box.y))
    form.append('w', String(box.w))
    form.append('h', String(box.h))

    const res = await fetch('http://127.0.0.1:8000/sam-mask', {
      method: 'POST',
      body: form,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`SAM request failed: ${res.status} ${text}`)
    }

    return await res.blob()
  }

  const features = useMemo(
    () => [
      {
        title: 'From image to result, fast',
        desc: 'A guided 5-step flow keeps every edit clear and focused, so users can move from upload to final output without getting lost.',
      },
      {
        title: 'Edit only what matters',
        desc: 'Use precise masking to target the exact area you want to change—giving you cleaner edits and far less guesswork.',
      },
      {
        title: 'Smarter prompt control',
        desc: 'Mix preset suggestions, custom prompts, and negative prompts in one streamlined workflow for more intentional results.',
      },
      {
        title: 'Built for better outputs',
        desc: 'Choose between normal, fill, and gen modes to match the task—whether you want quick cleanup or more guided generation.',
      },
      {
        title: 'See progress in real time',
        desc: 'Track the generation process live with clear status feedback, so the experience feels responsive even when the backend takes time.',
      },
      {
        title: 'Create more, compare faster',
        desc: 'Generate multiple variations in one run and review outputs side by side, making it easier to pick the strongest result quickly.',
      },
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
            <span className="brandName">Inpaintly</span>
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
                  setMaskBlob(null)
                  setResultUrls([])
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
            <span className="brandName">Inpaintly</span>
          </div>
          <button className="ghostBtn" onClick={() => setPage('home')}>Back to home</button>
        </header>

        <main className="main">
          <section className="hero">
            <div className="heroCopy">
              <MaskEditor
                plan={plan}
                imageUrl={imageUrl}
                imageFile={imageFile}
                onBack={() => setPage('upload')}
                onNext={({ maskBlob }) => {
                  setMaskBlob(maskBlob)
                  setPage('prompt')
                }}
                onAutoMask={plan === 'pro' ? handleAutoMask : undefined}
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
            <span className="brandName">Inpaintly</span>
          </div>
          <button className="ghostBtn" onClick={() => setPage('home')}>
            Back to home
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
                  setMode(v?.mode ?? 'normal')
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
            <span className="brandName">Inpaintly</span>
          </div>
          <button className="ghostBtn" onClick={() => setPage('home')}>
            Back to home
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
                mode={mode}
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
                    Waiting for backend.
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
            <span className="brandName">Inpaintly</span>
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
                    You can download the result here.
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
          <span className="brandName">Inpaintly</span>
        </div>
        <nav className="nav">
          <a className="navLink" href="#features">Features</a>
          <a className="navLink" href="#pricing">Plan Preview</a>
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
              Inpaintly is a lightweight product front-end for image inpainting workflows:
              upload → mask → prompt → generate → share.
            </p>

            <div className="ctaRow">
              <button className="primaryBtn primaryPulse" onClick={() => setPage('upload')}>
                Start using Inpaintly
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

        <DemoShowcase />

        <section id="pricing" className="section">
          <h2 className="sectionTitle">Plan Preview</h2>
          <div className="grid">
            <div className="card cardAnim" style={{ '--delay': `0ms` }}>
              <h3 className="cardTitle">Starter</h3>
              <p className="cardText">
                Includes the core inpainting workflow: upload, manual masking, prompt editing, and result generation.
              </p>
              <p className="price">Available now</p>
              <button
                className="primaryBtn"
                onClick={() => {
                  setPlan('starter')
                  setPage('upload')
                }}
              >
                Start Starter
              </button>
            </div>

            <div className="card highlight cardAnim" style={{ '--delay': `90ms` }}>
              <h3 className="cardTitle">Pro</h3>
              <p className="cardText">
                Adds a more advanced editing flow with Auto Mask support, better control, and a faster path to cleaner results.
              </p>
              <p className="price">Preview available</p>
              <button
                className="primaryBtn"
                onClick={() => {
                  setPlan('pro')
                  setPage('upload')
                }}
              >
                Try Pro Preview
              </button>
            </div>

            <div className="card highlight cardAnim" style={{ '--delay': `180ms` }}>
              <h3 className="cardTitle">Advanced</h3>
              <p className="cardText">
                Planned future expansion for more customization, richer workflows, and broader image editing use cases.
              </p>
              <p className="price">Coming later</p>
              <button className="secondaryBtn" disabled>
                Coming later
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
                The current version focuses on the front-end workflow and user experience. It is designed to connect to a backend inpainting service, but the exact model and deployment setup can be integrated separately depending on your project.
              </p>
            </details>
            <details className="faqItem">
              <summary>Can I control what gets changed in the image?</summary>
              <p className="cardText">
                Yes. The workflow includes a mask editing step so you can mark the exact area you want to modify before generation. This helps keep the rest of the image untouched and gives you more precise control over the result.
              </p>
            </details>
            <details className="faqItem">
              <summary>What is the difference between normal, fill, and gen mode?</summary>
              <p className="cardText">
                Normal follows the standard generation flow.
                Fill is intended for simpler color or content filling without relying heavily on prompt guidance.
                Gen is designed for a two-stage process where filling happens first, followed by prompt-guided generation.
              </p>
            </details>
            <details className="faqItem">
              <summary>Can I use my own prompt instead of preset suggestions?</summary>
              <p className="cardText">
                Yes. You can select suggested prompt chips, type your own custom prompt, or combine both. This makes it easier to start quickly while still allowing more specific control when needed.
              </p>
            </details>
            <details className="faqItem">
              <summary>What is a negative prompt used for?</summary>
              <p className="cardText">
                A negative prompt tells the generation system what to avoid, such as text, watermark-like artifacts, or unwanted objects. It helps reduce noise and improves the consistency of the final output.
              </p>
            </details>
            <details className="faqItem">
              <summary>How long does generation take?</summary>
              <p className="cardText">
                Generation time can vary based on the complexity of the edit, the number of variations, and the backend model&apos;s performance. The interface provides real-time status updates during generation to keep you informed of the progress.
              </p>
            </details>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span className="footerText">© {new Date().getFullYear()} Inpaintly</span>
        <span className="footerText">Privacy · Terms</span>
      </footer>
    </div>
  )
}