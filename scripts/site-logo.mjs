#!/usr/bin/env node
// The ParaAir mark: a folded paper dart, modelled in 3D and seen through the Anatomy kit's isometric camera, so every
// facet is a real face of a real fold and its tone comes from how that face meets the light. Writes:
//   site/glide.svg           the favicon: the plane in paper on an ink tile
//   site/logo-mark.svg       the mark alone, for anyone who needs the file
//   the <symbol id="i-plane"> in site/index.html and the brand marks in every other page (between the markers)
// and prints the facets as JSON for scripts that paint the plane themselves (site/home.js, site/motion.js).
//
//     node scripts/site-logo.mjs [--sheet out.html]     (--sheet writes a contact sheet of camera angles instead)
// Uses the kit at ANATOMY_KIT, like scripts/site-figure.mjs.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const KIT = process.env.ANATOMY_KIT || join(homedir(), ".claude/skills/anatomy/kit");
const k = await import(pathToFileURL(join(KIT, "iso-kit.mjs")).href);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The dart in its own frame: x forward, y to the left wing, z up. Two wings with a little dihedral, meeting at the
// spine; the keel folded down beneath the spine. Units are millimetres of an A4 dart, roughly.
const DART = {
  nose: [118, 0, 0],
  spineTail: [-62, 0, 0],
  leftTip: [-70, 64, 13],
  rightTip: [-70, -64, 13],
  keelTail: [-56, 0, -40],
  keelNose: [82, 0, -3],
};

const rot = ([x, y, z], { yaw = 0, pitch = 0, roll = 0 }) => {
  const r = Math.PI / 180;
  // roll about x, then pitch about y, then yaw about z
  let [a, b, c] = [x, y * Math.cos(roll * r) - z * Math.sin(roll * r), y * Math.sin(roll * r) + z * Math.cos(roll * r)];
  [a, c] = [a * Math.cos(pitch * r) + c * Math.sin(pitch * r), -a * Math.sin(pitch * r) + c * Math.cos(pitch * r)];
  [a, b] = [a * Math.cos(yaw * r) - b * Math.sin(yaw * r), a * Math.sin(yaw * r) + b * Math.cos(yaw * r)];
  return [a, b, c];
};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// The facets, each wound so its normal points to the side you see it from when it is lit.
function facets(pose) {
  const p = Object.fromEntries(Object.entries(DART).map(([name, point]) => [name, rot(point, pose)]));
  return [
    { name: "keel", points: [p.keelNose, p.spineTail, p.keelTail], side: "keel" },
    { name: "left", points: [p.nose, p.leftTip, p.spineTail], side: "wing" },
    { name: "right", points: [p.nose, p.spineTail, p.rightTip], side: "wing" },
  ].map((face) => ({ ...face, normal: unit(cross(sub(face.points[1], face.points[0]), sub(face.points[2], face.points[0]))) }));
}

// The camera looks from the kit's viewer direction; light comes from above, a little behind the viewer's left.
function viewOf(P) {
  const { sinA, cosA, sinE, cosE } = k.cameraOf(P);
  return { toViewer: [cosA * cosE, sinA * cosE, sinE], light: unit([cosA * 0.3 - sinA * 0.8, sinA * 0.3 + cosA * 0.8, 1.4]) };
}

// Draw a pose into a box: facets sorted far to near, each with its tone, and the spine crease on top.
function render(pose, { size = 100, pad = 8, azimuth = 45, elevation = 30, palette }) {
  const raw = facets(pose);
  const all = raw.flatMap((f) => f.points);
  const P = k.fitProjection(all, size, size, { pad, azimuth, elevation });
  const { toViewer, light } = viewOf(P);
  const shapes = raw
    .map((f) => {
      const facing = dot(f.normal, toViewer);
      const n = facing < 0 ? f.normal.map((v) => -v) : f.normal;
      const lit = Math.max(0, dot(n, light));
      const depth = f.points.reduce((sum, pt) => sum + k.depthOf(pt, P), 0) / f.points.length;
      return { ...f, lit, depth, under: facing < 0, d: k.pathOf(f.points.map((pt) => k.iso(pt, P)), true) };
    })
    .sort((a, b) => a.depth - b.depth);
  // The wing that meets the light more squarely is the lit paper, the other its shade; the keel is the sage fold.
  const wings = shapes.filter((f) => f.side === "wing").sort((a, b) => b.lit - a.lit);
  const fill = (f) => (f.side === "keel" ? palette.keelLit : f === wings[0] ? palette.wingLit : palette.wing);
  const spine = k.pathOf([DART.nose, DART.spineTail].map((pt) => k.iso(rot(pt, pose), P)));
  return { P, shapes, fill, spine };
}

