import { useEffect, useMemo, useRef, useState } from 'react'

import s1 from '../assets/s1.png'
import s2 from '../assets/s2.png'
import s3 from '../assets/s3.png'
import s4 from '../assets/s4.png'
import s5 from '../assets/s5.png'
import samVideo from '../assets/sam.mp4'

function StoryStep({ step, index }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting)
      },
      {
        threshold: 0.22,
        rootMargin: '0px 0px -6% 0px',
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const reverse = index % 2 === 1

  return (
    <section
      ref={ref}
      className={`storySection ${visible ? 'is-visible' : ''} ${reverse ? 'is-reverse' : ''}`}
    >
      <div className="storySectionCopy">
        <p className="storySectionEyebrow">{step.eyebrow}</p>
        <h3 className="storySectionTitle">{step.title}</h3>
        <p className="storySectionDesc">{step.desc}</p>
      </div>

      <div className="storySectionVisual">
        <img
          src={step.image}
          alt={step.title}
          className="storySectionImage"
        />
      </div>
    </section>
  )
}

export default function ProductStory() {
  const steps = useMemo(
    () => [
      {
        eyebrow: 'Step 1 · Upload',
        title: 'Start in seconds.',
        desc: 'Bring in a single image and move straight into editing. No setup-heavy flow, no unnecessary friction.',
        image: s1,
      },
      {
        eyebrow: 'Step 2 · Mask',
        title: 'Mark exactly what should change.',
        desc: 'Paint only the region you want to replace. The interface stays simple, while the edit stays precise.',
        image: s2,
      },
      {
        eyebrow: 'Step 3 · Prompt',
        title: 'Guide the result with more control.',
        desc: 'Combine prompt chips, free text, negative prompts, and generation modes in one place before you run.',
        image: s3,
      },
      {
        eyebrow: 'Step 4 · Generate',
        title: 'See progress as it happens.',
        desc: 'Review the input, mask, and generation details while the backend processes the request in real time.',
        image: s4,
      },
      {
        eyebrow: 'Step 5 · Result',
        title: 'Review, compare, and refine.',
        desc: 'Move from rough edit to polished output with a workflow built for iteration, not guesswork.',
        image: s5,
      },
    ],
    []
  )

  return (
    <section className="productStoryFlow" aria-label="Product story">
      <div className="productStoryFlowIntro">
        <p className="productStoryFlowLabel">A cleaner editing workflow</p>
        <h2 className="productStoryFlowHeading">
          Built to make image inpainting feel fast, deliberate, and clear.
        </h2>
      </div>

      <div className="productStoryFlowList">
        {steps.map((step, index) => (
          <StoryStep key={step.title} step={step} index={index} />
        ))}
      </div>

      <div className="demoSamFeature">
        <div className="demoSamFeatureCopy">
          <p className="demoSamFeatureEyebrow">Pro Feature</p>
          <h3 className="demoSamFeatureTitle">SAM Auto Mask</h3>
          <p className="demoSamFeatureDesc">
            Use Segment Anything Model to detect object boundaries more precisely.
            This gives Pro users a faster and cleaner editing workflow with less
            manual mask painting.
          </p>

          <ul className="demoSamFeatureList">
            <li>Cleaner object boundaries</li>
            <li>Less manual masking</li>
            <li>Faster editing flow</li>
            <li>Better inpainting input quality</li>
          </ul>

          <button
            className="primaryBtn"
            onClick={() => {
              onTryPro?.()
            }}
          >
            Try Pro Preview
          </button>
        </div>

        <div className="demoSamFeatureMedia">
          <video
            className="demoSamFeatureVideo"
            src={samVideo}
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="metadata"
          />
        </div>
      </div>
    </section>
  )
}