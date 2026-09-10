# AI Interview Prep Kit

Generate a personalized interview-prep kit — company research, categorized
questions, flashcards, and a day-by-day study schedule — from a pasted job
description and a company URL. Built for the "AI Interview Prep Kit"
full-stack engineering assessment.

## 1. Project overview

A user pastes a job description, gives a company website URL and a number
of days until their interview, and the app runs a multi-stage
retrieval + generation pipeline to produce a structured "kit": a company
brief, extracted role requirements, categorized interview questions,
flashcards, a deterministic study schedule, and a deterministic coverage
report. The kit is then fully editable — questions and flashcards can be
edited, added, deleted, reordered, and regenerated section-by-section
without losing manual edits. A practice mode drills flashcards, prioritizing
whatever the user is least confident about. A CLI batch evaluator
(`npm run evaluate`) runs the exact same pipeline over a JSON file of cases
for offline/automated evaluation.

## 2. Features

- Email/password auth with httpOnly session cookies; every kit is
  ownership-scoped server-side.
- Kit creation from a pasted JD + company URL + days, with a live
  multi-stage generation progress view.
- Batch kit creation from an uploaded JSON file of cases (web) and via CLI
  (`npm run evaluate`) — both use the identical pipeline.
- Company research: homepage crawl, signal-based link discovery/ranking (no
  hard-coded paths), bounded page fetching, and a public
  interview-discussion search (DuckDuckGo, keyless).
- Deterministic, code-only coverage checking and a second LLM pass that
  targets only uncovered MUST requirements.
- Deterministic, code-only day-by-day study schedule generation (1–60 days).
- Runtime schema validation (Zod) — an invalid kit is never persisted.
- Full kit builder: edit/add/delete/reorder questions, move category, edit
  company brief, edit/add/delete flashcards, section-level regeneration that
  preserves edited/pinned content.
- Flashcard practice mode with confidence tracking and weak-material-first
  ordering, persisted per card.
- "Interview weak spots" view combining uncovered requirements and
  low-confidence flashcards.
- SSRF-hardened retrieval (protocol allowlist, DNS-rebinding-aware
  connection pinning, redirect/size/content-type/timeout limits, per-host
  rate limiting), with an explicit environment-controlled policy so the
  evaluator can target localhost fixtures while production rejects
  private/loopback targets.
- Prompt-injection defenses: every prompt separates system instructions from
  clearly delimited untrusted content, with an explicit instruction to never
  treat scraped/pasted text as commands.

## 3. Tech stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS +
  TanStack Query + dnd-kit.
- **Backend:** Node.js + Express + TypeScript (ESM), Zod for all schema and
  request validation.
- **Database:** MongoDB via Mongoose; `mongodb-memory-server` for tests.
- **LLM:** Google Gemini (`gemini-flash-latest` by default — a real,
  standing free tier), called via the REST API directly (no SDK
  dependency), with JSON response mode and schema-validated, retry-on-
  invalid-output parsing.
- **Search:** DuckDuckGo's keyless HTML search endpoint for public
  interview-discussion discovery — no API key required out of the box.

## 4. Why this stack

- **Gemini** was chosen over OpenAI/Groq/Anthropic because it has a genuine
  standing free tier with usable JSON-mode structured output, which the
  assessment explicitly requires ("provider with a genuine free tier").
- **Express + Zod** keeps the backend small, typed at every boundary, and
  makes "never save an invalid kit" enforceable with one validator shared by
  generation, the builder, and persistence.
- **Mongoose** over a raw driver gives cheap schema shape + indexes for the
  ownership queries without hiding the underlying documents (still hand-
  written, not code-generated).
- **Next.js App Router + TanStack Query** gives fast client-side data
  fetching/caching with minimal boilerplate for the polling (generation
  progress) and mutation (builder) patterns this app leans on heavily.
- **DuckDuckGo HTML search** avoids requiring the grader to provision a
  second paid API key just to run the app; `SEARCH_API_KEY` is reserved so a
  paid provider can be swapped in later without touching the pipeline shape.

## 5. Architecture

