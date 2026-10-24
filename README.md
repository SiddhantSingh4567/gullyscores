# GullyScore — Production-Oriented Gully Cricket Platform
> *Every Run Counts.*

GullyScore is a mobile-first cricket scoring and tournament management Progressive Web Application (PWA) built for local clubs, street organizers, box cricket leagues, and spectators across India.

---

## 1. Architecture Overview
- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion.
- **Backend & Persistence**: Google Cloud Firestore (multi-tenant relational model with transactional updates) & Firebase Authentication (Google Sign-In).
- **Offline / PWA**: Vite PWA (`vite-plugin-pwa`) with offline precaching, standalone display mode, and in-app install triggers for Android and iOS Safari.
- **Scoring Engine**: Event-based transactional state machine (`src/lib/scoringEngine.ts`) with deterministic undo/replay, legal-delivery tracking, extras accounting, fall of wickets, run-rate calculations, and authentic ICC Net Run Rate (NRR) with all-out adjustments.

---

## 2. Environment Configuration
Firebase credentials are automatically read from `firebase-applet-config.json`:
- `projectId`: `inspirational-terminus-45wls`
- `firestoreDatabaseId`: `ai-studio-b4972615-0286-4ece-868a-6e08f50d4383`
- `apiKey`: Configured for authenticated Firestore read/writes

---

## 3. Database Schema
- `/users/{userId}`: User profiles with roles (`organizer`, `scorer`, `spectator`, `admin`).
- `/admins/{userId}`: Restricted platform administrator records.
- `/teams/{teamId}`: Team squads, colors, captain, vice-captain, and city.
- `/players/{playerId}`: Player roster records, jersey numbers, batting/bowling styles, and stats.
- `/matches/{matchId}`: Authoritative match status (`scheduled`, `live`, `completed`), rules, toss, and assigned scorers.
- `/innings/{inningsId}`: Innings summaries, batting scorecards, bowling figures, extras, and fall of wickets.
- `/ballEvents/{eventId}`: Immutable ball-by-ball transactional scoring events.
- `/tournaments/{tournamentId}`: Tournament formats (League, Knockout, League+Knockout), points rules, and dates.
- `/standings/{standingId}`: Dynamic points tables with Net Run Rate (NRR).
- `/auditLogs/{logId}`: Audit trail for score corrections and undos.

---

## 4. Security & Access Control
- **Least-Privilege ABAC**: Enforced at the database level via `firestore.rules`.
- **Default-Deny Catch-All**: All unlisted paths blocked.
- **Match Scoring**: Only the match `ownerId` or users listed in `assignedScorerIds` can record or undo deliveries.
- **Spectator Safety**: Public read access to published matches, scorecards, teams, and standings without requiring an account.
- **Admin Verification**: Platform moderation restricted to authenticated admin accounts (`siddhants4567@gmail.com`).

---

## 5. Automated Testing
Run the 24 automated unit and edge-case scoring tests:
```bash
npx tsx -e "import { runScoringTests } from './src/lib/__tests__/scoringEngine.test.ts'; const res = runScoringTests(); console.log(res);"
```
Covering:
- Legal deliveries and boundaries (4s & 6s)
- Strike rotation on odd runs
- Wide and no-ball non-advancing legal ball count
- Dismissal types (Bowled, Caught, Run-Out with assist player)
- Net Run Rate calculations with all-out adjustments
- 100% deterministic event stream replay & undo integrity
