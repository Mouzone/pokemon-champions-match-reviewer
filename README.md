# Pokémon Champions Match Reviewer

Review VGC (Scarlet/Violet) match recordings with AI-powered team detection and turn-by-turn video-synced notes.

Upload a match video → a Cloud Function analyzes it with Gemini 2.5 Flash (identifies your team, the opponent's team, the result, and turn timestamps) → review the match with a synced video player and per-turn annotation (events / notes / knowns / assumptions).

## Architecture

```
Browser (React 19 + Vite, deployed on Vercel)
  ├── Firebase Auth (email/password)
  ├── Firestore (teams, matches, match_notes, processing_jobs)
  ├── Firebase Storage (raw match videos, gs://…/videos/{userId}/…)
  └── Firebase Functions (us-east1)
        ├── processMatch       — Storage trigger: runs Gemini video analysis on upload
        ├── manualProcessMatch — Callable: re-process a storage file on demand
        └── cleanupOldVideos   — Scheduled daily: deletes videos/matches/jobs older than 7 days

Cloud Function uses Vertex AI (Gemini 2.5 Flash, us-central1) to analyze the video and
writes the result back to Firestore (match + per-turn match_notes with timestamps).
```

### Data model (Firestore)

| Collection | Key fields |
|------------|-----------|
| `teams` | `name`, `paste_text` (Showdown paste), `userId`, `created_at` |
| `matches` | `video_url` (gs:// or https), `result` (win/loss/tie), `own_team_id`, `opponent_team` (6× `{name,id}`), `played_at`, `userId`, `created_at` |
| `match_notes` | `match_id`, `tab` (`select` \| `battle` \| `improvements`), `turn_number`, `timestamp` (seconds), `actual_note` (JSON: events/notes/knowns/assumptions), `correct_note`, `userId` |
| `processing_jobs` | `file_path`, `status` (`processing` \| `completed` \| `failed`), `video_url`, `userId`, `started_at` |

All collections are scoped per-user via a `userId` field. Firestore rules enforce owner-only access.

## Local development

```bash
npm install
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build
npm run lint     # oxlint
```

Requires a `.env` file with:
```
VITE_FIREBASE_API_KEY=<firebase web API key>
```

The Firebase project is `matchreviewer-automation` (config is hardcoded in `src/lib/firebase.ts` except the API key).

## Deployment

- **Frontend**: Push to `main` → Vercel auto-deploys (SPA via `vercel.json` rewrite to `/index.html`).
- **Cloud Functions**: `firebase deploy --only functions` (deploys `processMatch`, `manualProcessMatch`, `cleanupOldVideos` to `us-east1`).

## Key constraints

- **7-day retention**: `cleanupOldVideos` deletes videos, match records, notes, and jobs older than 7 days. This is a review tool, not long-term storage.
- **Single-user app**: Currently built for one user. The AI video-analysis pipeline reads that user's saved teams to auto-identify which team they played.
- **Video formats**: react-player handles YouTube links and Firebase Storage (gs://) videos (HLS/DASH). MatchDetail lazy-loads the player so the heavy player libs (~1MB) don't bloat the initial bundle.
