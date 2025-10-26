# 🎮 Kahoot Quiz Fetcher

A Next.js application that connects to Kahoot games and displays questions and answers in real-time with early data fetching.

## Features

- 🚀 Real-time question fetching (gets data before it appears on Kahoot)
- 📋 One-click copy for questions and answers
- ⌨️ Keyboard shortcut (Ctrl+Q) for quick copying
- 🌙 Dark mode support
- 💨 Fast and responsive UI

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/kahoot-quiz-fetcher)

### Manual Deployment Steps

1. **Push to GitHub**
   ```bash
   cd kahoot-quiz-fetcher
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/kahoot-quiz-fetcher.git
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Click "Deploy"

3. **Done!** Your app will be live at `https://your-project.vercel.app`

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## How to Use

1. Enter your name
2. Enter the Kahoot game PIN
3. Click "Connect to Game"
4. Questions will appear automatically as they're sent by Kahoot
5. Use the copy buttons or press Ctrl+Q to copy questions and answers

## Tech Stack

- Next.js 16
- TypeScript
- Tailwind CSS
- kahoot.js-latest

## License

MIT