// Two inks, black and white. Each face is a gradient from the nose back, as paper darkens a little away from the light's edge.
const INK = { wingLit: ["#33353B", "#0E0F12"], wing: ["#74787F", "#42454C"], keelLit: ["#D9DBDF", "#9A9EA6"], crease: "#FFFFFF", creaseOpacity: 0.42 };
const PAPER = { wingLit: ["#FFFFFF", "#ECEDEF"], wing: ["#C9CCD2", "#9EA2AA"], keelLit: ["#80848C", "#50545B"], crease: "#141518", creaseOpacity: 0.3 };

const POSE = { yaw: -104, pitch: -20, roll: 26 };
const CAMERA = { azimuth: 45, elevation: 30 };

const t1 = (n) => Math.round(n * 10) / 10;
const pts = (d) => d.replace(/^M|Z$/g, "").split("L").map((pair) => pair.split(" ").map(Number));

// Softened paper: each outer corner is rounded (radius in mark units) and each outer edge bows a little (a fraction of
// its length, + outward, - inward). Folds shared by two faces stay straight, so the faces still meet without a gap.
// Per face, in the order its points are listed in facets(): radii by vertex, bows by edge (vertex i to i + 1).
const SOFT = {
  left: { radii: [7, 5, 0], bows: [0.05, -0.035, 0] },
  right: { radii: [7, 0, 5], bows: [0, -0.035, 0.05] },
  keel: { radii: [0, 0, 4.5], bows: [0, -0.02, 0.05] },
};
function softPath(points, { radii, bows }, scale = 1) {
  const n = points.length;
  const cx = points.reduce((s, p) => s + p[0], 0) / n, cy = points.reduce((s, p) => s + p[1], 0) / n;
  const toward = (a, b, dist) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; const t = Math.min(dist / l, 0.45); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  const enter = points.map((p, i) => toward(p, points[(i + n - 1) % n], radii[i] * scale));
  const leave = points.map((p, i) => toward(p, points[(i + 1) % n], radii[i] * scale));
  const f = (q) => `${t1(q[0])} ${t1(q[1])}`;
  let d = `M${f(leave[0])}`;
  const edges = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = leave[i], b = enter[j];
    let seg;
    if (bows[i]) {
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let nx = -(b[1] - a[1]) / (len || 1), ny = (b[0] - a[0]) / (len || 1);
      if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
      seg = `Q${f([mx + nx * len * bows[i] * 2, my + ny * len * bows[i] * 2])} ${f(b)}`;
    } else seg = `L${f(b)}`;
    edges.push(`M${f(a)}${seg}`);
    d += seg;
    if (radii[j]) d += `Q${f(points[j])} ${f(leave[j])}`;
  }
  return { d: d + "Z", edges };
}

