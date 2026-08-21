# 🚀 Kodelab — Interactive Web Coding Platform

A modern, playful, and responsive web development learning studio designed for students, instructors, and parents. Built with Next.js 14, TypeScript, Tailwind CSS, CodeMirror, and Supabase.

---

## 🌟 Key Features

- **🚪 Unified Single-View Portal Gateway (`/`):**
  - Interactive 3D layered card deck with smooth scroll/swipe gestures.
  - Floating authentic programming language stickers (HTML5, CSS3, JS, React, Tailwind, TypeScript).
- **🎓 Student Code Studio (`/editor`):**
  - Multi-file real-time HTML, CSS, and JS editor with CodeMirror.
  - Instant live preview with auto-reload, split resizer, and fullscreen mobile tab switcher (`[ 💻 Code | 🌐 Preview ]`).
  - Personal projects sandbox (`/projects`) and session assignment workspace.
- **🧑‍🏫 Instructor Hub & Management (`/dashboard`):**
  - Open & lock classroom sessions with real-time sync.
  - Live inspection mode to review student code safely without modifying original student files.
  - Upload classroom documentation photos & custom session banners.
  - Full student account directory (`/dashboard/students`): Create, bulk generate, edit details, reset passwords, and delete accounts.
- **📸 Classroom Recap Timeline (`/recap` / `/parents`):**
  - Public timeline showcase sorted by session dates.
  - Classroom activity photo galleries.
  - 1-click live web previews and code inspection modal with macOS-style window controls.
- **🌓 Light & Dark Theme:** Full high-contrast dark/light mode toggle.
- **📱 100% Mobile & Touch Friendly:** Optimized touch targets (min 44px), swipe gestures, and responsive mobile card views.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 14 (App Router)](https://nextjs.org/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Code Editor:** [CodeMirror 6](https://codemirror.net/) (`@codemirror/lang-html`, `@codemirror/lang-css`, `@codemirror/lang-javascript`)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Backend / Storage:** [Supabase](https://supabase.com/) (with offline-first local storage fallback)

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/mifdev0/kodelab.git
cd kodelab
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables (Optional)
Copy `.env.example` to `.env.local` and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 📜 License
MIT License. Built for young creators and web development education.
