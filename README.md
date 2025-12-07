# FireResume AI (Day 4 of 30 Days of Product)

ATS-friendly resume tailoring with JD analysis and exports.

## Live demo
- Visit https://lawrencehua.com/fireresume-ai

## Problem & Solution
- **Problem:** Tailoring resumes to each JD is slow and often fails ATS scans.
- **Solution:** Upload resume + JD, analyze gaps, configure sections, and export ATS-friendly docs.

## What’s inside
- Standalone Next.js app with upload → configure → preview → export flow.
- APIs: `/upload`, `/analyze-jd`, `/generate`, `/export` backed by `lib/fireresume-ai/*`.
- FireResume-specific components and types; `.env.example` placeholders to fill.

## Run locally
1. Install deps: `npm install`
2. Copy `.env.example` to `.env` and provide your values
3. Start dev server: `npm run dev`
4. Open `http://localhost:3000`

## Notes
- For demos, use the live link above.
- Repo name: FireResume AI (Day 4 of 30 Days of Product)

## Architecture
```mermaid
flowchart TD
  U[User] --> UI[Next.js UI]
  UI --> API1[/api/fireresume-ai/upload]
  UI --> API2[/api/fireresume-ai/analyze-jd]
  UI --> API3[/api/fireresume-ai/generate]
  UI --> API4[/api/fireresume-ai/export]
  API1 --> L[lib/fireresume-ai]
  API2 --> L
  API3 --> L
  API4 --> L
  L --> OAI[OpenAI API]
  UI --> CMP[components/fireresume-ai/*]
  UI --> TYPES[types/fireresume-ai]
```

## Sequence
```mermaid
sequenceDiagram
  participant User
  participant UI as FireResume UI
  participant Upload as /api/fireresume-ai/upload
  participant JD as /api/fireresume-ai/analyze-jd
  participant Gen as /api/fireresume-ai/generate
  participant Export as /api/fireresume-ai/export
  participant OpenAI

  User->>UI: Upload resume + JD
  UI->>Upload: POST files/text
  Upload->>OpenAI: Parse resume (ai-parser)
  Upload-->>UI: ResumeData + JDAnalysis
  UI->>JD: Optional JD analysis
  JD-->>UI: Role inference + match data
  User->>UI: Configure sections/order
  UI->>Gen: POST generate request
  Gen->>OpenAI: Create tailored resume content
  Gen-->>UI: GeneratedResume
  User->>UI: Export PDF/DOCX
  UI->>Export: POST export request
  Export-->>User: Downloaded file
```
