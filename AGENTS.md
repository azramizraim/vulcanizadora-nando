# AGENTS.md - Vulcanizadora Nando

## Tech Stack
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + custom CSS variables (see `tailwind.config.js`)
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Routing**: React Router DOM (client-side)
- **Icons**: lucide-react

## Commands
```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build   # Build for production → dist/
npm run lint    # Run ESLint
npm run preview # Preview production build
```

## Architecture
- Single-page React app with client-side routing via `react-router-dom`
- Entry: `src/main.jsx` → `src/App.jsx`
- Firebase config: `src/firebase.js`
- Components in `src/components/`: Dashboard, POS, Inventory, CRM, Reports, Expenses, ServicesManagement, UsersManagement, Sidebar, Login

## Data Model
- **Auth**: Firebase Auth
- **Firestore Collections**:
  - `Usuarios` - User profiles (uid as document ID, fields: role, email, branch)
  - Other collections depend on feature (Servicios, quotes, inventory, etc.)

## Key Conventions
- **Dark mode**: Enabled by default, stored in `localStorage.darkMode`
- **Default role**: `staff` (passed to components for permission checks)
- **Default branch**: `Rojo Gomez` (set at login for staff users)
- **Admin check**: `userProfile.role === 'admin'` gates admin features

## Design System
- Tailwind uses CSS variables defined in `src/index.css` (search for `--color-*`)
- Custom fonts: `Space Grotesk` (headline), `Inter` (body/label)
- Border radii: `DEFAULT`, `lg`, `xl`, `full`

## Gotchas
- Route guards use a switch on `activeScreen` state, not URL-based routing
- Auth flow: `onAuthStateChanged` → fetch user profile from Firestore `Usuarios` collection
- No TypeScript - pure JavaScript/JSX (no `npm run typecheck` available)
- All routing is client-side via Sidebar navigation