# Katha Studio — Architecture Notes

This document describes the implementation represented by the repository snapshot. It is intentionally explicit about the current browser-local persistence model and the future deployment target.

## Runtime components

| Component | Responsibility | Location |
|---|---|---|
| KathaWorkspace | Dashboard, story input, screenplay, casting, voice library, studio, published and settings screens | `src/components/katha/KathaWorkspace.tsx` |
| Katha server functions | Prisma STT, Timbre TTS, Groq screenplay generation and provider health checks | `src/lib/katha.functions.ts` |
| Voice catalogue | Timbre v2.5 voice metadata and language-specific sample lines | `src/lib/katha/voices.ts` |
| Audio utilities | Duration validation, browser-side audio normalization, PCM WAV encoding and duration formatting | `src/lib/katha/audio.ts` |
| Audio persistence | IndexedDB blob storage helpers | `src/lib/katha/storage.ts` |
| TanStack routes | Route-to-workspace page mapping | `src/routes/` |
| Root/start/server | Query provider, SSR shell, CSRF/error middleware and server entry | `src/routes/__root.tsx`, `src/start.ts`, `src/server.ts` |

## System context

```mermaid
flowchart LR
    U[Storyteller] --> B[Browser: Katha Studio]
    B <--> M[(localStorage\nProject metadata)]
    B <--> A[(IndexedDB\nAudio blobs)]
    B --> S[TanStack Start server functions]
    S --> P[Gnani Prisma v2.5]
    S --> T[Gnani Timbre v2.5]
    S --> G[Groq Chat Completions]
    P --> S
    T --> S
    G --> S
    S --> B
    B --> W[Web Audio API\nWAV composition]
    A --> W
    W --> U
```

## Story production sequence

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Katha Studio
    participant Browser as Browser audio APIs
    participant Server as TanStack server functions
    participant STT as Gnani Prisma
    participant LLM as Groq
    participant TTS as Gnani Timbre
    participant DB as IndexedDB

    User->>UI: Enter text or narrate story
    alt Narrated story
        UI->>Browser: Record/upload audio
        Browser->>Browser: Decode, validate <= 30s, resample and encode WAV
        UI->>Server: transcribeKathaAudio(audio, language)
        Server->>STT: POST /stt/v3
        STT-->>Server: transcript + model metadata
        Server-->>UI: editable transcript
    else Written story
        User->>UI: Submit story text
    end
    UI->>Server: generateKathaScreenplay(story, language, notes)
    Server->>LLM: Chat Completions request with JSON response format
    LLM-->>Server: screenplay JSON
    Server->>Server: Zod validation
    Server-->>UI: characters, scenes and dialogue
    User->>UI: Assign voice per speaker
    loop Each line without cached audio
        UI->>Server: generateKathaSpeech(text, voice, language, speed)
        Server->>TTS: Timbre v2.5 inference
        TTS-->>Server: WAV bytes
        Server-->>UI: Base64 audio + MIME type
        UI->>DB: Save audio Blob
    end
    User->>UI: Export production
    UI->>DB: Read dialogue Blob records in screenplay order
    UI->>Browser: Decode, place clips, add 300ms gaps, encode PCM WAV
    Browser-->>User: Download production WAV
```

## Persistence model

```mermaid
flowchart TB
    PROJECT[StudioProject] --> LS[(localStorage)]
    LS --> STORAGEKEY[katha-studio-projects-v1]
    PROJECT --> SCENES[StudioScene[]]
    SCENES --> LINES[StudioLine[]]
    LINES --> ASSETREF[ audioAssetId ]
    PROJECT --> SOURCE[storyAudioAssetId]
    PROJECT --> FINAL[audioAssetId]
    ASSETREF --> IDB[(IndexedDB)]
    SOURCE --> IDB
    FINAL --> IDB
    IDB --> DBNAME[katha-studio-assets]
    DBNAME --> STORE[audio-assets object store]
    STORE --> BLOB[StoredAudio: id, blob, name, type, createdAt]
```

A project's JSON metadata is stored under `katha-studio-projects-v1`. Audio bytes are stored in IndexedDB under database `katha-studio-assets`, object store `audio-assets`. The project references audio by asset ID. A temporary object URL is created when audio is loaded for playback.

## External API boundaries

### Gnani Prisma

- Server function: `transcribeKathaAudio`.
- Endpoint: `https://api.vachana.ai/stt/v3`.
- Authentication header: `X-API-Key-ID`.
- Request: multipart form data containing `audio_file` and `language_code`.
- Response check: transcript string and `model === "prisma-v2.5"`.

### Gnani Timbre

- Server function: `generateKathaSpeech`.
- Endpoint: `https://api.vachana.ai/api/v1/tts/inference`.
- Authentication header: `X-API-Key-ID`.
- Model: `timbre-v2.5`.
- Inputs: text, voice, preferred/requested language and speed (0.85–1.15).
- Output: WAV audio bytes returned to the browser as Base64 and saved to IndexedDB.

### Groq

- Server function: `generateKathaScreenplay`.
- Endpoint: `https://api.groq.com/openai/v1/chat/completions`.
- Authentication: Bearer token.
- Response mode: JSON object.
- Validation: Zod schema with bounded title, synopsis, characters, scenes and lines.

## Deployment topology

```mermaid
flowchart TB
    REPO[GitHub repository] --> BUILD[Vercel build pipeline]
    BUILD --> CLIENT[Client/static assets]
    BUILD --> SERVER[TanStack Start server functions via Nitro]
    VISITOR[Visitor browser] --> CLIENT
    CLIENT -->|server-function calls| SERVER
    SERVER --> GNANI[Gnani API]
    SERVER --> GROQ[Groq API]
    VISITOR <--> LOCAL[(Browser localStorage + IndexedDB)]
```

The application source currently uses `@lovable.dev/vite-tanstack-config` in `vite.config.ts`. The comments in that file describe a Cloudflare-default Nitro target. Vercel deployment requires replacing/adapting that Lovable-specific Vite configuration to the supported TanStack Start + Nitro Vercel setup. See the Vercel deployment guide linked from the root README.

## Current persistence boundary

There is no database connection or Supabase package in the current source. The browser storage model is suitable for a single-browser prototype, not a shared multi-user production service. A cloud-backed version should introduce:

1. Authentication and user identity.
2. PostgreSQL tables for projects, characters, scenes, lines and asset metadata.
3. Private object storage for recordings, line audio and exports.
4. Row-level security / ownership checks.
5. Local data migration from localStorage and IndexedDB.
6. Signed downloads or authenticated file access.
