# Clutch — Don't miss your moment

AI-powered productivity companion for students and professionals.

## Stack
- React + Vite + Tailwind CSS
- Firebase (Auth, Firestore, Storage)
- Gemini 2.0 Flash API
- Deployed on Google AI Studio

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
cp .env.example .env
# Fill in your Firebase + Gemini API keys
npm run dev
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
2. Create API key → copy into `.env` as `VITE_GEMINI_API_KEY`

## Deploy to Google AI Studio
```bash
npm run build
# Upload the /dist folder to AI Studio
```
