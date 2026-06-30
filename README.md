# Mosaic — Don't miss your moment

AI-powered productivity companion for students and professionals.

## Stack
- React + Vite + Tailwind CSS
- Firebase (Auth, Firestore, Storage)
- Gemini 2.5 Flash API
- Google Cloud Run ready

## Features
- 🤖 Gemini-powered task prioritization + daily planning
- 📸 BeReal-style social proof on task completion  
- 🔥 Streak tracking + XP gamification
- ⏱ Custom Pomodoro timer with session tracking
- 📅 Calendar view with task overlays
- 💬 Always-visible Gemini chat companion
- 📱 PWA — installable on desktop

## Setup

```bash
npm install
copy .env.example .env
# Fill in your Firebase + Gemini API keys
npm run dev
```

For the production-style app with the server-side Gemini proxy:

```bash
npm run build
npm start
```

## Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project → Add Web App
3. Enable Authentication → Google provider
4. Enable Firestore Database
5. Enable Storage
6. Copy config values into `.env`

## Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com)
2. Create API key → copy into `.env` as `GEMINI_API_KEY`

## Deploy to Google Cloud Run
```bash
npm run build
npm test
npm start
```