```
backend/src/
  config/        env validation (Zod), logging, MongoDB connection
  controllers/   thin HTTP handlers - no business logic
  middleware/    auth (JWT cookie), request validation, central error handler
  routes/        Express routers
  models/        Mongoose schemas (User, Kit, GenerationRun)
  services/
    retrieval/     SSRF-safe fetch, HTML parsing, link ranking, crawler,
                    interview-discussion search, URL policy
    extraction/     JD -> requirements (LLM, focused prompt)
    generation/     company brief / role / questions / flashcards / gap-fill
                    (LLM, one focused call per concern)
    coverage/       deterministic requirement<->question coverage (pure code)
    scheduling/     deterministic day-by-day schedule (pure code)
    llm/            Gemini client, prompt-injection guard, structured-output
                    parse+validate+retry
    builder/        pure Kit-transform functions (edit/add/delete/reorder/
                    regenerate) + the regeneration orchestration that calls
                    generation services and applies builder transforms
    persistence/    Mongo CRUD, ownership enforcement, re-validates on write
    jobs/           async generation-run orchestration + batch orchestration
    evaluation/      pipeline.ts (THE single pipeline) + batchEvaluate.ts
                      (shared by the web job runner and the CLI evaluator)
  validation/     Zod schemas: the Kit schema (Appendix A), API request
                  bodies, pipeline input, batch cases
  prompts/        versioned prompt templates (system instruction builders)
  scripts/        evaluate.ts (CLI), testCompanySiteServer.ts (fixture site)
  app.ts / server.ts

frontend/src/
  app/            Next.js App Router pages (login, register, dashboard,
                  kits/new, kits/batch, kits/[id])
  components/     shared UI + kit builder components (one per tab)
  lib/            API client, auth context, Kit types, useKit (mutations)
```

Retrieval, extraction, generation, coverage, scheduling, and persistence are
deliberately separate modules with no cross-imports of business logic - the
pipeline (`services/evaluation/pipeline.ts`) is the only place that
sequences them together, and it's the same function called by the web
job runner, the batch-upload job runner, and the CLI evaluator.

## 6. Data model

**User** — `email` (unique), `passwordHash` (bcrypt, 12 rounds), timestamps.

**Kit** — `ownerId` (ref User, indexed), `requestHash` (idempotency),
`source`, `company_brief`, `role` (incl. `requirements[]`), `questions[]`,
`flashcards[]` (each with embedded `practice` state), `schedule`,
`coverage`, `generationMeta` (warnings + retrieval failures from the run
that produced it). Every field name matches the assessment's Appendix A
exactly; `state: "generated"|"edited"|"pinned"` is an additive field on
questions/flashcards/company_brief used only by the builder.

**GenerationRun** — `ownerId`, `requestHash`, optional `batchId`/`caseId`,
`input`, `status`, `stages[]` (append-only progress log), `kitId` once
complete, `error` if failed. Used for progress polling and idempotency; not
part of the persisted Kit shape.

Practice state is embedded on each flashcard (`practice: {confidence,
reviewCount, lastReviewedAt}`) rather than a separate collection - there's
no cross-kit practice analytics requirement, so embedding keeps reads/writes
to one document per kit.

Ownership is always derived from the authenticated session
(`req.userId`, set by the auth middleware from the verified JWT) — the
client never supplies `ownerId`, and every kit read/write goes through
`findKitOwned`/`applyKitMutation`, which 404s on a nonexistent kit and 403s
on someone else's.

## 7. Authentication approach

- Passwords hashed with bcrypt (12 salt rounds); never stored or logged in
  plaintext.
- Sessions are a signed JWT (`SESSION_SECRET`) in an **httpOnly** cookie —
  never readable by frontend JS, so XSS can't exfiltrate it directly.
- Cookie is `SameSite=Lax` in development (frontend/backend are same-site,
  different origin, on localhost) and `SameSite=None; Secure` in production
  (frontend and backend are typically on different domains once deployed).
- `requireAuth` middleware verifies the JWT on every protected route and
  attaches `req.userId`; there is no client-side-only gate — the frontend's
  `RequireAuth` component is a UX nicety (avoids a flash of protected UI),
  not the security boundary.
