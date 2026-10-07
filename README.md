# Fireflies-style Meeting & Transcript Workspace

A full-stack Fireflies.ai-inspired meeting workspace built for the SDE Fullstack assignment.

## What is included

- Next.js + TypeScript frontend
- FastAPI backend
- SQLite + SQLAlchemy persistence
- Seeded meeting library
- Search/filter/sort meetings
- Meeting detail notebook with transcript + AI summary + outline + action items
- Timestamp seeking and transcript highlighting
- CRUD for meetings and action items
- Live meeting rooms with unique shareable URLs
- Participants can join the same room from different browsers/devices
- WebRTC peer-to-peer audio/video signaling through FastAPI WebSockets
- Shared live transcript with polling
- One-click sample conversation for demos
- AI-style summary generation after a live room ends
- Settings/calendar/contacts/channels placeholders

## Important product scope

The assignment explicitly makes real speech-to-text and production integrations optional/out of scope. This implementation therefore makes the meeting experience realistic without pretending to provide a full speech-to-text vendor integration:

1. The live room uses WebRTC for browser-to-browser audio/video when browser permissions are granted.
2. The transcript can be entered during the demo or populated with the sample conversation button.
3. When the host ends the meeting, the backend converts captured transcript lines into a persisted meeting transcript and creates an AI-style summary, topics, outline, and follow-ups.
4. The AI text is generated locally from the transcript using deterministic heuristics; it is clearly an app-generated demo summary rather than a claim of actual LLM transcription.

For a production deployment, the transcript input can be replaced by Deepgram, AssemblyAI, Whisper, Google Speech-to-Text, or another STT service and the summary function can be replaced by an LLM API.

## Architecture

```text
Browser A ─────── WebRTC media ─────── Browser B
    │                                      │
    └──── WebSocket signaling ─────────────┘
                    │
                    ▼
             FastAPI backend
             ├── REST API
             ├── WebSocket signaling
             ├── SQLite / SQLAlchemy
             └── Summary generator
                    │
                    ▼
               meetings.db
```

WebRTC media is peer-to-peer. The FastAPI WebSocket endpoint only relays signaling messages (offers, answers, ICE candidates).

## Database schema

### meetings
- id
- title
- meeting_date
- duration_seconds
- source

### participants
- id
- name
- email

### meeting_participants
- meeting_id
- participant_id

### transcript_segments
- id
- meeting_id
- speaker
- start_seconds
- end_seconds
- text

### summaries
- id
- meeting_id
- overview
- keywords
- notes
- outline

### action_items
- id
- meeting_id
- task
- owner
- due_date
- completed

### meeting_rooms
- id
- meeting_id
- token
- host_name
- status
- created_at
- started_at
- ended_at

### room_participants
- id
- room_id
- name
- joined_at

### room_messages
- id
- room_id
- speaker
- text
- timestamp_seconds
- sequence
- created_at

## Run locally

### Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs:

`http://localhost:8000/docs`

### Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open:

`http://localhost:3000`

The frontend defaults to `http://localhost:8000/api`.

## Live meeting demo

1. Open `http://localhost:3000`.
2. Click **Start live meeting**.
3. Enter a title and your name.
4. Click **Create meeting room**.
5. Copy the generated invite URL.
6. Open the URL in another browser/incognito window and enter another participant name.
7. Allow microphone/camera permissions to use WebRTC audio/video.
8. Use **Simulate sample conversation** for a realistic transcript demo, or add transcript lines manually.
9. Click **End meeting**.
10. The app redirects to the saved meeting notebook with the generated summary, topics, outline and action items.

### Sharing the link with an evaluator

A local URL such as `http://localhost:3000/room/...` only works on your machine. To share it publicly, deploy the frontend and backend first. Then the generated URL will use your deployed frontend domain.

## Deployment

### Backend

The repository contains `render.yaml` for Render. Deploy the `backend` directory as a Python web service.

### Frontend

Deploy `frontend` to Vercel or another Next.js host.

