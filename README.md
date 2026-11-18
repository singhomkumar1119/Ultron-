# ULTRON — Cinematic Autonomous Intelligence Frontend

A cinematic, 3D-accelerated AI workspace built with **React**, **TypeScript**, **Tailwind CSS**, and **Three.js / WebGL**.

## Highlights

1. **7-Stage Full-Screen Opening Sequence (`src/components/CinematicOpening.tsx`)**
   - Emerges from a near-black (`#040407`) field with a faint central glow.
   - Gathers fine luminous particles into a living, organic 3D energy blob (`src/components/UltronEnergyBlob3D.tsx`) driven by custom GLSL vertex displacement and an iridescent glass-and-liquid-metal shader (electric violet, cobalt blue, cyan, magenta, and selective warm amber highlights).
   - Forms delicate orbital filaments and an open-left C-ring around the dark central core.
   - Morphs smoothly into a sculptural **"U" emblem** (`src/components/UltronLogoMark.tsx`), reveals the **ULTRON** wordmark, and transitions seamlessly into the main interface (~3.7 seconds total).
   - Plays once per session (`sessionStorage`), provides an accessible **Skip intro** button (`Escape` / `Enter` / `Space`), and honors `prefers-reduced-motion` with a calm static-logo fade.

2. **Refined AI-Assistant Home Screen (`src/components/ChatView.tsx`)**
   - Minimal 3-zone top navigation bar (`src/components/Navigation.tsx`) with the original ULTRON emblem, workspace links, **New Session** action, and **Settings**.
   - Central pointer-responsive 3D energy blob above the *"What would you like to build?"* prompt heading.
   - Auto-expanding `<textarea>` composer with attachment staging, voice dictation preview, send action, and understated suggestion chips.
   - Collapsible conversation-history sidebar persisted in `localStorage`.

3. **Adaptive 3D Rendering & Fallbacks**
   - Caps pixel density (`devicePixelRatio`) and scales geometry/particle counts across desktop, mobile, and software WebGL (`SwiftShader`/`llvmpipe`).
   - Pauses WebGL rendering automatically when the document tab is hidden (`document.hidden`).
   - Provides a clean SVG/CSS fallback emblem if WebGL is unavailable or loses context.

## Local Setup & Commands

```bash
# Install dependencies
npm install

# Start the development server on http://localhost:3000
npm run dev

# Run pure domain & 3D choreography unit tests
npx --yes tsx --test src/utils/ultronLogic.test.ts

# Type-check & build for production
npm run lint
npm run build
```

## Backend Integration Points

By default, the frontend runs in **Demo Mode** with explicit UI indicators so simulated responses, local file-attachment staging, and simulated voice dictation are never mistaken for live backend services. To connect a live AI backend:

1. **Streaming Chat Completion (`src/components/ChatView.tsx` → `handleSend`)**:
   - Replace the simulated streaming interval in `handleSend(textToSend)` with a `fetch('/api/chat', { method: 'POST', body: JSON.stringify({ messages, contextMode }) })` SSE/ReadableStream reader.
2. **File Attachments (`src/components/ChatView.tsx` → `handleAttachmentSelect`)**:
   - Upload the selected `File` object via `FormData` to `/api/uploads` and pass the returned attachment URI in `StoredChatMessage`.
3. **Speech-to-Text Dictation (`src/components/ChatView.tsx` → `handleToggleDemoDictation`)**:
   - Connect the browser `MediaRecorder` / Web Speech `SpeechRecognition` stream or a `/api/transcribe` endpoint to stream live transcripts into `setInput`.