- No email verification, password reset, or role hierarchy - explicitly out
  of scope per the assessment ("do NOT overbuild").

## 8. Retrieval strategy

1. Fetch the given `company_url` directly (SSRF-checked, see §19).
2. Parse it with Cheerio; strip script/style/nav/footer noise; keep the
   first ~12,000 characters of visible text.
3. Extract every `<a>` on that page, resolve to absolute URLs, dedupe.
4. Rank those links by a **keyword-signal score** (see §9) - never a
   hard-coded path list.
5. Fetch up to 4 of the highest-scoring links (each independently
   SSRF-checked, retried, and failure-tolerant).
6. Every page fetch that fails (timeout, 404, blocked, wrong content-type,
   too large) is recorded in `failures[]` and skipped — it never aborts the
   crawl or the pipeline. If the homepage itself fails, the crawl returns
   zero pages and the company brief says so honestly instead of inventing
   content.
7. Separately, search DuckDuckGo's HTML endpoint for
   `"<company> interview process questions experience"` and parse up to 5
   results (title/url/snippet). If nothing useful comes back, `found:false`
   is recorded and the pipeline continues - a missing hiring page or absent
   public discussion is never treated as a failed case.

## 9. Link ranking strategy

`services/retrieval/linkRanker.ts` scores every discovered link by counting
keyword-signal matches (`career`, `job`, `hiring`, `interview`,
`engineering`, `handbook`, `culture`, `about`, `working`, `life-at`, `team`,
`recruit`, `join-us`, …) in its href and anchor text, with a small same-host
bonus. This is a **scoring function over whatever links the site actually
has**, not a fixed set of guessed paths — a site with no hiring page simply
scores everything low and the crawler fetches nothing beyond the homepage,
rather than inventing `/careers`.

## 10. Public interview-discussion research approach

`services/retrieval/interviewSearch.ts` queries DuckDuckGo's keyless HTML
search endpoint (`html.duckduckgo.com/html/`), parses result titles/URLs/
snippets with Cheerio, and returns up to 5 hits. This needs no API key,
which keeps the assessment runnable out of the box. `SEARCH_API_KEY` is
reserved in the env schema so a paid provider (Serper/Bing/etc.) could be
swapped in without changing the pipeline's shape. If the search fails or
returns nothing, that's recorded as an honest "no public discussion found"
note, not fabricated content.

**This isn't a dead-end lookup** - when results are found, the snippets are
threaded (as clearly delimited, labeled-untrusted context - §20) into the
company-fit question generation call (both the first pass and, if needed,
the gap-fill pass), so company-fit questions can be grounded in real
reported interview format/rounds rather than generic guesses. The model is
explicitly told these are unverified third-party reports, never to be
asserted as confirmed fact. The raw search results are also persisted on
the kit's `generationMeta.interviewDiscussion` (additive, outside the exact
Appendix A shape) and shown on the Company tab in the UI, so what was found
is visible/auditable rather than silently discarded. Verified with a unit
test (`prompts/questionGeneration.v1.test.ts`) that the snippets actually
appear in the generated prompt, and by inspection of a live kit's Company
tab after a real generation run.

## 11. LLM provider / model

Google Gemini via the REST `generateContent` endpoint, called directly with
`fetch` (no SDK dependency). Model is `LLM_MODEL` (default
`gemini-flash-latest`, a stable alias Google keeps pointed at their current
recommended Flash model). `LLM_API_KEY` and `LLM_MODEL` are both
environment-configurable.

## 12. Prompt / generation pipeline

The pipeline (`services/evaluation/pipeline.ts`) runs these stages **in
order**, each a focused LLM call (or pure code) with its own schema-
validated output — never one giant prompt for the whole kit:

