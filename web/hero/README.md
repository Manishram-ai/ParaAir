# The landing page hero

`site/hero.js` is built from here: React 18 and Framer Motion, bundled by esbuild into one self-hosted file, as the
site's Content-Security-Policy (`script-src 'self'`) requires. Nothing here is deployed; only `site/` is.

    npm ci --ignore-scripts
    npm run build        # writes ../../site/hero.js
    npm run watch        # rebuilds on every save

- `src/engine.js` plays the story by scroll: the hero is a tall section (`.hx-scroll`, 820vh) whose stage pins, and how
  far it has scrolled sets the story's time (eased and speed-capped, so it glides like video, forwards and back).
  Every frame is worked out from that time alone. It opens on the canvas with no words; the headline appears only
  once the plane has landed.
- `src/flight.js` holds the timings (`T`, `STORY`), the camera's pan and the plane's flight: one speed curve that
  cruises and then slows evenly onto the Mac's lid, over a height-by-distance path, so the plane never loops, turns
  back or stops in mid-air. Prints the plane passes lift off into its wake, and the wake pours onto the lid.
- `src/Hero.jsx` draws the canvas layer; `src/MacDemo.jsx` draws what the MacBook's screen shows (Finder and
  QuickTime, with icons from the page's sprite).
- `src/media.js` lists the files on the canvas. Their sources and licences are in the comment at the top of
  `site/index.html`.
- `?hxt=6.5` on the page holds the story at 6.5 seconds, for checking one moment.

The MacBook Pro image (`site/media/macbook-pro.webp`) is Apple's product bezel with the ParaAir desktop on its screen.
Apple's marketing guidelines apply: the image is never moved, scaled in place, cropped or covered, and nothing may
appear to enter or leave its screen. Keep animation around it, and only its screen's contents inside it.
