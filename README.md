# Foundica – Founder Report (MVP)

A free report for AI/ML and deeptech founders:

- **Founder-Market Fit score (0–100)**: seven signals weighted for the AI era (insight and buyer access count more than coding).
- **AI-Durability score (0–100)** and **market half-life in years**: eight tests of whether the product survives 5–10 years of AI progress, with a year-by-year outlook and the moves that extend it.
- **Competitor map with citations**: live web research, Perplexity-style numbered sources ([1], [2]…) that link to the real pages.
- **Critic agent**: checks every score and flags unsupported claims; scores are recomputed in code after its corrections.
- **Free PDF download** with all sources.

## How it works

```
Founder form (3 steps)
   │
   ├─► Founder-Market Fit agent ─────────────┐   (runs in parallel)
   └─► Research agent + Claude web search ───┤   streams each search + page found to the screen
                                             ▼
            Competitor mapping agent (only companies found in the research, with source ids)
                                             ▼
            AI-durability agent (8 tests, half-life, 2026–2031 outlook)
                                             ▼
            Critic agent → adjusts scores → report → PDF
```

Every source shown to the founder comes from Claude's web search citations. Source ids that an agent invents are dropped, and market facts without a source are removed.

## Run locally

```bash
npm install
cp .env.example .env.local      # then add your ANTHROPIC_API_KEY
npm run dev                     # http://localhost:3000
```

No API key yet? Run with sample data: `MOCK_AI=1 npm run dev` (sources point at example.com and the report is clearly marked as demo).

## Deploy (Vercel)

1. Push this folder to a GitHub repo.
2. In Vercel: **Add New → Project**, import the repo (framework: Next.js, defaults are fine).
3. Add environment variables: `ANTHROPIC_API_KEY` (required) and any optional ones below.
4. Deploy. The assessment route allows up to 300 s; check that your Vercel plan allows that function duration.

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Required. From console.anthropic.com. Web search must be enabled for your organization in the Claude Console. |
| `FOUNDICA_MODEL` | Model for all agents (default `claude-sonnet-5-5`). |
| `FOUNDICA_MAX_SEARCHES` | Web searches per report (default 6). Searches are billed per use. |
| `FOUNDICA_RATE_LIMIT_PER_HOUR` | Reports per IP per hour (default 5). In-memory, so use a real store (e.g. Upstash Redis) once you have traffic. |
| `FOUNDICA_ACCESS_CODE` | If set, founders need this code (private beta). |
| `FOUNDICA_LEAD_WEBHOOK_URL` | Founders who give an email and tick consent are POSTed here (email, startup, scores). Works with Zapier, Make or a Google Apps Script → Sheet. |
| `NEXT_PUBLIC_FOUNDICA_CONTACT_EMAIL` | Shows a "Request an expert review" button on reports. |
| `MOCK_AI` | `1` = sample data, no API calls. |

## Cost per report (rough)

Five agent calls plus up to `FOUNDICA_MAX_SEARCHES` web searches. Check current prices for your model and web search on Anthropic's pricing page, then set `FOUNDICA_MAX_SEARCHES` and the rate limit to fit your budget.

## Tests

```bash
npm test          # citation extraction, scoring, critic adjustments, PDF text, full mock pipeline
```

## Project layout

- `app/page.tsx`: landing page
- `components/Assess.tsx`: 3-step form, live research screen, saved reports (browser only)
- `components/ReportView.tsx`, `components/Cite.tsx`: report tabs and citation chips
- `app/api/assess/route.ts`: streams progress events (NDJSON) and the final report
- `app/api/report/route.ts` + `lib/pdf.tsx`: PDF download
- `lib/pipeline.ts`: agents, prompts, scoring, critic
- `lib/llm.ts`: Claude API calls (web search, pause_turn handling)
- `lib/citations.ts`: turns search citations into numbered sources

## Known limits (MVP)

- Reports are saved only in the founder's browser. Add a database (e.g. Supabase) to keep reports, track outcomes and build the Foundica data moat.
- The rate limiter is in memory.
- The built-in PDF fonts are Latin-only: other scripts are dropped from the PDF (the web report shows them fine).
- AI output can be wrong; the report says so and links every claim to its source.

## Launch build (chat workspace, accounts, payments)

- `/app` is the product: a chat-style workspace (sidebar history, composer, live agent run with sources, report and problem map inline). The landing and policy pages live in `app/(site)`.
- **Intake agent** (`/api/intake`): the founder writes in plain words; the agent fills the fields; the next question is chosen in code (`lib/intake.ts`).
- **Accounts**: email 6-digit code (Resend), signed session cookie (`AUTH_SECRET`), optional WhatsApp number for updates. Without `RESEND_API_KEY` the code is shown on screen (test mode only).
- **Storage**: Upstash Redis via REST (`KV_REST_API_URL/TOKEN`). Users, credits, reports, maps. Falls back to memory locally.
- **Payments**: Dodo Payments checkout → credits granted once per payment id (webhook `/api/pay/webhook` and return check `/api/pay/confirm`). No key = free.
- Pilot pricing: ₹499 per credit, ₹999 for 3. One credit = one Founder Report or one Problem Map. Customer-loop updates are free.
- Local test with everything mocked: `MOCK_AI=1 DODO_PAYMENTS_API_KEY=mock_x npm run dev`.

## Founder journey (stages 2 and 3)

- Stage 2 **Problem map**: buyer research (live web search) + problem-map agent → workflow, who pays, workaround, cost, problem layers, 6 riskiest assumptions, where to find buyers (cited), interview script.
- Stage 3 **Customer loop**: each logged interview marks assumptions validated / killed, adds new ones and writes next questions. Evidence score = interviews (up to 40) + risk-weighted assumptions resolved (up to 60).