Set:

```text
NEXT_PUBLIC_API_URL=https://YOUR-BACKEND-DOMAIN/api
NEXT_PUBLIC_WS_URL=wss://YOUR-BACKEND-DOMAIN
```

Example:

```text
NEXT_PUBLIC_API_URL=https://fireflies-clone-api.onrender.com/api
NEXT_PUBLIC_WS_URL=wss://fireflies-clone-api.onrender.com
```

Because the live room uses WebSockets and WebRTC, the deployed backend must support WebSockets and HTTPS/WSS.

## API overview

### Meetings

- `GET /api/meetings`
- `GET /api/meetings/{id}`
- `POST /api/meetings`
- `PUT /api/meetings/{id}`
- `DELETE /api/meetings/{id}`
- `PUT /api/meetings/{id}/transcript`
- `POST /api/meetings/{id}/generate-summary`

### Action items

- `POST /api/meetings/{id}/action-items`
- `PUT /api/action-items/{id}`
- `DELETE /api/action-items/{id}`

### Live rooms

- `POST /api/rooms`
- `GET /api/rooms/{token}`
- `POST /api/rooms/{token}/join`
- `POST /api/rooms/{token}/messages`
- `POST /api/rooms/{token}/end`
- `WS /ws/rooms/{token}?name=...`

## Assumptions

- Authentication is intentionally mocked with a default workspace/user because real authentication is explicitly optional in the assignment.
- SQLite is used for local development and assignment evaluation.
- For a production system, PostgreSQL would be preferable.
- TURN servers should be added for reliable WebRTC connectivity across restrictive enterprise/mobile networks.
- The current AI summary is a deterministic local generator so the demo works without a paid LLM key.

## Evaluation talking points

Be ready to explain:

- Why the database is normalized into meetings, participants, transcript segments, summaries and action items.
- Why `meeting_participants` is a many-to-many join table.
- Why WebRTC media is peer-to-peer while WebSocket is used only for signaling.
- How the share token maps a public URL to a meeting room.
- How the room is converted into a persisted meeting when ended.
- How transcript timestamps drive the interactive notebook.
- How the AI summary can later be swapped for an LLM provider.

## Enhanced demo features

The enhanced build preserves the original live-room and post-meeting workflow and adds the assignment bonus layer without changing that core flow:

- **AI Assistant:** select any meeting and ask questions about its summary, action items, participants, topics, decisions, or transcript. The demo uses a deterministic local assistant so no paid API key is required; the endpoint is isolated at `POST /api/meetings/{id}/ask` and can later be swapped for an LLM provider.
- **Dark mode:** Settings → Appearance → Dark. The choice is stored in browser local storage and applies across the workspace.
- **Transcript highlights:** double-click a transcript line to highlight it.
- **Transcript comments:** use `Add note` on any transcript segment. Notes persist in the browser for the demo.
- **Soundbites:** copy a timestamped transcript quote from any segment.
- **Export:** meeting pages can export Markdown and TXT, or open the browser print dialog for PDF export.
- **Global search:** meeting search now checks title, source, participant names, and transcript text.
- **Topics/tags:** seeded summary keywords are exposed as topic filters on the Meetings dashboard.
- **Placeholder product areas:** integrations, real bot/STT, authentication, collaboration and calendar remain intentionally scoped as placeholders, per the assignment.

### AI assistant API example

```http
POST /api/meetings/1/ask
Content-Type: application/json

{"question":"What decisions were made?"}
```

The implementation is intentionally provider-free for the assignment demo. For production, replace the local extractive logic in `ask_meeting_assistant` with a provider such as OpenAI/Anthropic/Azure OpenAI and keep the same API contract.

## UI polish
The latest frontend includes a colorful Fireflies-inspired visual system, responsive sidebar, gradient meeting dashboard, polished live-room entry, and a dedicated demo login screen at `/login`. Existing meeting, AI assistant, settings, dark mode, live room, transcript, export, search, tags, and CRUD features are preserved.
