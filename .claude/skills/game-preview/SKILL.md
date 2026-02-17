---
name: game-preview
description: Launch the WebGPU game in a browser for testing and visual inspection. Starts the Vite dev server and opens the game.
disable-model-invocation: true
allowed-tools: Bash, Read, Glob
---

# Game Preview

Launch the game for browser testing.

## Steps

1. Check that `package.json` exists and has a dev script. If not, add one:
   ```json
   "scripts": { "dev": "vite" }
   ```

2. Start the Vite dev server:
   ```bash
   npx vite --open
   ```

3. Report the local URL to the user (usually `http://localhost:5173`)

4. Remind the user:
   - Open browser DevTools > Console to check for WebGPU errors
   - Check the Performance tab for frame time (target: <16.6ms)
   - WebGPU requires Chrome 113+ or Edge 113+ (Firefox Nightly with flag)
   - If they see "WebGPU not supported", they need to enable `chrome://flags/#enable-unsafe-webgpu`

5. Ask the user what they'd like to change or improve after seeing it run

$ARGUMENTS
