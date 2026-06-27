// =============================================================================
//  Slice & Sip — Scroll-Animation Controller
// =============================================================================

// --- Configuration ---
const TOTAL_FRAMES = 240;

// How many seconds the full 240-frame animation should take to ease through.
// This is a time-based ease factor, so it behaves identically at 60 Hz and 120 Hz.
const EASE_SECONDS = 0.12; // Smaller = snappier, larger = smoother

// The body will be made this many screen-heights tall so there is enough
// scroll distance to drive all 240 frames. 5 screens ≈ comfortable 240-frame
// coverage with room for the sticky cards.
const SCROLL_MULTIPLIER = 5;

// --- State ---
const framesArray = [];
let loadedCount = 0;
let isLoaded = false;

let currentFrameIndex = 1;   // Eased (smoothly interpolated) frame position
let targetFrameIndex  = 1;   // Snap frame from scroll position
let lastRenderedFrame = 0;
let lastTimestamp     = null; // For delta-time lerp

// --- DOM references (resolved after DOMContentLoaded) ---
let canvas, ctx;
let preloader, progressLine, progressText;
let scrollIndicator, headerEl;
let sections; // NodeList of .scroll-section elements

// =============================================================================
//  Image Preloader
// =============================================================================

function preloadImages() {
  return new Promise((resolve) => {
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const frameNum = String(i).padStart(3, '0');
      img.src = `frames/ezgif-frame-${frameNum}.jpg`;

      const onSettled = () => {
        loadedCount++;
        const pct = Math.min(100, Math.floor((loadedCount / TOTAL_FRAMES) * 100));
        progressLine.style.width = `${pct}%`;
        progressText.textContent  = `Stoking the flames… ${pct}%`;

        if (loadedCount === TOTAL_FRAMES) {
          onAllImagesLoaded(resolve);
        }
      };

      img.onload  = onSettled;
      img.onerror = () => {
        console.warn(`Failed to load frame: frames/ezgif-frame-${frameNum}.jpg`);
        onSettled();
      };

      framesArray.push(img);
    }
  });
}

function onAllImagesLoaded(resolve) {
  isLoaded = true;
  // Brief pause so the user sees 100% before the preloader fades out
  setTimeout(() => {
    preloader.classList.add('fade-out');
    // Re-enable scrolling that was locked during preload
    document.body.style.overflowY = 'auto';
    resolve();
  }, 600);
}

// =============================================================================
//  Canvas Rendering — object-fit: cover behaviour
// =============================================================================

function drawFrameCover(img) {
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const cw = canvas.width;
  const ch = canvas.height;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  const canvasRatio = cw / ch;
  const imgRatio    = iw / ih;

  let sx = 0, sy = 0, sw = iw, sh = ih;

  if (canvasRatio > imgRatio) {
    // Canvas is wider relative to image — crop top/bottom
    sh = iw / canvasRatio;
    sy = (ih - sh) / 2;
  } else {
    // Canvas is taller relative to image — crop sides
    sw = ih * canvasRatio;
    sx = (iw - sw) / 2;
  }

  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
}

// =============================================================================
//  Canvas Resize  (debounced to avoid layout thrash on rapid resize)
// =============================================================================

let resizeTimer = null;

function resizeCanvas() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(_doResize, 100);
}

function _doResize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = window.innerWidth  * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width  = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;

  if (isLoaded) {
    const idx = Math.round(currentFrameIndex) - 1;
    drawFrameCover(framesArray[Math.max(0, idx)]);
  }
}

// =============================================================================
//  Scroll Handler — maps scroll position → target frame
// =============================================================================

function updateScrollProgress() {
  const scrollTop = window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

  if (maxScroll <= 0) return;

  const scrollFraction = Math.min(1, scrollTop / maxScroll);

  // Map fraction to frame 1–240 (inclusive)
  targetFrameIndex = Math.min(
    TOTAL_FRAMES,
    Math.max(1, Math.ceil(scrollFraction * TOTAL_FRAMES))
  );

  // Header style
  if (scrollTop > 50) {
    headerEl.classList.add('scrolled');
  } else {
    headerEl.classList.remove('scrolled');
  }

  // Scroll indicator
  if (scrollFraction > 0.03) {
    scrollIndicator.classList.add('fade-out');
  } else {
    scrollIndicator.classList.remove('fade-out');
  }
}

