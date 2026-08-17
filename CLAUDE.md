# CLAUDE.md — AI context for this repo

Pokémon Champions Match Reviewer. React 19 + Vite frontend on Vercel, Firebase backend (Auth + Firestore + Storage + Cloud Functions), Gemini 2.5 Flash for video analysis. See README.md for the full architecture overview.

## Architecture map

```
src/
  main.tsx              Entry point → App
  App.tsx               Auth gate + Router + global modals (upload/team) + FAB + GlobalProgress
  AppContext.ts         Context holding upload/team modal open state (used by FAB + pages)
  index.css             Global stylesheet — SINGLE source of truth for .input-field, .tab-btn, .btn-primary
  lib/
    firebase.ts         Firebase init (db, storage, functions[us-east1], auth). Config hardcoded except API key.
    types.ts            Team, Match, MatchNote, PokemonInfo, Result types
    pokepaste.ts        Showdown paste parser + sprite/stat helpers (getShowdownSpriteName, calculateStat, NATURES)
  pages/
    Home.tsx            Match list (infinite scroll) + expandable MatchDetail (lazy-loaded). MatchDetailWrapper handles mount/unmount animation.
    MatchDetail.tsx     Video player (react-player) + 3 tabs: Details (result/team/opponent), Notes (per-turn 4-pane editor), Improvements. Video↔turn timestamp sync.
    TeamsManager.tsx    Team cards grid + create/edit modal (pokepaste in, pokemon icons out)
    UploadMatch.tsx     Modal: YouTube link OR Storage browser (lists videos/{userId}/, "Process AI" → manualProcessMatch)
  components/
    MatchRow.tsx        Match list row (my team icons vs opponent icons, W/L/T badge, expand/delete) — React.memo
    OpponentTeamTab.tsx 6-slot opponent team editor (PokemonSearch per slot, type icons, writes opponent_team to match doc)
    PokemonSearch.tsx   Autocomplete from PokeAPI list (module-level cached fetch — shared across all 6 slots)
    PokemonIcon.tsx     Showdown gen5 sprite <img> with poke-ball fallback
    TypeIcons.tsx       18 type-badge SVGs keyed by type name
    MarkdownEditor.tsx  Textarea ↔ ReactMarkdown preview toggle
    GlobalProgress.tsx  Fixed widget showing active processing_jobs (onSnapshot)
    FloatingActionMenu.tsx  FAB: nav, upload, mobile setup, teams, create team, logout
    ShortcutGuide.tsx   iOS/Android upload-shortcut setup instructions modal
    Login.tsx           Email/password auth (sign in + sign up, remember-me persistence)
    ui/                 Button, Input, Modal primitives + ui.css (modal/.btn/.input-wrapper/.tabs-header styles)
functions/src/index.ts  Cloud Functions (see below)
```

## Cloud Functions (functions/src/index.ts, region us-east1)

- **`processMatch`** — `onObjectFinalized` Storage trigger for `videos/{userId}/*`. Runs Gemini video analysis, creates/updates a `matches` doc + per-turn `match_notes` (with timestamps).
- **`manualProcessMatch`** — `onCall`. Takes `{ filePath }`, same analysis flow (used by Storage Browser tab).
- **`cleanupOldVideos`** — `onSchedule` daily 00:00. Deletes videos/matches/notes/jobs older than 7 days.

### AI video-analysis pipeline (runVideoReview)
1. Reads user's saved teams from Firestore, builds a prompt listing them.
2. Calls **Gemini 2.5 Flash** via Vertex AI (us-central1) with the video file + a structured prompt (see `prompt` in index.ts). Response is JSON matching `responseSchema`.
3. The prompt instructs the model to: identify which saved team is the user's (`own_team_id`), list the opponent's 6 Pokemon, determine win/loss/tie, and produce per-turn timestamps **only** (events/notes/knowns/assumptions are forced to empty strings — the user fills those in manually).
4. Writes `matches` doc + batch-writes `match_notes` (one per turn, `tab: 'select'` for turn 0, `'battle'` for 1+, `timestamp` in seconds, `actual_note` = JSON with empty fields).
5. If re-processing an existing video, deletes old notes first to avoid duplicates.

## Data conventions

- **Timestamps**: stored as integer seconds in `match_notes.timestamp`. UI displays/edits as `MM:SS`.
- **Pokemon names**: lowercase hyphenated for PokeAPI/sprites (e.g. `urshifu-rapid-strike`, `ogerpon-hearthflame`). `getShowdownSpriteName()` in pokepaste.ts handles form→sprite-name mapping. Sprites: `https://play.pokemonshowdown.com/sprites/gen5/{name}.png`.
- **Pokepaste**: parsed by `parsePokepaste()` into `ParsedPokemon[]` (name, item, ability, teraType, evs, ivs, nature, moves).
- **opponent_team**: array of up to 6 `{name, id}` (null-padded to 6 in OpponentTeamTab to preserve slot anchors).

## Important gotchas

- **CSS import order**: `index.css` is the single source of truth for `.input-field`, `.tab-btn`, `.btn-primary`. `ui.css` must NOT redefine these (it did previously — caused global style conflicts). ui.css owns `.btn`, `.input-wrapper`, `.input-label`, `.modal-*`, `.tabs-header`, `.card`, `.markdown-preview` only.
- **MatchDetail is lazy-loaded** (`React.lazy` in Home.tsx) to keep react-player + dashjs + hls.js (~1MB) out of the initial bundle. Keep that lazy boundary — don't static-import MatchDetail.
- **MatchDetailWrapper** uses a delayed-unmount pattern (render kept for 200ms after collapse) to allow the CSS grid-rows animation. `shouldRender` is set in `useEffect`, never during render.
- **notesCache** (Home.tsx) is a `useRef` map keyed by matchId — prevents refetching notes when expanding/collapsing. Not React state (would cause re-renders).
- **Video↔turn sync**: MatchDetail polls for the inner `<video>` element after ReactPlayer mounts, attaches `timeupdate`/`seeked` listeners that map current time → nearest turn timestamp. Seeking a turn sets `currentTime`; changing turn seeks to its timestamp.
- **Firebase Functions region**: us-east1. The frontend calls `getFunctions(app, 'us-east1')`.
- **Build warnings**: `dash.all.min.js` emits a harmless `COMMONJS_VARIABLE_IN_ESM` warning from node_modules. The `INEFFECTIVE_DYNAMIC_IMPORT` warning was fixed by using a static `firebase/storage` import in MatchDetail.

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build (type-checks + bundles)
npm run lint     # oxlint (react + typescript + oxc plugins)
```
