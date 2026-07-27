# Signal Clone — Secure Messaging Platform

A functional clone of Signal's core messaging experience: real-time 1:1 and
group chat, contacts, delivery/read receipts, typing indicators, and a UI
built to feel like the real app. Built as an SDE Fullstack assignment.

> Real end-to-end cryptography is **not** implemented. Encryption is
> simulated per the assignment spec (see the banner in the chat header) —
> messages are transmitted over HTTPS/WSS and stored as plaintext in the
> database, same as most non-E2EE chat apps.

## Tech stack

| Layer      | Choice                                              |
|------------|------------------------------------------------------|
| Frontend   | Next.js 15 (App Router, TypeScript), Tailwind CSS v4  |
| Backend    | FastAPI (Python), SQLAlchemy ORM                      |
| Database   | SQLite                                                |
| Real-time  | Native WebSockets (single `/ws` endpoint, no polling) |
| Auth       | JWT (python-jose), mocked OTP verification            |

## Project structure

```
signal-clone/
├── backend/
│   ├── app/
│   │   ├── main.py            FastAPI app, CORS, router registration
│   │   ├── database.py        SQLAlchemy engine/session setup
│   │   ├── models.py          ORM models (schema below)
│   │   ├── schemas.py         Pydantic request/response models
│   │   ├── auth.py            Password hashing, JWT issue/verify, mocked OTP
│   │   ├── ws_manager.py      In-memory WebSocket connection registry
│   │   ├── seed.py            Sample data seeder
│   │   └── routers/
│   │       ├── auth.py        /auth/* (register, login, request-otp, me)
│   │       ├── contacts.py    /contacts/* (list, add, search)
│   │       ├── conversations.py  /conversations/* (CRUD, messages, members)
│   │       └── ws.py          /ws (WebSocket: presence, typing, live push)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── app/
        │   ├── login/page.tsx     Login + registration (mocked OTP) flow
        │   └── chat/page.tsx      Main app: state, WebSocket wiring
        ├── components/            Sidebar, ChatWindow, MessageBubble,
        │                          NewChatModal, NewGroupModal, InfoPanel
        └── lib/                   API client, auth context, WebSocket hook,
                                    types, formatting helpers
```

## Setup

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed        # creates signal_clone.db and seeds sample data
uvicorn app.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`. Interactive API docs at
`http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # defaults already point at localhost:8000
npm run dev
```

Frontend runs at `http://localhost:3000` and redirects to `/login`.

### Demo accounts (seeded)

| Username | Password    |
|----------|-------------|
| shashank | password123 |
| aarav    | password123 |
| priya    | password123 |
| kabir    | password123 |
| neha     | password123 |

Log in as two different users in two browser windows (or one normal + one
incognito) to see real-time delivery, typing indicators, and read receipts
in action.

To register a brand-new account instead, use "Create account" — OTP
verification is mocked and the code is shown on-screen (`123456`) instead
of being sent via SMS.

## Database schema

```
users(id, username, phone, display_name, avatar_url, avatar_color,
      password_hash, created_at, last_seen, is_online)

contacts(id, user_id -> users.id, contact_user_id -> users.id, created_at)
  -- one-directional edge; a mutual add creates two rows

conversations(id, type[direct|group], name, avatar_color, created_by, created_at)

conversation_members(id, conversation_id -> conversations.id,
                      user_id -> users.id, role[member|admin],
                      joined_at, last_read_message_id)
  -- last_read_message_id drives the unread badge and read-receipt cutoff

messages(id, conversation_id -> conversations.id, sender_id -> users.id,
         content, status[sending|sent|delivered|read], created_at)

message_receipts(id, message_id -> messages.id, user_id -> users.id,
                  status[delivered|read], updated_at)
  -- one row per (message, recipient); lets group chats track
     per-member delivery/read state instead of a single global status
```

**Design notes**
- `conversation_members` is shared by both direct and group chats — a
  direct chat is just a 2-member conversation — which keeps the messaging
  and receipt logic identical for both without a separate 1:1 code path.
- `message_receipts` is per-recipient rather than a single status on the
  message row, so a group message can be "delivered" to one member and
  "read" by another simultaneously. The `status` column on `messages`
  itself reflects the sender's own bubble state (sent → delivered once
  *any* recipient has it delivered → read once the *last* recipient reads
  it, checked against `last_read_message_id`).

## API overview

| Method | Path                                   | Purpose                              |
|--------|-----------------------------------------|---------------------------------------|
| POST   | `/auth/request-otp`                    | Mocked OTP send (returns the code)    |
| POST   | `/auth/register`                       | Verify OTP + create account           |
| POST   | `/auth/login`                          | Username/password login               |
| GET    | `/auth/me`                             | Current session's user                |
| GET    | `/contacts`                            | List saved contacts                   |
| POST   | `/contacts`                            | Add a contact by username             |
| GET    | `/contacts/search?q=`                  | Search users by username/name         |
| GET    | `/conversations`                       | List conversations, sorted by activity, with last message + unread count |
| POST   | `/conversations/direct`                | Start (or reuse) a 1:1 conversation   |
| POST   | `/conversations/group`                 | Create a group                        |
| GET    | `/conversations/{id}/messages`         | Full message history                  |
| POST   | `/conversations/{id}/messages`         | Send a message (persists + broadcasts over WebSocket) |
| POST   | `/conversations/{id}/read`             | Mark conversation read, emits read receipts |
| POST   | `/conversations/{id}/members`          | Add group members                     |
| DELETE | `/conversations/{id}/members/{userId}` | Remove a member (admin-only, or self) |
| WS     | `/ws?token=`                           | Live events: `new_message`, `typing`, `read_receipt`, `presence`, `conversation_updated` |

All routes except `/auth/*` and `/ws` require `Authorization: Bearer <token>`.

## What's implemented vs. placeholder

**Implemented:** mocked auth/OTP, contacts + search, 1:1 and group
messaging over WebSocket, persisted history, delivery/read receipts,
typing indicators, unread badges, online/last-seen, group admin controls
(add/remove members), Signal-style UI (conversation list + chat pane,
bubble styling, checkmarks).

**Placeholder ("Coming soon"):** voice/video calls, stories, linked
devices, attachments, reactions, disappearing messages, notification/
privacy settings — all shown in the UI as non-functional stubs per the
assignment's allowed placeholder list.

## Assumptions made

- OTP is a fixed code (`123456`) for every phone number, per the spec's
  "verification can be mocked" note — no SMS provider is integrated.
- A single JWT secret is hardcoded for local/demo use
  (`backend/app/auth.py`); this would move to an environment variable
  before any real deployment.
- "Online" status is derived purely from an open WebSocket connection —
  there's no separate heartbeat/idle-timeout logic.
- Direct-conversation de-duplication: starting a new chat with someone you
  already have a 1:1 conversation with reopens the existing thread instead
  of creating a duplicate.
- Password hashing uses SHA-256 for simplicity in this demo; a production
  build would use bcrypt/argon2 with per-user salts.

## Deployment

- **Backend:** any host that runs a long-lived Python process with
  WebSocket support (Render, Railway, Fly.io). Uses SQLite by default —
  fine for a demo, but swap `DATABASE_URL` in `backend/app/database.py`
  for Postgres if the platform's disk isn't persistent.
- **Frontend:** Vercel — set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`
  to the deployed backend's HTTPS/WSS URL in the project's environment
  variables.
