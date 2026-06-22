# 👗 AI Virtual Trial Room

<div align="center">

![AI Virtual Trial Room Banner](https://img.shields.io/badge/AI-Virtual%20Trial%20Room-blueviolet?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDE4Yy00LjQxIDAtOC0zLjU5LTgtOHMzLjU5LTggOC04IDggMy41OSA4IDgtMy41OSA4LTggOHoiLz48L3N2Zz4=)

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Gemini-1.5%20Flash-4285F4?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

> **Try clothes on virtually using AI — without ever leaving your home.**

[✨ Features](#-features) • [🚀 Quick Start](#-quick-start) • [🏗 Architecture](#-architecture) • [📸 Screenshots](#-screenshots) • [🤝 Contributing](#-contributing)

</div>

---

## 🌟 Overview

**AI Virtual Trial Room** is a full-stack AI-powered fashion application that lets users virtually try on clothing items using cutting-edge diffusion models. It combines Google's Gemini AI for intelligent style analysis with Replicate's IDM-VTON model for photorealistic virtual try-on experiences.

Built with an **Indian fashion market** focus, it provides personalized style recommendations, wardrobe management, and outfit comparison — all in a sleek, mobile-first interface.

---

## ✨ Features

### 🤖 AI-Powered Try-On
- **Virtual Try-On** — Upload your photo and a garment image; see yourself wearing it using `cuuupid/idm-vton` diffusion model
- **Gemini Style Analysis** — Get personalized style insights, color palette suggestions, and outfit recommendations powered by Gemini 1.5 Flash
- **Smart Pairing Hints** — AI suggests complementary items from your wardrobe

### 👚 Wardrobe Management
- **Digital Wardrobe** — Save and organize all your clothing items in one place
- **Outfit History** — Browse past try-on sessions and style analyses
- **Side-by-Side Comparison** — Compare multiple outfit options simultaneously

### 👤 User Experience
- **Google OAuth** via NextAuth.js for seamless sign-in
- **Onboarding Flow** — Body profile setup with photo upload
- **Mobile-First Design** — Responsive UI optimized for all screen sizes
- **Dark Mode** — Full dark theme support
- **Skeleton Loading** — Smooth loading states for async operations
- **Toast Notifications** — Real-time feedback via Sonner

### 🛠 Developer Features
- **Free Local Mode** — Run completely locally with zero external API costs
- **Dual Mode Architecture** — Switch between local and cloud storage seamlessly
- **TypeScript** — End-to-end type safety

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 14)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Dashboard│  │ Wardrobe │  │ Compare  │  │  History  │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                           │ Next.js API Routes
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌─────▼─────┐     ┌─────▼──────┐
   │ Gemini  │       │ Replicate │     │  Supabase  │
   │  Flash  │       │ IDM-VTON  │     │ PostgreSQL  │
   │  (AI)   │       │ (Try-On)  │     │  Storage   │
   └─────────┘       └───────────┘     └────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 3 |
| **Auth** | NextAuth.js (Google OAuth) |
| **Database** | Supabase (PostgreSQL) |
| **Storage** | Supabase Storage |
| **AI - Style** | Google Gemini 1.5 Flash |
| **AI - Try-On** | Replicate `cuuupid/idm-vton` |
| **Notifications** | Sonner |
| **Validation** | Zod |
| **Deployment** | Vercel-ready |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+
- **npm** or **yarn**

### 1. Clone the Repository

```bash
git clone https://github.com/Dattu47/AI_Virtual_TrailRoom.git
cd AI_Virtual_TrailRoom
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
# Windows
copy .env.example .env.local

# macOS/Linux
cp .env.example .env.local
```

Open `.env.local` and choose your mode:

---

## ⚙️ Configuration

### 🟢 Free Local Mode (Zero Cost — Recommended for Development)

No external API keys required! The app runs entirely locally.

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=any-random-secret-string
FREE_MODE=true
NEXT_PUBLIC_FREE_MODE=true
```

**What works in Free Mode:**
- ✅ Local credentials login (no Google OAuth needed)
- ✅ Profile & wardrobe stored in `.localdb.json`
- ✅ Image uploads saved to `public/uploads/`
- ✅ Fallback style analysis (no Gemini key needed)
- ⚠️ Try-on shows product preview instead of Replicate generation

---

### ☁️ Full Cloud Mode

For production with real AI try-on and cloud storage:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secure-secret
FREE_MODE=false
NEXT_PUBLIC_FREE_MODE=false

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=stylesense-images

# AI APIs
GEMINI_API_KEY=your-gemini-api-key
REPLICATE_API_TOKEN=your-replicate-token
TRYON_API_URL=optional-custom-tryon-endpoint
```

#### Cloud Mode Setup Steps

1. **Supabase** — Create a project at [supabase.com](https://supabase.com) and run `supabase/schema.sql` in the SQL editor
2. **Storage** — Create a public storage bucket matching `SUPABASE_STORAGE_BUCKET`
3. **Google OAuth** — Create credentials at [Google Cloud Console](https://console.cloud.google.com), add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI
4. **Gemini API** — Get a key from [Google AI Studio](https://aistudio.google.com/app/apikey)
5. **Replicate** — Get a token from [replicate.com](https://replicate.com)

---

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
AI_Virtual_TrailRoom/
├── src/
│   ├── app/
│   │   ├── api/              # API route handlers
│   │   ├── dashboard/        # Main try-on dashboard
│   │   ├── wardrobe/         # Wardrobe management
│   │   ├── compare/          # Outfit comparison
│   │   ├── history/          # Try-on history
│   │   ├── onboarding/       # User onboarding flow
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Landing page
│   ├── components/
│   │   └── navbar.tsx        # Navigation component
│   ├── lib/
│   │   └── local-store.ts    # Local storage utilities
│   ├── types/                # TypeScript type definitions
│   └── middleware.ts         # Auth middleware
├── supabase/
│   └── schema.sql            # Database schema
├── public/                   # Static assets
├── .env.example              # Environment template
└── next.config.mjs           # Next.js configuration
```

---

## 🔑 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth authentication |
| `/api/tryon` | POST | Virtual try-on generation |
| `/api/analyze` | POST | Gemini style analysis |
| `/api/wardrobe` | GET/POST | Wardrobe CRUD operations |
| `/api/history` | GET | Fetch try-on history |
| `/api/upload` | POST | Image upload handler |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** your feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines

- Follow existing TypeScript patterns
- Keep components focused and reusable
- Test both Free Mode and Cloud Mode when applicable
- Never commit `.env.local` or any secrets

---

## 📝 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Google Gemini](https://deepmind.google/technologies/gemini/) for AI style analysis
- [Replicate IDM-VTON](https://replicate.com/cuuupid/idm-vton) for virtual try-on
- [Supabase](https://supabase.com) for the backend infrastructure
- [Next.js](https://nextjs.org) for the full-stack framework
- [Vercel](https://vercel.com) for seamless deployment

---

<div align="center">

Made with ❤️ by [Dattu47](https://github.com/Dattu47)

⭐ **Star this repo if you find it useful!** ⭐

</div>