1. Read job description (trim/validate).
2. Research company (crawl + rank + fetch, §8–9).
3. Review public interview discussion (§10).
4. Extract requirements from the JD (LLM; only what's actually stated).
5. Generate company brief (LLM; only from fetched page text).
6. Synthesize role summary (LLM; title/seniority/location/responsibilities
   from the JD).
7. Generate questions **per category** - technical, behavioural,
   system-design, company-fit - each its own call with only the requirements
   relevant to that category.
8. Generate flashcards (LLM, from requirements).
9. **Deterministic** coverage check (pure code, §13).
10. **Second pass**: generate targeted questions only for uncovered MUST
    requirements (§14), grouped by category.
11. **Deterministic** coverage re-check.
12. **Deterministic** schedule build (pure code, §15).
13. Final schema validation (Zod) — the kit is only persisted if this
    passes.

Company research and JD extraction happen in parallel-safe stages but the
LLM calls are sequenced (not concurrent) and globally throttled (§18) to
stay under free-tier rate limits.

## 13. Coverage algorithm

`services/coverage/coverageChecker.ts` is pure, deterministic code — the LLM
is never asked whether a requirement is covered:

```ts
uncovered = requirements.filter(r => !questions.some(q => q.requirement_ids.includes(r.id)))
```

`computeUncoveredMustRequirements` filters that down to `priority: "must"`
for the gap-fill pass. Both are exercised directly by unit tests (all-
covered, single/multiple uncovered, nice-to-have uncovered, determinism
across repeated calls).

## 14. Second-pass strategy

After the first generation pass, deterministic coverage identifies
uncovered MUST requirements. If any exist, one **targeted** gap-fill call is
issued per natural category (technical/behavioural/company-fit, mapped from
requirement `kind`) containing only those uncovered requirements — never a
blanket "generate more questions" prompt. Coverage is then re-checked.

**The pipeline runs at most 2 passes** (initial generation = pass 1,
one gap-fill pass = pass 2) and stops early if nothing is uncovered after
pass 1. `coverage.passes` in the output kit reflects exactly this. If MUST
requirements are still uncovered after the gap-fill pass (the model
genuinely couldn't produce a valid question for them), the kit is **not**
marked as fully covered — those ids remain in
`coverage.uncovered_requirement_ids` and a warning is recorded, so the state
is always honest rather than silently claiming full coverage.

## 15. Deterministic scheduling algorithm

`services/scheduling/scheduleBuilder.ts` is pure code (unit-tested for 1,
5, and 60-day cases; see §22):

1. Order all questions: MUST-linked before nice/unlinked, then by
   `difficulty` descending, then by stable id — so the hardest, highest-
   priority material lands earliest.
2. If `daysAvailable <= totalQuestions`: split the ordered list into
   `daysAvailable` chunks (front-loaded remainder), one chunk per day. Every
   question is scheduled exactly once, so every requirement that has at
   least one covering question is guaranteed to appear somewhere in the
   plan.
3. If `daysAvailable > totalQuestions`: the first `totalQuestions` days get
   one fresh chunk each, and the remaining days become **spaced review
   days** that rotate through MUST-linked (or, if none, all) questions in
   groups of up to 3 - so a 60-day schedule never has empty, meaningless
   days.
4. `minutes` is always computed as an integer (`base + perQuestion * count`,
   capped at 180); `days_available` and `schedule.days.length` always equal
   the requested day count exactly.

## 16. Generated / edited / pinned state model

Questions, flashcards, and the company brief each carry a `state`:

- **`generated`** — produced by the pipeline or a section regeneration; safe
  to replace on the next regeneration of that section.
- **`edited`** — the user changed it (inline edit, category move, or a
  manually added item); preserved during regeneration.
- **`pinned`** — explicitly protected via a Pin button; always preserved
  during regeneration until the user deletes it directly.

This is additive to the Appendix A schema - it doesn't rename or remove any
required field.

## 17. Regeneration behavior

`services/builder/kitBuilder.ts` implements each regeneration as a pure
transform over the in-memory kit (re-validated before every save, never
partially applied):

- **Question-category regeneration** replaces only `generated`-state
  questions **in that category**; `edited`/`pinned` questions (in any
  category) are kept untouched. New questions get fresh, non-colliding ids.
  Schedule day structure (focus text, minutes, day count) is preserved;
  only references to *removed* question ids are pruned so the kit stays
  schema-valid — new questions from a regeneration are **not**
  auto-inserted into the existing schedule (that would fight a schedule the
  user may have deliberately shaped); a separate "regenerate schedule"
  action rebuilds it deterministically from the current full question set
  when the user wants that.
- **Flashcard regeneration** follows the same generated-vs-edited/pinned
  rule.
- **Company-brief regeneration** refuses to overwrite an `edited`/`pinned`
  brief unless `force: true` is explicitly passed (a 409 `CONFLICT`
  otherwise) — the assessment's "preserve manually edited/pinned content"
  requirement is treated as a hard default, not a suggestion.
- **Schedule regeneration** is a full replace of the schedule section only
  — it never touches questions, flashcards, or the company brief. Per-day
  edit-state isn't tracked (the exact Appendix A schedule-day schema has no
  room for a `state` field without breaking the required shape), so
  "regenerate schedule" is documented as a whole-section action, consistent
  with how every other section-level regeneration is scoped.
- Every mutation (edit, add, delete, reorder, regenerate) goes through one
  shared persistence path (`applyKitMutation`) that re-validates the
  resulting kit against the Appendix A schema before saving — an invalid
  kit is never written, whether from initial generation or a later edit.

## 18. Rate limiting / retry strategy

- **LLM calls**: exponential backoff with jitter (`utils/retry.ts`), up to 4
  attempts, retrying only 429/5xx/timeout/empty-response — never permanent
  4xx errors. A **global minimum interval** (`LLM_MIN_INTERVAL_MS`, default
  4.5s) is enforced before every call, proactively pacing requests under a
  free-tier RPM limit instead of bursting and relying on backoff to
  recover (this was empirically necessary — see §27 known limitations).
- **LLM structured output**: parsed, schema-validated, and on failure
  retried once with a **correction prompt** that includes the previous
  invalid output and the exact validation errors, up to `maxCorrectionAttempts`
  (default 2) before failing with a classified `LLM_INVALID_OUTPUT` error.
- **Retrieval (crawling/search)**: same backoff utility, retryable only for
  timeouts/5xx/429/network errors (not for a blocked/invalid target or a
  4xx from the target site); a per-host minimum interval throttle
  (`utils/hostRateLimiter.ts`) avoids hammering any one site.
- **API rate limits** (`express-rate-limit`): kit creation (10/min/IP),
  section regeneration (10/min/IP), batch start (5/5min/IP), auth
  (20/15min/IP) — independent of the LLM-side pacing, protecting the server
  itself.

## 19. Security / SSRF protection

- URL shape validated (`http(s)` only) before every fetch.
- `RETRIEVAL_ENV` (`evaluation` | `production`) is an **explicit,
  environment-controlled policy** — not an accidental string check:
  - `evaluation` (used by the CLI evaluator and local dev by default)
    allows localhost/private targets, because the assessment explicitly
    tests localhost company URLs.
  - `production` rejects `localhost`/loopback/private/CGNAT ranges outright.
- **DNS-rebinding mitigation**: the SSRF check doesn't just validate the URL
  once and then fetch separately (a classic TOCTOU gap). `safeFetch.ts`
  installs a custom DNS `lookup` on the HTTP agent (via `undici`'s
  `connect.lookup`) that re-validates *every resolved address* at actual
  connect time — the address the socket connects to is the one checked.
- Manual redirect handling, capped at 3 hops, each hop re-validated through
  the same URL-shape + SSRF check before being followed.
- Response size capped at 2MB (streamed with an early abort, not read-then-
  check).
- Content-type allowlist (`text/html`, `text/plain`, `application/xhtml+xml`)
  — anything else is rejected before its body is read.
- Request timeout (10s) via `AbortController`; per-host rate limiting.
- **Auth/authorization**: every kit route requires a valid session and
  enforces ownership server-side (never trusts a client-supplied owner id);
  centralized error handler never leaks stack traces to the client.
- Secrets (`LLM_API_KEY`, `SESSION_SECRET`, `MONGODB_URI`) only ever read
  from environment variables; `.env` is gitignored; `.env.example` documents
  names without values.

## 20. Prompt-injection handling

Every prompt in `prompts/*.v1.ts` states an explicit injection guard in its
system instruction (`services/llm/promptGuard.ts`,
`PROMPT_INJECTION_GUARD`), and every piece of untrusted content — the JD,
scraped page text, search snippets — is wrapped with explicit
`--- BEGIN UNTRUSTED ... ---` / `--- END UNTRUSTED ... ---` delimiters
(`wrapUntrustedContent`). The model is told directly: text between those
markers is data to analyze, never an instruction, even if it reads like one
("ignore previous instructions", "you are now...", etc.). This is applied
uniformly across requirement extraction, company brief, role synthesis,
question generation, and flashcard generation — there is no prompt in this
codebase that concatenates untrusted text into the system instruction.

## 21. Edge-case handling

- **1-day and 60-day schedules**: see §15; both are unit-tested.
- **Thin JD** (2 lines): produces a thin kit — the extractor is explicitly
  instructed not to pad with invented requirements, and everything
  downstream (questions, flashcards, schedule) scales naturally to however
  few requirements exist.
- **Unreachable/invalid company URL**: recorded as a retrieval failure,
  `source.pages_used` stays empty, the company brief says so honestly, and
  generation continues from the JD alone — this is **not** treated as a
  failed case (verified in the sample evaluator run, `case-04`).
- **No public interview discussion found**: recorded, generation continues.
- **Duplicate submission** (same jd+company_url+days from the same user
  while a prior run is still pending/running): enforced **atomically at the
  database level** - a partial unique index on `{ownerId, requestHash}`
  scoped to `pending`/`running` runs (`models/GenerationRun.ts`), not an
  application-level "check, then create" (which has a TOCTOU race under
  genuine concurrency - two simultaneous identical requests can both pass a
  plain `findOne` check before either write lands). `startGenerationRun`
  optimistically inserts and treats a duplicate-key error as "someone else
  just won the race," returning their run (`deduplicated: true`) instead of
  starting a second pipeline. A prior *completed* run doesn't block
  resubmission — the user may legitimately want a fresh kit. Verified with
  `tests/idempotency.test.ts`, including a `Promise.all` of two genuinely
  concurrent identical requests asserting exactly one `GenerationRun` is
  created (an earlier find-then-create version of this failed that exact
  test - the fix and the test that caught it are both in the repo).
- **LLM rate limiting**: classified `LLM_RATE_LIMITED`, retried with
  backoff; if still exhausted, the case/run fails with that code rather than
  hanging or crashing the batch.

## 22. Tests

Backend, run with `npm test` (Vitest):

- `services/scheduling/scheduleBuilder.test.ts` — 1/5/60-day cases, integer
  minutes always, every MUST requirement scheduled somewhere, difficult/
  MUST content earlier, no empty days, zero-question edge case, only
  referencing real question ids.
- `services/coverage/coverageChecker.test.ts` — fully covered, single/
  multiple uncovered, nice-to-have uncovered, determinism, MUST-only
  filtering.
- `validation/kitSchema.test.ts` — valid kit accepted; missing field,
  invalid difficulty/category/priority/kind, dangling schedule/question
  references, non-integer minutes, mismatched `days_available`, duplicate
  ids all rejected.
- `services/builder/kitBuilder.test.ts` — edited/pinned questions and
  flashcards survive category regeneration; `force` overrides; dangling
  schedule references pruned on removal; coverage recomputed on question
  changes; company-brief regeneration refuses to overwrite edits without
  `force`.
- `services/evaluation/batchEvaluate.test.ts` — continues after a case
  fails, preserves case ids and order, structurally invalid cases fail
  without calling the pipeline, output matches the required
  `{version, generated_at, kits[]}` shape.
- `services/retrieval/companyName.test.ts` — company-name heuristic.
- `prompts/questionGeneration.v1.test.ts` — public interview-discussion
  snippets actually appear (wrapped as untrusted content) in the
  company-fit generation prompt when present, and are omitted when absent.
- `tests/auth.ownership.test.ts` (Supertest + `mongodb-memory-server`) —
  register/login/logout, password never stored in plaintext, protected
  routes reject missing/invalid sessions, and **ownership isolation**: a
  second user gets 403 reading/deleting someone else's kit, and kit listing
  is scoped per-user.
- `tests/idempotency.test.ts` (Supertest + a stubbed pipeline, no real
  LLM/network calls) — two **genuinely concurrent** (`Promise.all`)
  identical submissions produce exactly one `GenerationRun` and the same
  `runId`; a different `days` value is not deduplicated; a prior
  *completed* run does not block resubmission; two different users
  submitting the identical request each get their own run.

Run: `cd backend && npm test` (60 tests, no network/LLM calls required — the
evaluator continuation test injects a fake pipeline runner, and the
idempotency test stubs the pipeline module, rather than hitting Gemini).

## 23. Local setup

Prerequisites: Node.js 20+, npm, and either Docker (for local MongoDB) or an
existing MongoDB instance.

```bash
# 1. Install dependencies (npm workspaces - installs both packages)
npm install

# 2. Start MongoDB locally
docker compose up -d

# 3. Configure environment
cp backend/.env.example backend/.env      # fill in LLM_API_KEY at minimum
cp frontend/.env.example frontend/.env.local

# 4. Run both apps
npm run dev:backend     # http://localhost:4000
npm run dev:frontend    # http://localhost:3000
```

Backend tests don't need Docker/Mongo running (they spin up
`mongodb-memory-server`), but do read `backend/.env` for `LLM_API_KEY` (only
the evaluator/live-generation paths actually call it).