// The mark as SVG: a gradient per face, the faces far to near, the spine crease, and a paper-edge glint on the lit
// wing's leading edge. `id` keeps gradient ids unique when several marks share a page.
function markSvg({ palette, size = 100, pad = 6, id = "pa", crease = true, shadow = false }) {
  const r = render(POSE, { size, pad, ...CAMERA, palette: { wingLit: 0, wing: 1, keelLit: 2 } });
  const nose = k.iso(rot(DART.nose, POSE), r.P);
  const defs = [];
  const faces = r.shapes.map((f, i) => {
    const which = r.fill(f) === 0 ? "wingLit" : r.fill(f) === 1 ? "wing" : "keelLit";
    const points = pts(f.d);
    const far = points.reduce((best, pt) => (Math.hypot(pt[0] - nose[0], pt[1] - nose[1]) > Math.hypot(best[0] - nose[0], best[1] - nose[1]) ? pt : best), points[0]);
    const [a, b] = palette[which];
    defs.push(`<linearGradient id="${id}-${which}" gradientUnits="userSpaceOnUse" x1="${t1(nose[0])}" y1="${t1(nose[1])}" x2="${t1(far[0])}" y2="${t1(far[1])}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`);
    const soft = softPath(points, SOFT[f.name], size / 100);
    return { which, d: soft.d, edges: soft.edges, points, name: f.name };
  });
  const lit = faces.find((f) => f.which === "wingLit");
  const nr = SOFT.left.radii[0] * (size / 100);
  const spinePts = pts(r.spine);
  const along = (a, b, dist) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [a[0] + ((b[0] - a[0]) * dist) / l, a[1] + ((b[1] - a[1]) * dist) / l]; };
  const creaseStart = along(spinePts[0], spinePts[1], nr * 0.9);
  // The lit wing's leading edge: the edge from the nose to its outer tip.
  const tip = lit.points.reduce((best, pt) => (Math.hypot(pt[0] - nose[0], pt[1] - nose[1]) > Math.hypot(best[0] - nose[0], best[1] - nose[1]) ? pt : best), lit.points[0]);
  // The lit wing's leading edge, as drawn: nose to tip on the left wing (edge 0), tip to nose on the right (edge 2).
  const leading = (face) => face.edges[face.name === "left" ? 0 : 2];
  const shadowSvg = shadow ? `<ellipse cx="${t1(size * 0.47)}" cy="${t1(size * 0.86)}" rx="${t1(size * 0.26)}" ry="${t1(size * 0.035)}" fill="#000" opacity=".28" filter="url(#${id}-blur)"/>` : "";
  if (shadow) defs.push(`<filter id="${id}-blur" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="${t1(size * 0.02)}"/></filter>`);
  return {
    defs: defs.join(""),
    body: shadowSvg + faces.map((f) => `<path fill="url(#${id}-${f.which})" d="${f.d}"/>`).join("") +
      (crease ? `<path fill="none" stroke="${palette.crease}" stroke-opacity="${palette.creaseOpacity}" stroke-width="${t1(size / 110)}" stroke-linecap="round" d="M${t1(creaseStart[0])} ${t1(creaseStart[1])}L${t1(spinePts[1][0])} ${t1(spinePts[1][1])}"/>` +
        `<path fill="none" stroke="#FFFFFF" stroke-opacity=".35" stroke-width="${t1(size / 160)}" stroke-linecap="round" d="${leading(lit)}"/>` : ""),
    faces: faces.map((f) => ({ tone: f.which, points: f.points.map(([x, y]) => [t1(x), t1(y)]) })),
  };
}

// The contact sheet's quick render: flat tones (the far end of each face's gradient), no glint.
const svgOf = (r, { crease = true, extra = "#F5F3EE" } = {}) =>
  r.shapes.map((f) => { const c = r.fill(f); return `<path fill="${Array.isArray(c) ? c[1] : c}" d="${f.d}"/>`; }).join("") +
  (crease ? `<path fill="none" stroke="${extra}" stroke-opacity=".55" stroke-width="1" stroke-linecap="round" d="${r.spine}"/>` : "");

