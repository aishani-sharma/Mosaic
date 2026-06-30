# Mosaic

Mosaic is an AI-powered productivity app that helps students and builders decide what matters today, finish it, and capture visible proof of progress.

The product combines a task board, AI daily planning, a Pomodoro focus space, calendar overlays, streaks, XP, and a social "moments" feed. The app is designed to feel like a lightweight companion: plan the day, complete tasks, post wins, and keep momentum visible.

## What It Does

- Task dashboard with quick add, deadlines, priorities, completed sections, and local fallback when Firebase is unavailable.
- Gemini-powered daily battle plan and task prioritization through a server-side proxy.
- Mosaic Moments feed for sharing completed work with proof images and reactions.
- Firebase Auth, Firestore, and Storage support for real accounts, tasks, profiles, posts, and uploads.
- Guest/local mode for demos and development without Firebase credentials.
- Pomodoro focus room with ambient sounds and session feedback.
- Calendar view with task overlays and optional Google Calendar OAuth client ID.
- PWA-ready frontend built with React, Vite, and Tailwind CSS.

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- Firebase Auth, Firestore, and Storage
- Gemini API through the included Node server
- Node.js HTTP server for production serving and `/api/gemini`

## Environment Safety

Do not commit `.env`. It is ignored by `.gitignore`.

Only `.env.example` should be committed. It contains placeholder values and is safe to push.

Firebase `VITE_*` values are exposed to the browser by design. Treat `GEMINI_API_KEY` as a real secret because it is used only by the server-side proxy.

## Local Setup

```bash
npm install
copy .env.example .env
npm run dev
```

On macOS/Linux:

```bash
cp .env.example .env
```

Fill `.env` with your Firebase config and Gemini key:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GEMINI_API_KEY=your_server_side_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash-lite
```

`npm run dev` starts the local Vite app and API server together.

## Production Run

```bash
npm run build
npm start
```

The production server serves `dist/` and exposes:

- `/api/gemini` for Gemini chat/planning requests
- frontend routes through the built Vite app

By default the server uses port `8080`. Set `PORT` to override it.

## Firebase Setup

1. Create a Firebase project.
2. Add a Web App and copy the config into `.env`.
3. Enable Google Authentication.
4. Create a Firestore database.
5. Enable Firebase Storage for proof image uploads.
6. Add your deployed app domain to Firebase authorized domains.

The app can still boot without Firebase credentials for local demos, but cloud persistence, auth, uploads, and real shared posts require Firebase.

## Gemini Setup

1. Create a Gemini API key in Google AI Studio.
2. Put it in `.env` as `GEMINI_API_KEY`.
3. Optionally set `GEMINI_MODEL`; the default is `gemini-2.5-flash-lite`.

The browser never receives the Gemini key. Requests go through `/api/gemini`.

## Deploy

Any Node host that can run `npm run build` and `npm start` works.

### Render, Railway, or Similar

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment variables: copy the keys from `.env.example` and replace values with production credentials

### Google Cloud Run

```bash
npm install
npm run build
npm test
npm start
```

For Cloud Run, set the same environment variables in the service configuration and let Cloud Run provide `PORT`.

## Checks

```bash
npm test
npm run build
```

## Repository Hygiene

- Keep `.env` local only.
- Keep generated `dist/`, logs, and `artifacts/` out of git.
- Commit `public/` assets that the UI references, such as sounds, Lottie files, and featured moment images.