## 24. Environment variables

**`backend/.env`** (see `backend/.env.example`):

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development` \| `production` \| `test` |
| `PORT` | Backend port (default 4000) |
| `MONGODB_URI` | MongoDB connection string |
| `SESSION_SECRET` | JWT signing secret (≥16 chars) |
| `LLM_API_KEY` | Google Gemini API key |
| `LLM_MODEL` | Gemini model id (default `gemini-flash-latest`) |
| `LLM_MIN_INTERVAL_MS` | Min ms between LLM calls (default 4500) |
| `SEARCH_API_KEY` | Reserved for a paid search provider; unused by default |
| `FRONTEND_URL` | Allowed CORS origin |
| `BACKEND_URL` | Informational; used in docs/links |
| `RETRIEVAL_ENV` | `evaluation` \| `production` (§19); defaults from `NODE_ENV` if unset |

**`frontend/.env.local`** (see `frontend/.env.example`):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API |

## 25. Deployment

Production builds are verified (`npm run build` succeeds for both
packages); actual hosting accounts/credentials were not available in this
environment, so no live URL is claimed here — these are the exact steps to
deploy.

**Backend** (any Docker-capable host — Render/Railway/Fly.io/etc.):
- `backend/Dockerfile` builds and runs `dist/server.js`.
- `render.yaml` at the repo root is a ready-to-use Render blueprint —
  connect the repo, Render reads it, fill in the `sync: false` secrets
  (`MONGODB_URI`, `LLM_API_KEY`, `FRONTEND_URL`, `BACKEND_URL`) in the
  dashboard.
- Health check: `GET /health` → `{"status":"ok",...}`.
- Set `RETRIEVAL_ENV=production` in any real deployment (SSRF hardening);
  the evaluator/local-dev default of `evaluation` is intentionally not the
  production default.

**Frontend** (Vercel — zero config for Next.js):
- Import the repo, set the project root to `frontend/`, set
  `NEXT_PUBLIC_API_URL` to the deployed backend URL.
- No `vercel.json` needed for a standard Next.js App Router app.

**Database**: any MongoDB Atlas free-tier cluster works — set
`MONGODB_URI` on the backend host.

**CORS/cookies**: the backend only allows `FRONTEND_URL` as an origin and
sends `SameSite=None; Secure` cookies in production so auth works across
the two separate deployed domains (§7).

## 26. Batch evaluator usage

```bash
cd backend
npm run evaluate -- --input samples/cases.json --output samples/kits.output.json
```

- Uses `services/evaluation/pipeline.ts` — the **exact same** pipeline as
  kit creation in the web app; `scripts/evaluate.ts` only does argv
  parsing + file I/O, and `services/evaluation/batchEvaluate.ts` (shared,
  unit-tested) does the per-case loop.
- Continues after any individual case failure; every input case produces
  exactly one output entry, in order, with its `id` preserved.
- Output matches Appendix B exactly:
  `{"version":"1.0","generated_at":"...","kits":[{"id","status","kit","error"}]}`.
- Defaults `RETRIEVAL_ENV=evaluation` (localhost/relative-link company URLs
  work) unless the caller overrides it.
- Requires only `LLM_API_KEY` in `backend/.env` — no MongoDB needed to run
  the evaluator.
- `samples/cases.json` ships 5 cases exercising: a full JD against a
  multi-page localhost fixture site (relative-link following), a case that
  starts mid-site (not the homepage) to exercise the crawler's own link
  discovery, a deliberately thin (2-line) JD, a deliberately **unreachable**
  company URL (verifies graceful degradation, not case failure), and a
  14-day schedule.
- A local fixture company site is included for this:
  `npm run fixture-server` (serves a small multi-page site with relative
  links at `http://localhost:8099/`) — start it before running the
  evaluator against `samples/cases.json`.
