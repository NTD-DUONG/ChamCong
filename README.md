# Attendance Tracker - Next.js Edition

Personal attendance timecard app built with **Next.js 14**, **React**, and vanilla CSS.

## Features

- ✅ 2 shifts per day (morning/afternoon)
- ✅ Popup modal for quick selection of status
- ✅ Light theme with two-segment day cells
- ✅ Red/green color coding (absent/working)
- ✅ Monthly summary statistics
- ✅ localStorage persistence
- ✅ Mobile responsive layout
- ✅ No external dependencies (except React/Next.js)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Status Options

- **✓ (Có mặt)** - Present (1.0 points)
- **✕ (Nghỉ)** - Absent (0 points)

## Data Storage

All data is saved to browser's `localStorage` with key `personal-attendance-v1`.
Data persists across sessions automatically.

## Color Scheme

- **Green** - Working shift
- **Red** - Absent shift
- Day numbers are faded for visual hierarchy
- Light theme with soft gradients

## Project Structure

```
NgayCongHien/
├── app/
│   ├── layout.jsx         # Root layout
│   ├── page.jsx          # Main app component
│   └── globals.css       # All styles
├── package.json
├── next.config.js
├── jsconfig.json
└── README.md
```

## Development Notes

- The app uses React hooks (`useState`, `useEffect`) for state management
- localStorage persistence handled automatically via effects
- All date formatting uses `Intl.DateTimeFormat` for Vietnamese locale
- CSS Grid used for responsive calendar layout
- Mobile-responsive with horizontal scroll on narrow viewports

## Original Stack

This app was converted from:

- Vanilla HTML/CSS/JavaScript → **Next.js + React**
- Maintains 100% feature parity with original
- Same visual design preserved
- Same data structure & localStorage key
