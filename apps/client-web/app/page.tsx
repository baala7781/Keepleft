'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  Smartphone,
  Layers,
  Camera,
  Share2,
  Sparkles,
  Lock,
  CheckCircle2,
  Download,
  ChevronRight,
  Compass,
  Activity,
  Menu,
  X,
} from 'lucide-react';

export default function MarketingLandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'replay' | 'stickers' | 'privacy'>('replay');

  return (
    <div className="min-h-screen bg-[#0b0c0e] text-[#f5f5f5] font-sans antialiased selection:bg-[#e33b63] selection:text-white relative overflow-x-hidden">
      {/* Decorative Scroll Progress Bar (Accessible: aria-hidden, composited transform, prefers-reduced-motion respected) */}
      <div
        id="scroll-progress"
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#e33b63] via-[#ff6b8b] to-[#f3a1b5] z-50 origin-left scale-x-0"
        style={{
          animation: 'grow-progress auto linear',
          animationTimeline: 'scroll()',
        }}
      />

      {/* Global Header / Navbar */}
      <header className="sticky top-0 z-40 border-b border-[#202326] bg-[#0b0c0e]/80 backdrop-blur-lg transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo & Logotype */}
          <Link href="/" className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e33b63] rounded-lg p-1">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#1d1f22] to-[#111214] border border-[#383b3f] flex items-center justify-center overflow-hidden shadow-inner group-hover:border-[#e33b63]/60 transition-colors">
              <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="6" fill="#0b0c0e" />
                <path d="M5 22c5-1 5-8 10-8s5 5 9 3 2-6 5-8" stroke="#e33b63" strokeWidth="3" strokeLinecap="round" />
                <circle cx="5" cy="22" r="2.5" fill="#f3a1b5" />
                <circle cx="29" cy="9" r="2.5" fill="#f3a1b5" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-xl tracking-tight text-white group-hover:text-[#f3a1b5] transition-colors">
                YourLeft
              </span>
              <span className="text-[11px] font-medium tracking-widest uppercase text-[#8d8d92]">
                In Motion
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#aaa9ac]">
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#experience" className="hover:text-white transition-colors">
              Experience
            </a>
            <a href="#showcase" className="hover:text-white transition-colors">
              Features
            </a>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link
              href="/run"
              className="inline-flex items-center gap-1.5 text-[#f3a1b5] hover:text-white transition-colors"
            >
              <Compass className="w-4 h-4 text-[#e33b63]" />
              Web Demo
            </Link>
          </nav>

          {/* Header Action Button */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="#download"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-[#e33b63] hover:bg-[#c92f54] active:scale-[0.98] text-white shadow-lg shadow-[#e33b63]/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3a1b5]"
            >
              <Download className="w-4 h-4" />
              Get Android Beta
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#aaa9ac] hover:text-white hover:bg-[#1d1f22] focus:outline-none focus:ring-2 focus:ring-[#e33b63]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#202326] bg-[#0b0c0e] px-4 py-6 space-y-4">
            <nav className="flex flex-col space-y-3 text-base font-medium text-[#aaa9ac]">
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-white py-1"
              >
                How It Works
              </a>
              <a
                href="#experience"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-white py-1"
              >
                Experience
              </a>
              <a
                href="#showcase"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-white py-1"
              >
                Features
              </a>
              <Link
                href="/privacy"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-white py-1"
              >
                Privacy Policy
              </Link>
              <Link
                href="/run"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#f3a1b5] py-1 flex items-center gap-2"
              >
                <Compass className="w-4 h-4 text-[#e33b63]" />
                Explore Web Demo
              </Link>
            </nav>
            <div className="pt-4 border-t border-[#202326]">
              <a
                href="#download"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-base font-semibold bg-[#e33b63] text-white shadow-lg"
              >
                <Download className="w-4 h-4" />
                Get Android Beta
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-32 overflow-hidden">
        {/* Ambient Glow Elements */}
        <div
          aria-hidden="true"
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] sm:w-[900px] h-[500px] bg-gradient-to-b from-[#e33b63]/15 via-[#8d2648]/10 to-transparent blur-3xl pointer-events-none rounded-full"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Pill Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#111214] border border-[#2a2d31] text-[#f3a1b5] shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#e33b63] animate-pulse" />
              Android Beta Now Available · 100% Private &amp; On-Device
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight font-display text-white leading-[1.08]">
              Your run, replayed as a{' '}
              <span className="bg-gradient-to-r from-white via-[#f3a1b5] to-[#e33b63] bg-clip-text text-transparent">
                living miniature world.
              </span>
            </h1>

            {/* Subhead */}
            <p className="text-lg sm:text-xl text-[#aaa9ac] leading-relaxed max-w-2xl mx-auto">
              Keep your phone tucked away while you move. YourLeft turns your outdoor runs, walks,
              and rides into a stylized 3D miniature world with real terrain, buildings, and tree canopies.
            </p>

            {/* Dual Call to Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <a
                href="#download"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-base font-bold bg-[#e33b63] hover:bg-[#c92f54] active:scale-[0.98] text-white shadow-xl shadow-[#e33b63]/25 transition-all group"
              >
                <Download className="w-5 h-5 text-white" />
                <span>Download on Google Play</span>
                <span className="text-xs font-normal opacity-80 px-2 py-0.5 rounded bg-black/20">
                  Android Beta
                </span>
              </a>

              <Link
                href="/run"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl text-base font-semibold bg-[#16181b] hover:bg-[#202327] border border-[#2e3236] text-[#f5f5f5] transition-all group hover:border-[#383b3f]"
              >
                <span>Explore the 3D Experience</span>
                <ArrowRight className="w-4 h-4 text-[#e33b63] transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Reassurance Micro-Badges */}
            <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 pt-3 text-xs text-[#8d8d92]">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#e33b63]" /> No account required
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#e33b63]" /> On-device SQLite storage
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#e33b63]" /> Zero advertising trackers
              </span>
            </div>
          </div>

          {/* Hero Visual Composition */}
          <div className="mt-16 sm:mt-20 relative max-w-5xl mx-auto">
            {/* Ambient Base Shadow */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0e] via-transparent to-transparent z-10 pointer-events-none" />

            {/* Main Stage Frame */}
            <div className="relative rounded-2xl sm:rounded-3xl border border-[#2a2d31] bg-[#111214] p-3 sm:p-4 shadow-2xl overflow-hidden group">
              {/* Browser/Window Header Pill */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#202326] mb-3 text-xs text-[#8d8d92]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#202326]" />
                  <span className="w-3 h-3 rounded-full bg-[#202326]" />
                  <span className="w-3 h-3 rounded-full bg-[#202326]" />
                  <span className="ml-2 font-mono text-[11px] text-[#6d7075]">
                    yourleft.run · 3D miniature diorama
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-[#e33b63]">
                  <span>LIVE REPLAY ENGINE</span>
                </div>
              </div>

              {/* Central Graphic Container */}
              <div className="relative aspect-[16/9] sm:aspect-[2/1] rounded-xl overflow-hidden bg-[#090a0c]">
                {/* Official Store Artwork SVG Render */}
                {/* oxlint-disable next/no-img-element */}
                <img
                  src="/yourleft-feature.svg"
                  alt="YourLeft 3D route replayed through a dark stylized miniature landscape"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                />

                {/* Floating Telemetry Badge 1: Workout Stats (Top Left) */}
                <div className="absolute top-4 left-4 sm:top-6 sm:left-6 p-3 sm:p-4 rounded-xl bg-[#0b0c0e]/85 backdrop-blur-md border border-[#2a2d31] shadow-xl text-left pointer-events-none">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#f3a1b5] uppercase tracking-wider mb-1">
                    <Activity className="w-3.5 h-3.5 text-[#e33b63]" />
                    Morning Run · 6.42 km
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-xl sm:text-2xl font-bold text-white">
                      30:48
                    </span>
                    <span className="text-xs text-[#8d8d92]">
                      Pace <strong className="text-white font-medium">4:48 /km</strong>
                    </span>
                    <span className="text-xs text-[#8d8d92]">
                      Elevation <strong className="text-white font-medium">+84 m</strong>
                    </span>
                  </div>
                </div>

                {/* Floating Telemetry Badge 2: Director Camera Mode (Bottom Right) */}
                <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 p-3 sm:p-4 rounded-xl bg-[#0b0c0e]/85 backdrop-blur-md border border-[#2a2d31] shadow-xl text-left pointer-events-none flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1d1f22] flex items-center justify-center text-[#e33b63] border border-[#383b3f]">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-[#aaa9ac] uppercase tracking-wider">
                      Camera Director
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#e33b63]" />
                      Follow Mode · 60 FPS
                    </div>
                  </div>
                </div>

                {/* Floating Telemetry Badge 3: Privacy Shield (Top Right) */}
                <div className="hidden sm:flex absolute top-6 right-6 px-3 py-1.5 rounded-lg bg-[#0b0c0e]/85 backdrop-blur-md border border-[#2a2d31] shadow-xl items-center gap-2 text-xs text-[#f3a1b5] pointer-events-none">
                  <Shield className="w-3.5 h-3.5 text-[#e33b63]" />
                  <span>Start &amp; Finish Masked (200m)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Introduction Section */}
      <section id="experience" className="py-20 sm:py-28 border-t border-[#1a1d20] bg-[#0e1012]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Narrative Column */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#e33b63]">
                The Philosophy
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight leading-tight">
                Running is about being present. Not staring at a screen.
              </h2>
              <div className="space-y-4 text-base text-[#aaa9ac] leading-relaxed">
                <p>
                  Most modern fitness apps turn running into a feed of notifications, battery drain,
                  and flat 2D lines drawn over generic map grids. Worse, they hoard your private routes
                  and coordinates on corporate cloud servers.
                </p>
                <p>
                  <strong className="text-white">YourLeft takes the opposite path.</strong> Put the
                  phone in your pocket and run. When you come back, your route is synthesized into an
                  atmospheric 3D miniature diorama — complete with hills, building outlines, and canopies.
                </p>
              </div>

              {/* Three Value Pillars */}
              <div className="pt-2 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-[#1d1f22] flex items-center justify-center text-[#e33b63] border border-[#383b3f] shrink-0 mt-0.5">
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Phone-Away Outdoor Recording</h4>
                    <p className="text-xs text-[#8d8d92]">
                      Android foreground service keeps recording through locked screens. No accidental pauses, no battery waste.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-[#1d1f22] flex items-center justify-center text-[#e33b63] border border-[#383b3f] shrink-0 mt-0.5">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Living 3D Geodata</h4>
                    <p className="text-xs text-[#8d8d92]">
                      Real OpenStreetMap road networks, building footprints, and elevation terrain mesh into a bespoke miniature world.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-[#1d1f22] flex items-center justify-center text-[#e33b63] border border-[#383b3f] shrink-0 mt-0.5">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">True On-Device Privacy</h4>
                    <p className="text-xs text-[#8d8d92]">
                      Zero accounts. Zero cloud databases. Your GPS data never leaves your device unless you deliberately share a story.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Interactive Comparison Card */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-[#2a2d31] bg-[#111214] p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-[#202326] pb-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#8d8d92]">
                      Architecture Comparison
                    </span>
                    <h3 className="text-xl font-bold text-white font-display">
                      Conventional Running Apps vs. YourLeft
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#e33b63]/15 text-[#f3a1b5] border border-[#e33b63]/30">
                    A Cleaner Choice
                  </span>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-[#0b0c0e] border border-[#202326] space-y-2">
                      <div className="text-xs font-bold text-[#8d8d92] uppercase tracking-wider">
                        Typical Running App
                      </div>
                      <ul className="space-y-2 text-xs text-[#6e7278]">
                        <li className="flex items-start gap-2">
                          <span className="text-red-500 font-bold">✕</span> Flat, static 2D polylines on satellite maps
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-500 font-bold">✕</span> Requires email, password, and public profile
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-500 font-bold">✕</span> Coordinates harvested for advertising telemetry
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-500 font-bold">✕</span> Cluttered social feeds and distraction loops
                        </li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-[#16181b] border border-[#e33b63]/30 space-y-2 shadow-inner">
                      <div className="text-xs font-bold text-[#f3a1b5] uppercase tracking-wider flex items-center justify-between">
                        <span>YourLeft</span>
                        <Sparkles className="w-3.5 h-3.5 text-[#e33b63]" />
                      </div>
                      <ul className="space-y-2 text-xs text-[#e0e2e3]">
                        <li className="flex items-start gap-2">
                          <span className="text-[#e33b63] font-bold">✓</span> Atmospheric 3D miniature world diorama
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#e33b63] font-bold">✓</span> Zero accounts; open immediately and run
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#e33b63] font-bold">✓</span> Stored locally in private SQLite/IndexedDB
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#e33b63] font-bold">✓</span> Automatic 200m start/end home privacy masking
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-[#8d8d92]">
                  <span>Your movement becomes an experience you own.</span>
                  <Link href="/privacy" className="text-[#f3a1b5] hover:underline flex items-center gap-1">
                    Read our privacy principles <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 sm:py-28 border-t border-[#1a1d20]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#e33b63]">
              Simple &amp; Seamless
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold font-display text-white tracking-tight">
              Four steps from stride to story.
            </h2>
            <p className="text-base sm:text-lg text-[#aaa9ac]">
              No complicated setups. No profile verifications. Just lace up and go.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-[#111214] border border-[#202326] hover:border-[#383b3f] transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#e33b63] px-2 py-0.5 rounded bg-[#e33b63]/10">
                    STEP 01
                  </span>
                  <Smartphone className="w-5 h-5 text-[#8d8d92] group-hover:text-[#f3a1b5] transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-white font-display">Move Outdoors</h3>
                <p className="text-xs text-[#aaa9ac] leading-relaxed">
                  Start a walk, run, or cycle. YourLeft utilizes high-accuracy GPS with an ongoing Android
                  notification, continuing tracking reliably even with the screen off.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#202326] text-[11px] text-[#8d8d92]">
                Locked-screen persistence
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-[#111214] border border-[#202326] hover:border-[#383b3f] transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#e33b63] px-2 py-0.5 rounded bg-[#e33b63]/10">
                    STEP 02
                  </span>
                  <Layers className="w-5 h-5 text-[#8d8d92] group-hover:text-[#f3a1b5] transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-white font-display">Synthesize the World</h3>
                <p className="text-xs text-[#aaa9ac] leading-relaxed">
                  When you tap finish, the hybrid engine queries OpenStreetMap vector footprints and elevation contours,
                  procedurally generating the 3D neighborhood you traversed.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#202326] text-[11px] text-[#8d8d92]">
                OSM 3D geometry &amp; terrain
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-[#111214] border border-[#202326] hover:border-[#383b3f] transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#e33b63] px-2 py-0.5 rounded bg-[#e33b63]/10">
                    STEP 03
                  </span>
                  <Camera className="w-5 h-5 text-[#8d8d92] group-hover:text-[#f3a1b5] transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-white font-display">Cinematic Replay</h3>
                <p className="text-xs text-[#aaa9ac] leading-relaxed">
                  Relive your pace and elevation changes. Switch smoothly between third-person Follow, 360° Orbit,
                  and bird&apos;s-eye Overview cameras at 1× to 8× playback speeds.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#202326] text-[11px] text-[#8d8d92]">
                Dynamic camera director
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl bg-[#111214] border border-[#202326] hover:border-[#383b3f] transition-all flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#e33b63] px-2 py-0.5 rounded bg-[#e33b63]/10">
                    STEP 04
                  </span>
                  <Share2 className="w-5 h-5 text-[#8d8d92] group-hover:text-[#f3a1b5] transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-white font-display">Share &amp; Protect</h3>
                <p className="text-xs text-[#aaa9ac] leading-relaxed">
                  Export transparent route PNG stickers, animated GIFs, or photo stories for Instagram and WhatsApp.
                  YourLeft automatically obscures the first and last 200m to guard your home.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#202326] text-[11px] text-[#8d8d92]">
                Endpoint privacy cloaking
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Showcase Section */}
      <section id="showcase" className="py-20 sm:py-28 border-t border-[#1a1d20] bg-[#0e1012]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#e33b63]">
              Technical Craftsmanship
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold font-display text-white tracking-tight">
              Engineered for runners, designed for clarity.
            </h2>
            <p className="text-base sm:text-lg text-[#aaa9ac]">
              Explore the core architectural breakthroughs that set YourLeft apart.
            </p>
          </div>

          {/* Interactive Feature Showcase Tabs */}
          <div className="max-w-4xl mx-auto">
            {/* Tab Buttons */}
            <div className="flex p-1.5 rounded-xl bg-[#111214] border border-[#202326] gap-1 mb-8">
              <button
                type="button"
                onClick={() => setActiveTab('replay')}
                className={`flex-1 py-3 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'replay'
                    ? 'bg-[#1d1f22] text-white shadow-md border border-[#383b3f]'
                    : 'text-[#8d8d92] hover:text-[#f5f5f5]'
                }`}
              >
                <Camera className="w-4 h-4 text-[#e33b63]" />
                Cinematic 3D Engine
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('stickers')}
                className={`flex-1 py-3 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'stickers'
                    ? 'bg-[#1d1f22] text-white shadow-md border border-[#383b3f]'
                    : 'text-[#8d8d92] hover:text-[#f5f5f5]'
                }`}
              >
                <Share2 className="w-4 h-4 text-[#e33b63]" />
                Story Studio &amp; Stickers
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('privacy')}
                className={`flex-1 py-3 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'privacy'
                    ? 'bg-[#1d1f22] text-white shadow-md border border-[#383b3f]'
                    : 'text-[#8d8d92] hover:text-[#f5f5f5]'
                }`}
              >
                <Shield className="w-4 h-4 text-[#e33b63]" />
                Zero-Knowledge Privacy
              </button>
            </div>

            {/* Tab 1: Cinematic 3D Engine */}
            {activeTab === 'replay' && (
              <div className="rounded-2xl border border-[#2a2d31] bg-[#111214] p-6 sm:p-10 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <span className="text-xs font-mono text-[#f3a1b5] uppercase tracking-wider">
                      Hybrid MapLibre + Three.js
                    </span>
                    <h3 className="text-2xl font-bold font-display text-white">
                      Floating-Origin Precision with 60 FPS Replay
                    </h3>
                    <p className="text-sm text-[#aaa9ac] leading-relaxed">
                      YourLeft solves the classic GPS rendering problem: double-precision latitude/longitude
                      causes GPU jitter when transformed into standard 32-bit floats.
                    </p>
                    <p className="text-sm text-[#aaa9ac] leading-relaxed">
                      Our custom East-North-Up (ENU) floating origin recalculates coordinates locally around your route,
                      delivering rock-solid camera smoothness and butter-smooth animation across long runs and marathons.
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 rounded-md text-xs bg-[#1d1f22] border border-[#383b3f] text-[#f5f5f5]">
                        Follow Mode
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-xs bg-[#1d1f22] border border-[#383b3f] text-[#f5f5f5]">
                        360° Orbit
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-xs bg-[#1d1f22] border border-[#383b3f] text-[#f5f5f5]">
                        Top-Down Overview
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-xs bg-[#1d1f22] border border-[#383b3f] text-[#f5f5f5]">
                        1× – 8× Speed
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-[#202326] bg-[#090a0c] p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#8d8d92]">
                      <span className="font-mono">CAMERA_TELEMETRY.LOG</span>
                      <span className="text-[#e33b63]">SMOOTHED_ENU</span>
                    </div>
                    <div className="aspect-video bg-[#111214] rounded-lg border border-[#202326] flex flex-col justify-center items-center p-6 text-center space-y-2 relative overflow-hidden">
                      <div className="w-12 h-12 rounded-full bg-[#e33b63]/20 flex items-center justify-center text-[#e33b63]">
                        <Camera className="w-6 h-6" />
                      </div>
                      <span className="font-display font-semibold text-white text-sm">
                        Experience the Engine Live
                      </span>
                      <p className="text-xs text-[#8d8d92]">
                        Launch the real WebGL world right in your browser with bundled demo terrain.
                      </p>
                      <Link
                        href="/run"
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#e33b63] text-white hover:bg-[#c92f54]"
                      >
                        Try Web Demo <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Story Studio */}
            {activeTab === 'stickers' && (
              <div className="rounded-2xl border border-[#2a2d31] bg-[#111214] p-6 sm:p-10 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <span className="text-xs font-mono text-[#f3a1b5] uppercase tracking-wider">
                      Story Studio &amp; Social Exports
                    </span>
                    <h3 className="text-2xl font-bold font-display text-white">
                      Transparent PNG Stickers for Instagram &amp; WhatsApp
                    </h3>
                    <p className="text-sm text-[#aaa9ac] leading-relaxed">
                      Say goodbye to bulky screenshots that cover your photos. Story Studio renders your exact
                      crimson route with distance, pace, and time into a clean, transparent PNG sticker.
                    </p>
                    <p className="text-sm text-[#aaa9ac] leading-relaxed">
                      Copy directly to your clipboard or save to your photo library. Overlay it onto any photo in
                      your favorite social app with complete creative freedom.
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 rounded-md text-xs bg-[#1d1f22] border border-[#383b3f] text-[#f5f5f5]">
                        Transparent Alpha PNG
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-xs bg-[#1d1f22] border border-[#383b3f] text-[#f5f5f5]">
                        Animated Route GIFs
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-xs bg-[#1d1f22] border border-[#383b3f] text-[#f5f5f5]">
                        Photo Video Stories
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-[#202326] bg-[#090a0c] p-6 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#1d1f22] to-[#111214] border border-[#383b3f] flex items-center justify-center text-[#e33b63]">
                      <Share2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-white text-base">
                        Direct-to-Clipboard Flow
                      </h4>
                      <p className="text-xs text-[#8d8d92] mt-1 max-w-xs mx-auto">
                        Render transparent alpha route → Tap Copy → Paste directly into Instagram or WhatsApp story editor.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#111214] border border-[#202326] text-xs font-mono text-[#f3a1b5]">
                      1-Tap Copy Sticker
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Zero-Knowledge Privacy */}
            {activeTab === 'privacy' && (
              <div className="rounded-2xl border border-[#2a2d31] bg-[#111214] p-6 sm:p-10 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <span className="text-xs font-mono text-[#f3a1b5] uppercase tracking-wider">
                      On-Device Custody
                    </span>
                    <h3 className="text-2xl font-bold font-display text-white">
                      Your Coordinates Never Leave Your Device
                    </h3>
                    <p className="text-sm text-[#aaa9ac] leading-relaxed">
                      YourLeft was architected from line one with absolute respect for privacy. There are no
                      user accounts, no logins, no identity profiles, and no remote coordinate databases.
                    </p>
                    <p className="text-sm text-[#aaa9ac] leading-relaxed">
                      Social exports automatically hide the first and last 200 metres of your route, protecting
                      your home or workplace from being triangulated.
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 rounded-md text-xs bg-[#1d1f22] border border-[#383b3f] text-[#f5f5f5]">
                        Auto 200m End-Cloak
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-xs bg-[#1d1f22] border border-[#383b3f] text-[#f5f5f5]">
                        Local SQLite Sandbox
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-xs bg-[#1d1f22] border border-[#383b3f] text-[#f5f5f5]">
                        Export to GeoJSON
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-[#202326] bg-[#090a0c] p-6 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#1d1f22] to-[#111214] border border-[#383b3f] flex items-center justify-center text-[#e33b63]">
                      <Shield className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-white text-base">
                        Total Data Sovereignty
                      </h4>
                      <p className="text-xs text-[#8d8d92] mt-1 max-w-xs mx-auto">
                        Delete individual runs or wipe all data with one tap in settings. You own your telemetry completely.
                      </p>
                    </div>
                    <Link
                      href="/privacy"
                      className="inline-flex items-center gap-1.5 text-xs text-[#f3a1b5] hover:underline"
                    >
                      Read full Privacy Policy <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Closing Call to Action Banner */}
      <section id="download" className="py-20 sm:py-32 relative overflow-hidden">
        {/* Ambient Glow */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-transparent via-[#e33b63]/10 to-transparent blur-3xl pointer-events-none"
        />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="rounded-3xl border border-[#2a2d31] bg-gradient-to-b from-[#16181b] to-[#0e1012] p-8 sm:p-14 text-center space-y-8 shadow-2xl">
            {/* Mark Icon */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#1d1f22] to-[#111214] border border-[#383b3f] flex items-center justify-center shadow-lg">
              <svg className="w-9 h-9" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="6" fill="#0b0c0e" />
                <path d="M5 22c5-1 5-8 10-8s5 5 9 3 2-6 5-8" stroke="#e33b63" strokeWidth="3" strokeLinecap="round" />
                <circle cx="5" cy="22" r="2.5" fill="#f3a1b5" />
                <circle cx="29" cy="9" r="2.5" fill="#f3a1b5" />
              </svg>
            </div>

            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="text-xs font-semibold uppercase tracking-widest text-[#f3a1b5]">
                SAME ROADS. A CLEARER YOU.
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold font-display text-white tracking-tight leading-tight">
                Ready to experience your run in 3D?
              </h2>
              <p className="text-sm sm:text-base text-[#aaa9ac]">
                Download YourLeft for Android today and turn your everyday routes into living miniature worlds.
                Free, private, and requiring zero account setup.
              </p>
            </div>

            {/* CTAs in Banner */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => alert('YourLeft is currently in private beta review. You can explore the live 3D web experience right now via the Web Demo button!')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-base font-bold bg-[#e33b63] hover:bg-[#c92f54] active:scale-[0.98] text-white shadow-xl shadow-[#e33b63]/25 transition-all group"
              >
                <Download className="w-5 h-5 text-white" />
                <span>Get on Google Play</span>
                <span className="text-xs font-normal opacity-80 px-2 py-0.5 rounded bg-black/20">
                  Free
                </span>
              </button>

              <Link
                href="/run"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl text-base font-semibold bg-[#111214] hover:bg-[#1d1f22] border border-[#2e3236] text-[#f5f5f5] transition-all"
              >
                <span>Launch Web Experience</span>
                <ArrowRight className="w-4 h-4 text-[#e33b63]" />
              </Link>
            </div>

            <p className="text-xs text-[#8d8d92]">
              Android 14+ supported · Apple iOS version in internal testing · No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Global Marketing Footer */}
      <footer className="border-t border-[#202326] bg-[#090a0c] text-sm text-[#8d8d92]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand Column */}
            <div className="space-y-4 md:col-span-2">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#111214] border border-[#383b3f] flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none">
                    <rect width="32" height="32" rx="4" fill="#0b0c0e" />
                    <path d="M5 22c5-1 5-8 10-8s5 5 9 3 2-6 5-8" stroke="#e33b63" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="font-display font-bold text-lg text-white">YourLeft</span>
              </Link>
              <p className="text-xs text-[#aaa9ac] leading-relaxed max-w-sm">
                Your movement, replayed as a living miniature world. High-precision GPS tracking with
                stylized 3D terrain and building synthesis. Private, on-device, and ad-free.
              </p>
              <p className="text-xs text-[#6e7278]">
                Map data © OpenStreetMap contributors, ODbL 1.0. 3D engine powered by Three.js &amp; MapLibre.
              </p>
            </div>

            {/* Experience Links */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Product</h4>
              <ul className="space-y-2 text-xs text-[#aaa9ac]">
                <li>
                  <Link href="/run" className="hover:text-white transition-colors">
                    3D World Demo
                  </Link>
                </li>
                <li>
                  <Link href="/stats" className="hover:text-white transition-colors">
                    Activity Stats
                  </Link>
                </li>
                <li>
                  <Link href="/app" className="hover:text-white transition-colors">
                    Web Journal
                  </Link>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-white transition-colors">
                    How It Works
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal & Trust Links */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Legal &amp; Trust</h4>
              <ul className="space-y-2 text-xs text-[#aaa9ac]">
                <li>
                  <Link href="/privacy" className="hover:text-[#f3a1b5] transition-colors font-medium">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Terms of Use
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-white transition-colors">
                    About &amp; Licenses
                  </Link>
                </li>
                <li>
                  <a href="mailto:support@yourleft.run" className="hover:text-white transition-colors">
                    support@yourleft.run
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-[#1a1d20] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6e7278]">
            <p>© 2026 YourLeft. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span>On-Device Architecture</span>
              <span>Zero-Tracker Guarantee</span>
              <a href="#top" className="hover:text-white transition-colors">
                Back to top ↑
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
