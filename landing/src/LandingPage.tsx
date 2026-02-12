import css from './LandingPage.module.css';
import { DemoSection } from './DemoSection';
import GIFitLogo from '@/assets/gifit-logo.svg?react';
import TKLogo from '@/assets/tk.svg?react';
import BugIcon from '@/assets/bug.svg?react';

export function LandingPage() {
  return (
    <div className={css.page}>
      {/* Navigation */}
      <nav className={css.nav}>
        <div className={css.navInner}>
          <GIFitLogo className={css.navLogo} />
          <div className={css.navLinks}>
            <a href="#features">Features</a>
            <a href="#demo">Demo</a>
            <a
              href="https://github.com/takempf/GIFit"
              target="_blank"
              rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className={css.hero}>
        <div className={css.heroInner}>
          <span className={css.badge}>Open Source Browser Extension</span>
          <h1 className={css.heroTitle}>
            Create GIFs from any video, instantly.
          </h1>
          <p className={css.heroSubtitle}>
            GIFit! is a browser extension that lets you capture any moment from
            a YouTube video and turn it into a high-quality GIF with precision
            controls for timing, frame rate, and quality.
          </p>
          <div className={css.heroCta}>
            <a href="#demo" className={css.ctaPrimary}>
              Try the Demo
            </a>
            <a
              href="https://github.com/takempf/GIFit"
              className={css.ctaSecondary}
              target="_blank"
              rel="noreferrer">
              View on GitHub
            </a>
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className={css.features}>
        <div className={css.featuresInner}>
          <h2 className={css.sectionTitle}>Everything you need</h2>
          <div className={css.featureGrid}>
            <div className={css.featureCard}>
              <h3 className={css.featureTitle}>Precision Timeline</h3>
              <p className={css.featureDescription}>
                Scrub through the video with a visual timeline. Set exact start
                times and durations down to the frame.
              </p>
            </div>
            <div className={css.featureCard}>
              <h3 className={css.featureTitle}>Quality Controls</h3>
              <p className={css.featureDescription}>
                Fine-tune output width, height, frame rate, and color quality.
                Balance file size against visual fidelity.
              </p>
            </div>
            <div className={css.featureCard}>
              <h3 className={css.featureTitle}>Real-time Preview</h3>
              <p className={css.featureDescription}>
                See a live preview of your GIF as you adjust settings. Watch
                frames being captured in real-time during generation.
              </p>
            </div>
            <div className={css.featureCard}>
              <h3 className={css.featureTitle}>Smart Optimization</h3>
              <p className={css.featureDescription}>
                Global palette generation, frame deduplication, and Floyd-Steinberg
                dithering produce smaller files with better colors.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className={css.demoSection}>
        <div className={css.demoInner}>
          <h2 className={css.sectionTitle}>Try it now</h2>
          <p className={css.demoSubtitle}>
            This is the real GIFit! editor running directly in your browser.
            Pick a video, configure your GIF, and download it.
          </p>
          <DemoSection />
        </div>
      </section>

      {/* Footer */}
      <footer className={css.footer}>
        <div className={css.footerInner}>
          <a
            className={css.footerCredit}
            href="https://kempf.dev/#gifit"
            target="_blank"
            rel="noreferrer">
            Crafted by <TKLogo className={css.tkLogo} />
          </a>
          <span className={css.footerSupport}>
            <BugIcon className={css.bugIcon} /> Report issues on{' '}
            <a
              href="https://github.com/takempf/gifit/issues"
              target="_blank"
              rel="noreferrer">
              GitHub
            </a>
          </span>
          <span className={css.footerVersion}>v3.0.0</span>
        </div>
      </footer>
    </div>
  );
}
