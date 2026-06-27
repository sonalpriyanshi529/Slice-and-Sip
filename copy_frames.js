/**
 * copy_frames.js
 *
 * One-time utility script: copies the extracted GIF frames (JPEGs) from
 * wherever you saved them into the `frames/` directory at the project root.
 *
 * Usage:
 *   node copy_frames.js
 *
 * Before running, set SRC_DIR below to wherever your frames currently live.
 * The destination is always <project-root>/frames/ (created automatically).
 */

const fs   = require('fs');
const path = require('path');

// ─── CONFIGURE THIS ───────────────────────────────────────────────────────────
// Set to the directory containing your ezgif-frame-*.jpg files.
// Examples:
//   Windows: 'C:\\Users\\YourName\\Downloads\\ezgif-6b7108f0508980be-jpg'
//   macOS:   '/Users/YourName/Downloads/ezgif-6b7108f0508980be-jpg'
const SRC_DIR = process.env.FRAMES_SRC || '';
// ─────────────────────────────────────────────────────────────────────────────

const DEST_DIR = path.join(__dirname, 'frames');

// Validate source path
if (!SRC_DIR) {
  console.error(
    'Error: No source directory specified.\n' +
    'Either set the FRAMES_SRC environment variable or edit SRC_DIR in copy_frames.js.\n\n' +
    'Example:\n' +
    '  FRAMES_SRC="/path/to/frames" node copy_frames.js\n' +
    '  set FRAMES_SRC=C:\\path\\to\\frames && node copy_frames.js'
  );
  process.exit(1);
}

if (!fs.existsSync(SRC_DIR)) {
  console.error(`Error: Source directory not found: ${SRC_DIR}`);
  process.exit(1);
}

// Create destination directory if it doesn't exist
if (!fs.existsSync(DEST_DIR)) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
  console.log(`Created directory: ${DEST_DIR}`);
}

try {
  const files = fs.readdirSync(SRC_DIR);
  console.log(`Found ${files.length} file(s) in: ${SRC_DIR}`);

  let copiedCount = 0;
  files.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') {
      const srcPath  = path.join(SRC_DIR, file);
      const destPath = path.join(DEST_DIR, file);
      fs.copyFileSync(srcPath, destPath);
      copiedCount++;
    }
  });

  if (copiedCount === 0) {
    console.warn('Warning: No .jpg/.jpeg files found in the source directory.');
  } else {
    console.log(`✅  Successfully copied ${copiedCount} frame(s) → ${DEST_DIR}`);
  }
} catch (err) {
  console.error('Error copying files:', err.message);
  process.exit(1);
}