- **Verified run**: all 5 sample cases completed successfully in **6m41s**
  (well under the 15-minute budget for 5 cases), using `gemini-3.5-flash-lite`
  after the default flash model's free-tier daily quota was exhausted during
  testing (see Known Limitations).

## 27. Known limitations

- **Free-tier LLM daily quota is small.** While testing, `gemini-flash-latest`
  returned `RESOURCE_EXHAUSTED` after ~20 requests/day on the API key used
  for development (a Google free-tier limit, not a bug in this app) - see
  the raw quota error captured during testing:
  `generate_content_free_tier_requests, limit: 20`. The pipeline classifies
  this correctly as `LLM_RATE_LIMITED`/`LLM_UNAVAILABLE` and continues past
  it per-case, but a real evaluation run needs a key with adequate quota
  (a paid tier, or a fresh key) for the model configured in `LLM_MODEL`.
- **No true spaced-repetition algorithm.** Practice mode uses a simple
  confidence-weighted ordering (low → never-practiced → medium → high) as
  the assessment recommends ("rather than overengineering spaced
  repetition"), not a full SM-2/Leitner scheduler.
- **Schedule regeneration is whole-section.** Per-day edits aren't
  individually preserved across a schedule regeneration (§17) - the exact
  required schedule-day schema has no field to track that, unlike questions/
  flashcards/brief.
- **Company-name derivation is a heuristic**, not guaranteed — it picks
  the page-title segment that recurs across multiple fetched pages (falls
  back to the URL hostname), since page-title conventions aren't
  standardized across sites.
- **No actual deployment was performed** in this environment (no hosting
  credentials available) - see §25 for the exact, verified-buildable steps.

## 28. Design trade-offs

- **Async generation via polling, not WebSockets.** `GenerationRun` +
  `GET /api/runs/:id` polling was chosen over a WebSocket/SSE channel for
  simplicity and reliability across typical free-tier hosts that don't
  always support long-lived connections well; the trade-off is ~1.5s of
  poll latency on progress updates, not correctness.
- **Section regeneration is synchronous, full-kit creation is
  asynchronous.** A single-category regeneration is 1 LLM call (a few
  seconds); full generation is 8-12 sequential LLM calls (up to a few
  minutes) and gets the job/polling treatment. This avoids building two
  parallel progress-tracking systems for what is, for the smaller
  operations, a genuinely fast request/response.
- **Batch cases run sequentially, not in parallel.** Given free-tier LLM
  rate limits are the actual bottleneck (§27), parallelizing cases would
  just produce more 429s and retries, not a faster wall-clock result - the
  evaluator's 15-minute budget is met comfortably sequential.
- **DuckDuckGo HTML scraping over a paid search API.** Keeps the assessment
  runnable with only one API key; the trade-off is a less structured
  result set than a real search API would give, mitigated by parsing
  actual result markup (not regex-guessing) and failing gracefully to
  "no discussion found" rather than crashing on markup changes.
