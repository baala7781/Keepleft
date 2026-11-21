'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Download, Menu, X } from 'lucide-react';

export default function MarketingLandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [elapsed, setElapsed] = useState(1742);

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const secs = (elapsed % 60).toString().padStart(2, '0');

  return (
    <div className="bg-[#0b0c0e] text-[#f5f5f5] font-sans antialiased selection:bg-[#e33b63] selection:text-white overflow-x-hidden">
      <style>{`
        @keyframes draw-route {
          from { stroke-dashoffset: 1400; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes filmstrip {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        .route-path {
          stroke-dasharray: 1400;
          stroke-dashoffset: 1400;
          animation: draw-route 2.6s cubic-bezier(0.4,0,0.2,1) 0.4s forwards;
        }
        .route-dot {
          animation: blink 1.8s ease-in-out infinite;
        }
        .filmstrip-track {
          animation: filmstrip 28s linear infinite;
        }
        .filmstrip-track:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .route-path  { animation: none; stroke-dashoffset: 0; }
          .filmstrip-track { animation: none; }
          .route-dot   { animation: none; }
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0b0c0e]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-md bg-[#111214] border border-[#2a2d31] flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <path d="M5 22c5-1 5-8 10-8s5 5 9 3 2-6 5-8" stroke="#e33b63" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-display font-bold text-sm text-white tracking-tight">YourLeft</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-[#8d8d92]">
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link
              href="/run"
              className="text-white font-medium flex items-center gap-1.5 hover:text-[#f3a1b5] transition-colors"
            >
              Web demo <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#8d8d92] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#e33b63] rounded"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#0b0c0e] px-6 py-6 space-y-4 text-sm text-[#aaa9ac]">
            <a href="#how" onClick={() => setMobileMenuOpen(false)} className="block hover:text-white py-1.5">How it works</a>
            <Link href="/privacy" onClick={() => setMobileMenuOpen(false)} className="block hover:text-white py-1.5">Privacy</Link>
            <Link href="/run" onClick={() => setMobileMenuOpen(false)} className="block text-[#f3a1b5] py-1.5 flex items-center gap-1.5">
              Web demo <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-center pt-14 overflow-hidden">
        {/* Route ribbon */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
        >
          <svg
            viewBox="0 0 1200 600"
            className="absolute inset-0 w-full h-full opacity-20"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
          >
            <path
              className="route-path"
              d="M -50 520
                 C 80 490, 120 420, 200 390
                 C 280 360, 310 300, 400 270
                 C 490 240, 520 190, 600 170
                 C 680 150, 710 110, 800 95
                 C 890 80, 920 120, 1010 100
                 C 1080 85, 1130 60, 1250 40"
              stroke="#e33b63"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle className="route-dot" cx="1232" cy="43" r="5" fill="#f3a1b5" />
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 w-full">
          {/* Live pace badge */}
          <div className="inline-flex items-center gap-3 text-xs font-mono text-[#6e7278] tracking-widest mb-10">
            <span className="route-dot w-1.5 h-1.5 rounded-full bg-[#e33b63] block" />
            ACTIVE &nbsp;·&nbsp; {mins}:{secs} &nbsp;·&nbsp; 5.42 KM
          </div>

          {/* Headline */}
          <h1
            className="font-display font-extrabold tracking-tight leading-[0.9] text-left text-white"
            style={{ fontSize: 'clamp(3.5rem, 13vw, 11.5rem)' }}
          >
            Your run,
            <br />
            <span className="text-[#e33b63]">replayed.</span>
          </h1>

          <p className="mt-8 text-base sm:text-lg text-[#6e7278] max-w-sm leading-relaxed">
            YourLeft turns your outdoor GPS track into a living 3D miniature world.
            Phone in your pocket. No account. No cloud.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <a
              href="#download"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#e33b63] hover:bg-[#d62954] active:scale-[0.97] text-white text-sm font-semibold transition-all"
            >
              <Download className="w-4 h-4" />
              Get Android Beta
            </a>
            <Link
              href="/run"
              className="text-sm text-[#8d8d92] hover:text-white transition-colors flex items-center gap-1.5"
            >
              Try web demo <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-16 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#383b3f]">
            <span>No account</span>
            <span>·</span>
            <span>On-device only</span>
            <span>·</span>
            <span>Zero trackers</span>
            <span>·</span>
            <span>200m endpoint masking</span>
          </div>
        </div>
      </section>

      {/* ── KM 01 ───────────────────────────────────────────────── */}
      <section id="how" className="py-28 sm:py-36 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div>
            <div className="text-[#e33b63] font-mono text-[11px] tracking-widest mb-8">KM 01 ——————</div>
            <h2
              className="font-display font-extrabold tracking-tight leading-[0.9] text-white"
              style={{ fontSize: 'clamp(2.5rem, 7vw, 6rem)' }}
            >
              Phone<br />away.<br />Still<br />recording.
            </h2>
            <p className="mt-8 text-base text-[#6e7278] leading-relaxed max-w-sm">
              An Android foreground service keeps GPS alive through a locked screen.
              YourLeft won&apos;t interrupt your run with notifications, battery warnings, or pauses.
            </p>
          </div>

          <div className="rounded-2xl bg-[#0e1012] border border-[#1a1d20] overflow-hidden aspect-square flex items-center justify-center relative">
            <svg viewBox="0 0 200 240" className="w-1/2 opacity-50" fill="none" aria-hidden="true">
              <rect x="55" y="10" width="90" height="160" rx="10" stroke="#2a2d31" strokeWidth="1.5" />
              <rect x="63" y="20" width="74" height="120" rx="5" fill="#0b0c0e" />
              <line x1="75" y1="170" x2="125" y2="170" stroke="#2a2d31" strokeWidth="1.5" />
              <circle cx="100" cy="183" r="6" stroke="#2a2d31" strokeWidth="1.5" />
              <path
                d="M 68 72 L 80 62 L 88 69 L 100 55 L 112 65 L 122 58 L 132 68"
                stroke="#e33b63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
            <div className="absolute bottom-6 left-6 right-6">
              <div className="bg-[#0b0c0e] border border-[#2a2d31] rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-[11px] text-[#6e7278] font-mono tracking-wider">FOREGROUND SERVICE</span>
                <span className="route-dot w-2 h-2 rounded-full bg-[#e33b63] block" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── KM 02 ───────────────────────────────────────────────── */}
      <section className="py-28 sm:py-36 border-t border-white/5 bg-[#0e1012]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div className="lg:order-2">
            <div className="text-[#e33b63] font-mono text-[11px] tracking-widest mb-8">KM 02 ——————</div>
            <h2
              className="font-display font-extrabold tracking-tight leading-[0.9] text-white"
              style={{ fontSize: 'clamp(2.5rem, 7vw, 6rem)' }}
            >
              Tap finish.<br />World<br />builds.
            </h2>
            <p className="mt-8 text-base text-[#6e7278] leading-relaxed max-w-sm">
              The moment you stop, OpenStreetMap road networks and building footprints
              are pulled and assembled into a 3D diorama of exactly where you ran.
            </p>
          </div>

          <div className="lg:order-1 rounded-2xl bg-[#111214] border border-[#1a1d20] overflow-hidden aspect-square flex items-center justify-center relative">
            <svg viewBox="0 0 220 220" className="w-3/4 opacity-55" fill="none" aria-hidden="true">
              {/* isometric buildings */}
              <polygon points="30,110 65,92 65,130 30,148" fill="#1a1c1f" stroke="#252829" strokeWidth="1" />
              <polygon points="65,92 100,110 100,148 65,130" fill="#141618" stroke="#252829" strokeWidth="1" />
              <polygon points="30,110 65,92 100,110 65,128" fill="#222527" stroke="#252829" strokeWidth="1" />

              <polygon points="90,88 125,70 125,108 90,126" fill="#1a1c1f" stroke="#252829" strokeWidth="1" />
              <polygon points="125,70 160,88 160,126 125,108" fill="#141618" stroke="#252829" strokeWidth="1" />
              <polygon points="90,88 125,70 160,88 125,106" fill="#222527" stroke="#252829" strokeWidth="1" />

              <polygon points="45,145 80,127 80,165 45,183" fill="#1a1c1f" stroke="#252829" strokeWidth="1" />
              <polygon points="80,127 115,145 115,183 80,165" fill="#141618" stroke="#252829" strokeWidth="1" />
              <polygon points="45,145 80,127 115,145 80,163" fill="#222527" stroke="#252829" strokeWidth="1" />

              <path
                d="M 10 180 C 50 164 75 140 110 112 C 145 84 170 72 210 55"
                stroke="#e33b63" strokeWidth="2.5" strokeLinecap="round" fill="none"
              />
            </svg>
            <div className="absolute top-6 left-6">
              <div className="bg-[#0b0c0e] border border-[#e33b63]/30 rounded-lg px-3 py-2 text-[11px] font-mono text-[#f3a1b5]">
                OSM + ENU synthesis
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── KM 03 ───────────────────────────────────────────────── */}
      <section className="py-28 sm:py-36 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div>
            <div className="text-[#e33b63] font-mono text-[11px] tracking-widest mb-8">KM 03 ——————</div>
            <h2
              className="font-display font-extrabold tracking-tight leading-[0.9] text-white"
              style={{ fontSize: 'clamp(2.5rem, 7vw, 6rem)' }}
            >
              Watch your<br />city in<br />miniature.
            </h2>
            <p className="mt-8 text-base text-[#6e7278] leading-relaxed max-w-sm">
              Fly through your route in Follow, Orbit, or Overview.
              Adjust speed 1× to 8×. Export a transparent sticker,
              animated GIF, or full video story.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {['Follow Mode', '360° Orbit', 'Top-Down', '1× – 8× speed'].map((tag) => (
                <span key={tag} className="px-3 py-1.5 rounded-full text-xs border border-[#2a2d31] text-[#6e7278]">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-[#111214] border border-[#1a1d20] overflow-hidden aspect-square">
            {/* oxlint-disable next/no-img-element */}
            <img
              src="/yourleft-feature.svg"
              alt="YourLeft 3D route rendered through a miniature city"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Filmstrip ───────────────────────────────────────────── */}
      <section className="py-20 border-t border-white/5 bg-[#0e1012] overflow-hidden" aria-hidden="true">
        <div className="relative">
          <div className="filmstrip-track flex gap-5 w-max">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="w-72 h-44 rounded-xl overflow-hidden bg-[#111214] border border-[#1a1d20] shrink-0"
              >
                {/* oxlint-disable next/no-img-element */}
                <img
                  src="/yourleft-feature.svg"
                  alt=""
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: `${(i * 18) % 100}% 50%`,
                    filter: `brightness(${0.6 + (i % 4) * 0.1})`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Finish Line / Download ──────────────────────────────── */}
      <section id="download" className="py-28 sm:py-36 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
          <div className="flex items-center gap-4 mb-10">
            <span className="w-12 border-t border-[#e33b63]" />
            <span className="text-[#e33b63] font-mono text-[11px] tracking-widest">FINISH</span>
          </div>

          <h2
            className="font-display font-extrabold tracking-tight leading-[0.9] text-white"
            style={{ fontSize: 'clamp(3rem, 10vw, 9rem)' }}
          >
            Same roads.
            <br />
            <span className="text-[#e33b63]">Clearer you.</span>
          </h2>

          <div className="mt-14 grid grid-cols-3 gap-8 max-w-xs">
            <div>
              <div className="text-4xl font-display font-extrabold text-white tabular-nums">0</div>
              <div className="text-[11px] text-[#4a4d52] mt-1 leading-tight">accounts<br />needed</div>
            </div>
            <div>
              <div className="text-4xl font-display font-extrabold text-white tabular-nums">0</div>
              <div className="text-[11px] text-[#4a4d52] mt-1 leading-tight">data sent<br />to servers</div>
            </div>
            <div>
              <div className="text-4xl font-display font-extrabold text-[#e33b63]">∞</div>
              <div className="text-[11px] text-[#4a4d52] mt-1 leading-tight">runs<br />recorded</div>
            </div>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-start gap-4">
            <button
              type="button"
              onClick={() => alert('YourLeft is currently in private beta. Try the web demo!')}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-[#e33b63] hover:bg-[#d62954] active:scale-[0.97] text-white text-sm font-semibold transition-all"
            >
              <Download className="w-4 h-4" />
              Get Android Beta — Free
            </button>
            <Link
              href="/run"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg border border-[#2a2d31] hover:border-[#383b3f] text-[#f5f5f5] text-sm font-semibold transition-all group"
            >
              Launch Web Demo
              <ArrowRight className="w-4 h-4 text-[#e33b63] group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <p className="mt-5 text-xs text-[#383b3f]">Android 14+ · iOS in testing · No credit card</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-[#090a0c] py-12">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-10">
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-3">
              <div className="w-6 h-6 rounded-md bg-[#111214] border border-[#2a2d31] flex items-center justify-center">
                <svg className="w-3.5 h-3.5" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <path d="M5 22c5-1 5-8 10-8s5 5 9 3 2-6 5-8" stroke="#e33b63" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="font-display font-bold text-sm text-white">YourLeft</span>
            </Link>
            <p className="text-[11px] text-[#383b3f] max-w-xs leading-relaxed">
              Map data © OpenStreetMap contributors, ODbL 1.0.{' '}
              3D engine: Three.js &amp; MapLibre.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-xs text-[#6e7278]">
            <Link href="/run" className="hover:text-white transition-colors">3D Demo</Link>
            <Link href="/privacy" className="hover:text-[#f3a1b5] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <a href="mailto:support@yourleft.run" className="hover:text-white transition-colors">support@yourleft.run</a>
          </nav>

          <p className="text-[11px] text-[#2a2d31] sm:text-right">© 2026 YourLeft</p>
        </div>
      </footer>
    </div>
  );
}