// =============================================================================
//  Text Overlay — activate cards based on eased frame position
//  Using currentFrameIndex (eased) keeps card transitions in sync with
//  the smooth canvas animation rather than jumping ahead.
// =============================================================================

const SECTION_RANGES = [
  { start:   1, end:  45 },   // section-1
  { start:  60, end: 110 },   // section-2
  { start: 125, end: 175 },   // section-3
  { start: 190, end: 225 },   // section-4
];

function updateTextOverlays(easedFrame) {
  sections.forEach((section, i) => {
    const range = SECTION_RANGES[i];
    if (!range) return;
    const inRange = easedFrame >= range.start && easedFrame <= range.end;
    section.classList.toggle('active', inRange);
  });
}

// =============================================================================
//  Animation Loop — delta-time lerp (frame-rate independent)
// =============================================================================

function animationLoop(timestamp) {
  // Delta time in seconds — clamped to 100 ms to avoid big jumps after tab
  // switching or sleep.
  const dt = lastTimestamp !== null
    ? Math.min((timestamp - lastTimestamp) / 1000, 0.1)
    : 0;
  lastTimestamp = timestamp;

  // Alpha for exponential moving average — derived from time so it's
  // identical at 60 Hz and 120 Hz.
  const alpha = 1 - Math.pow(1 - Math.min(1, dt / EASE_SECONDS), 1);

  const frameDiff = targetFrameIndex - currentFrameIndex;

  if (Math.abs(frameDiff) < 0.05) {
    currentFrameIndex = targetFrameIndex;
  } else {
    currentFrameIndex += frameDiff * alpha;
  }

  const roundedFrame = Math.round(currentFrameIndex);

  // Redraw only when the integer frame changes
  if (roundedFrame !== lastRenderedFrame) {
    const img = framesArray[roundedFrame - 1];
    if (img && img.complete) {
      drawFrameCover(img);
      lastRenderedFrame = roundedFrame;
    }
  }

  // Update text overlays using the eased position for sync
  updateTextOverlays(currentFrameIndex);

  requestAnimationFrame(animationLoop);
}

// =============================================================================
//  Initialisation
// =============================================================================

async function init() {
  // Resolve DOM references
  canvas         = document.getElementById('animation-canvas');
  ctx            = canvas.getContext('2d');
  preloader      = document.getElementById('preloader');
  progressLine   = document.getElementById('loader-progress');
  progressText   = document.getElementById('loader-text');
  scrollIndicator= document.getElementById('scroll-indicator');
  headerEl       = document.querySelector('header');
  sections       = document.querySelectorAll('.scroll-section');

  // Lock scroll while loading
  document.body.style.overflowY = 'hidden';

  // Size the canvas before anything is drawn
  _doResize(); // call directly (no debounce needed on first run)

  // Attach listeners
  // `passive: true` tells the browser we won't call preventDefault() —
  // allows it to start scrolling immediately without waiting for JS.
  window.addEventListener('resize',  resizeCanvas, { passive: true });
  window.addEventListener('scroll',  updateScrollProgress, { passive: true });

  // Load all frames (shows progress bar)
  await preloadImages();

  // Draw the first frame so canvas isn't blank when preloader fades
  drawFrameCover(framesArray[0]);

  // Set body height to create the scroll distance.
  // SCROLL_MULTIPLIER × 100vh gives enough room for all 240 frames
  // plus padding at the start/end.
  document.body.style.height = `${SCROLL_MULTIPLIER * 100}vh`;

  // Evaluate scroll position in case user reloaded mid-page
  updateScrollProgress();

  // Kick off the render loop
  requestAnimationFrame(animationLoop);
}

window.addEventListener('DOMContentLoaded', init);
