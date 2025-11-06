# Water Ripple Effect

An interactive water ripple effect using Three.js WebGL shaders. Features continuous ambient water motion and interactive ripples on mouse/touch input.

## Features

- 🌊 Real-time water simulation with WebGL shaders
- 🖱️ Interactive ripples on mouse/touch movement
- ✨ Continuous ambient wave motion
- 🎨 Refraction and caustic effects
- 📱 Mobile-friendly touch support

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

## Usage

- **Mouse/Touch**: Move your cursor or finger over the canvas to create ripples
- The water effect automatically animates with subtle ambient waves

## Files

- `index.html` - Main HTML file
- `script.js` - Three.js setup and animation loop
- `shaders.js` - WebGL vertex and fragment shaders
- `styles.css` - Minimal styling
- `server.js` - Simple HTTP server
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

- Three.js (r128)
- WebGL Shaders
- Node.js (for local server only)

