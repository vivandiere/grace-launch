# Water Ripple Effect

An interactive water ripple effect powered by a lightweight Canvas 2D implementation. Inspired by the classic JS1K “water ripple” demo, it drives continuous ambient motion plus interactive ripples on mouse and touch input.

## Features

- 🌊 Real-time water simulation using pure Canvas 2D
- 🖱️ Interactive ripples that track mouse/touch movement
- ✨ Continuous ambient waves with random disturbances
- ⚙️ Resolution scaling for smoother mobile performance
- 📱 Runs on modern mobile browsers (no WebGL required)

## Setup

1. Install dependencies (if needed):
```bash
npm install
```

2. Start the server:
```bash
node server.js
```

3. Open your browser to:
```
http://localhost:3000
```

### Deployment Notes

- Latest update triggered on: November 7, 2025 – switched to a Canvas-based ripple engine with mobile-friendly tuning.

## Usage

- **Mouse/Touch**: Move your cursor or finger over the canvas to create ripples
- The water effect automatically animates with subtle ambient waves

## Files

- `index.html` - Main HTML file with full-screen canvas
- `script.js` - Canvas 2D ripple simulation (inspired by JS1K classic)
- `styles.css` - Minimal styling and canvas layout helpers
- `server.js` - Simple HTTP server (optional for local testing)
- `assets/` - Image assets

## Deployment

### Vercel (Recommended)

1. Install Vercel CLI (optional):
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

Or connect your GitHub repository directly on [vercel.com](https://vercel.com) - it will auto-detect and deploy.

The site will work as a static site - no server needed!

### Local Development

For local development, use the included server:
```bash
node server.js
```

## Technologies

- HTML5 Canvas 2D
- Vanilla JavaScript
- Node.js (for the optional local server)