if (process.argv.includes("--sheet")) {
  const out = process.argv[process.argv.indexOf("--sheet") + 1];
  const cells = [];
  for (const yaw of [-112, -104, -96]) for (const pitch of [-28, -20]) for (const roll of [16, 26, 36]) {
    const pose = { yaw, pitch, roll };
    const r = render(pose, { size: 160, pad: 12, ...CAMERA, palette: INK });
    const t = render(pose, { size: 160, pad: 30, ...CAMERA, palette: PAPER });
    cells.push(`<figure><svg viewBox="0 0 160 160" width="160">${svgOf(r)}</svg><svg viewBox="0 0 160 160" width="160" class="tile"><rect width="160" height="160" rx="36" fill="#1A1D21"/>${svgOf(t, { extra: "#1A1D21" })}</svg><svg viewBox="0 0 160 160" width="20">${svgOf(r, { crease: false })}</svg><figcaption>yaw ${yaw} pitch ${pitch} roll ${roll}</figcaption></figure>`);
  }
  writeFileSync(out, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#F5F3EE;font:12px system-ui"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:10px">${cells.join("").replace(/<figure>/g, '<figure style="margin:0;display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#fff;padding:8px;border-radius:10px">')}</div>`);
  console.log("wrote", out);
  process.exit(0);
}

// ----------------------------------------------------------------------------- write the mark everywhere
const write = (path, text) => { writeFileSync(join(ROOT, path), text); console.log("wrote", path); };

// The favicon: the paper plane on an ink tile, with its shadow on the tile.
{
  const m = markSvg({ palette: PAPER, size: 1024, pad: 200, id: "g", shadow: true });
  write("site/glide.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">\n  <title>AirSpace</title>\n  <defs><linearGradient id="g-tile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2C2E33"/><stop offset="1" stop-color="#0E0F12"/></linearGradient>${m.defs}</defs>\n  <rect x="64" y="64" width="896" height="896" rx="200" fill="url(#g-tile)"/>\n  <rect x="64.5" y="64.5" width="895" height="895" rx="199.5" fill="none" stroke="#FFFFFF" stroke-opacity=".08"/>\n  ${m.body}\n</svg>\n`);
}
// The mark alone, in ink, for light backgrounds.
{
  const m = markSvg({ palette: INK, size: 512, pad: 24, id: "m" });
  write("site/logo-mark.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">\n  <title>AirSpace</title>\n  <defs>${m.defs}</defs>\n  ${m.body}\n</svg>\n`);
}

// The landing page draws the mark through two symbols: ink on paper, and paper on the ink buttons.
{
  const ink = markSvg({ palette: INK, size: 100, pad: 4, id: "pi" });
  const paper = markSvg({ palette: PAPER, size: 100, pad: 4, id: "pp" });
  const symbols = `<symbol id="i-plane" viewBox="0 0 100 100">${ink.body}</symbol><symbol id="i-plane-paper" viewBox="0 0 100 100">${paper.body}</symbol>`;
  const path = join(ROOT, "site/index.html");
  let html = readFileSync(path, "utf8");
  const a = html.indexOf("<!-- mark:start (scripts/site-logo.mjs) -->"), b = html.indexOf("<!-- mark:end -->");
  if (a < 0 || b < 0) throw new Error("site/index.html has no mark markers");
  html = html.slice(0, a) + "<!-- mark:start (scripts/site-logo.mjs) -->" + ink.defs + paper.defs + symbols + html.slice(b);
  writeFileSync(path, html);
  console.log("wrote the mark symbols into site/index.html");
}

// Every other page has the mark inline in its masthead, and so does the legal pages' template.
{
  const OLD = /<svg class="brand-mark" viewBox="0 0 454 460" aria-hidden="true">\s*<polygon class="mark-a"[^>]*\/>\s*<polygon class="mark-b"[^>]*\/>\s*<\/svg>|<svg class="brand-mark" viewBox="0 0 100 100" aria-hidden="true"><!-- mark -->[\s\S]*?<!-- \/mark --><\/svg>/g;
  const m = markSvg({ palette: INK, size: 100, pad: 4, id: "bm" });
  const inline = `<svg class="brand-mark" viewBox="0 0 100 100" aria-hidden="true"><!-- mark --><defs>${m.defs}</defs>${m.body}<!-- /mark --></svg>`;
  const pages = ["site/pricing.html", "site/get-started.html", "site/404.html", "site/help/export.html", "scripts/build-legal-pages.py",
    ...readdirSync(join(ROOT, "site")).filter((f) => f.endsWith(".html") && f !== "index.html" && !["pricing.html", "get-started.html", "404.html"].includes(f)).map((f) => "site/" + f)];
  for (const page of pages) {
    const path = join(ROOT, page);
    const text = readFileSync(path, "utf8");
    const next = text.replace(OLD, inline);
    if (next !== text) { writeFileSync(path, next); console.log("updated the mark in", page); }
  }
}

// For scripts that paint the plane on a canvas: the faces in a 100-unit box, far to near.
console.log("faces (ink, 100 box):", JSON.stringify(markSvg({ palette: INK, size: 100, pad: 4 }).faces));

