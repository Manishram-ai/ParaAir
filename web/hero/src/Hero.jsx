// The canvas layer of the hero: the floating files, the particle canvas, the paper plane, the story's small captions
// and the scroll hint. The timeline itself lives in engine.js.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import { layoutTiles } from "./layout.js";
import { startHero } from "./engine.js";
import { useHero } from "./store.js";
import { createSound } from "./sound.js";

const sound = createSound();

// Sound is on unless the reader turned it off before. It tries to start with the page; if the browser holds it back,
// the button says so and the first click, tap or key anywhere starts it. The button stays in the corner of the page.
function SoundButton() {
  const [state, setState] = useState({ on: sound.on, audible: sound.audible });
  useEffect(() => sound.subscribe(setState), []);
  useEffect(() => {
    let off = false;
    try { off = localStorage.getItem("airspace-sound") === "off"; } catch (e) { off = false; }
    if (!off) sound.toggle(true);
    const go = (e) => { if (e.target.closest && e.target.closest(".hx-sound")) return; sound.kick(); };
    const opts = { capture: true };
    window.addEventListener("pointerdown", go, opts); window.addEventListener("keydown", go, opts); window.addEventListener("touchend", go, opts);
    return () => { window.removeEventListener("pointerdown", go, opts); window.removeEventListener("keydown", go, opts); window.removeEventListener("touchend", go, opts); };
  }, []);
  const waiting = state.on && !state.audible;
  const click = () => { if (waiting) sound.kick(); else sound.toggle(!state.on); };
  const label = !state.on ? "Sound off" : waiting ? "Click for sound" : "Sound on";
  return createPortal(
    <button type="button" className={`hx-sound${state.on ? " is-on" : ""}${waiting ? " is-waiting" : ""}`} aria-pressed={state.on && !waiting} onClick={click}>
      <svg viewBox="0 0 20 20" aria-hidden="true"><path className="spk" d="M3.5 7.5h2.6L10 4.4v11.2l-3.9-3.1H3.5z" /><path className="wave w1" d="M12.6 7.6a3.3 3.3 0 0 1 0 4.8" /><path className="wave w2" d="M14.8 5.6a6.2 6.2 0 0 1 0 8.8" /><path className="mute" d="M12.8 7.8l4 4.4M16.8 7.8l-4 4.4" /></svg>
      <span className="hx-sound-bars" aria-hidden="true"><i /><i /><i /></span>
      <span>{label}</span>
    </button>,
    document.body,
  );
}

// The story's captions, one per chapter, like subtitles.
const CHAPTERS = [
  null,
  { k: "01", h: "Your work lives in your bucket.", p: "Footage, photos and projects, however big they get." },
  { k: "02", h: "AirSpace carries it to your Mac.", p: "Without downloading it first." },
  { k: "03", h: "It lands as a drive.", p: "Every file in Finder. Only the pieces you open come down." },
];

function Captions() {
  const chapter = useHero((s) => s.chapter || 0);
  const hint = useHero((s) => s.hint || 0);
  const c = CHAPTERS[chapter];
  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence mode="wait">
        {c && (
          <m.div key={c.k} className="hx-caption" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
            <b>{c.h}</b><em>{c.p}</em>
          </m.div>
        )}
      </AnimatePresence>
      <div className={`hx-hint${hint ? " is-on" : ""}`} aria-hidden="true">Scroll to follow the plane<svg viewBox="0 0 16 16"><path d="M8 2.5v10M3.8 8.6 8 12.8l4.2-4.2" /></svg></div>
    </LazyMotion>
  );
}

function Video({ tile }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  }, []);
  return <video ref={ref} src={tile.src} poster={tile.poster} muted loop playsInline autoPlay preload="auto" draggable={false} />;
}

const LINES = (n, from = 0) => Array.from({ length: n }, (_, i) => <i key={i + from} className={`ln ln-${(i + from) % 4}`} />);

function Doc({ tile }) {
  switch (tile.doc) {
    case "pdf":
      return (
        <div className="hx-doc hx-pdf">
          <b className="hx-pdf-title">Brand<br />guidelines</b>
          <span className="hx-swatches"><i /><i /><i /><i /></span>
          <span className="hx-lines">{LINES(5)}</span>
        </div>
      );
    case "sheet":
      return (
        <div className="hx-doc hx-sheet">
          {Array.from({ length: 42 }, (_, i) => <i key={i} className={i < 6 ? "h" : i % 6 === 0 ? "k" : (i * 7) % 5 === 0 ? "u" : ""} />)}
        </div>
      );
    case "wav":
      return (
        <div className="hx-doc hx-wav">
          <svg viewBox="0 0 120 40" preserveAspectRatio="none">
            {Array.from({ length: 60 }, (_, i) => { const h = 4 + Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21)) * 30; return <rect key={i} x={i * 2} y={(40 - h) / 2} width="1.2" height={h} rx=".6" />; })}
          </svg>
        </div>
      );
    case "md":
      return (
        <div className="hx-doc hx-md">
          <b># Launch notes</b>
          <span className="hx-lines">{LINES(3)}</span>
          <b>## Shots</b>
          <span className="hx-lines">{LINES(3, 3)}</span>
        </div>
      );
    default:
      return (
        <div className="hx-doc hx-blend">
          <svg viewBox="0 0 100 74">
            <path className="g" d="M8 62h84M14 54h72M20 46h60" />
            <path className="w" d="M50 12 76 26v28L50 68 24 54V26Z M50 12v28 M24 26l26 14 26-14 M50 40v28" />
            <circle className="o" cx="50" cy="40" r="2.4" />
          </svg>
        </div>
      );
  }
}

function Tile({ tile, refFn }) {
  return (
    <div className={`hx-tile hx-${tile.kind}`} ref={refFn} style={{ width: tile.w }}>
      <div className="hx-media" style={{ height: tile.h }}>
        {tile.kind === "photo" && <img src={tile.src} alt="" decoding="async" draggable={false} />}
        {tile.kind === "video" && <Video tile={tile} />}
        {tile.kind === "doc" && <Doc tile={tile} />}
      </div>
    </div>
  );
}

export function Hero({ hero, mac }) {
  const [layout, setLayout] = useState(null);
  const tileRefs = useRef([]);
  const canvas = useRef(null), planeWrap = useRef(null), planeSvg = useRef(null);
  const stage = hero.querySelector(".hx-stage");
  const copy = hero.querySelector(".hero-copy");

  useLayoutEffect(() => {
    setLayout(layoutTiles(stage.clientWidth, stage.clientHeight));
  }, [stage]);

  useEffect(() => {
    if (!layout) return undefined;
    const engine = startHero({ hero, stage, copy, mac, layout, sound, tileEls: tileRefs.current, canvas: canvas.current, planeWrap: planeWrap.current, planeSvg: planeSvg.current });
    return () => engine.destroy();
  }, [layout, hero, stage, copy, mac]);

  return (
    <>
      <div className="hx-tiles" aria-hidden="true">
        {layout && layout.tiles.map((tile, i) => <Tile key={tile.id} tile={tile} refFn={(el) => { tileRefs.current[i] = el; }} />)}
      </div>
      <canvas className="hx-fx" ref={canvas} aria-hidden="true" />
      <div className="hx-plane" ref={planeWrap} aria-hidden="true"><svg ref={planeSvg} /></div>
      <Captions />
      <SoundButton />
    </>
  );
}
