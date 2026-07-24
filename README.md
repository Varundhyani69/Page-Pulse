# Page Pulse 🔍

A full-stack MERN website auditing tool. Paste any URL and get back an instant report — HTTP status, response time, page title, meta description, H1 count, images missing alt text, and word count. Every audit is saved to MongoDB so there's a history log out of the box.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Setup & Running Locally](#setup--running-locally)
3. [API Contract](#api-contract)
4. [Design Decisions](#design-decisions)
5. [Running Tests](#running-tests)
6. [Deployment on Render](#deployment-on-render)
7. [AI Usage](#ai-usage)

---

## Project Structure

```
page-pulse/
├── server/
│   ├── src/
│   │   ├── index.js                  # Entry point — Express setup, middleware, routes, server start
│   │   ├── config/
│   │   │   └── db.js                 # MongoDB connection
│   │   ├── models/
│   │   │   └── Audit.js              # Mongoose schema
│   │   ├── controllers/
│   │   │   └── auditController.js    # Request handlers + fetch/parse logic
│   │   ├── routes/
│   │   │   └── auditRoutes.js        # URL → controller mapping
│   │   └── middleware/
│   │       └── errorHandler.js       # Global error handler
│   ├── tests/
│   │   ├── audit.test.js
│   │   └── fixtures/
│   │       └── sample.html           # Static HTML used in tests
│   ├── .env
│   ├── .env.example
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── components/
│   │       ├── AuditForm.jsx
│   │       ├── ReportCard.jsx
│   │       ├── ErrorMessage.jsx
│   │       ├── Spinner.jsx
│   │       └── Footer.jsx
│   ├── public/
│   │   └── favicon.svg
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
│
├── .gitignore
├── package.json       # Root scripts to run both services together
└── README.md
```

---

## Setup & Running Locally

### Prerequisites

- Node.js ≥ 18 — check with `node -v`
- npm ≥ 9 — check with `npm -v`
- A MongoDB connection string (Atlas free tier — see step 3 below)

### 1 — Clone and install dependencies

```bash
git clone https://github.com/your-username/page-pulse.git
cd page-pulse
npm run install:all
```

`install:all` runs `npm install` inside both `/server` and `/client` in one go.

### 2 — Set up the server environment file

Create `server/.env` by copying the example file:

```bash
# Mac / Linux
cp server/.env.example server/.env

# Windows (Command Prompt)
copy server\.env.example server\.env

# Windows (PowerShell)
Copy-Item server\.env.example server\.env
```

Then open `server/.env` and fill in your values. It should look like this:

```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/pagepulse
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
```

| Variable        | Required | Default                 | Description                          |
|-----------------|----------|-------------------------|--------------------------------------|
| `MONGO_URI`     | ✅        | —                       | Your MongoDB Atlas connection string |
| `PORT`          | ❌        | `5000`                  | Port the API listens on              |
| `CLIENT_ORIGIN` | ❌        | `http://localhost:5173` | Frontend origin allowed by CORS      |

> The client does **not** need a `.env` for local development. Vite's proxy (configured in `client/vite.config.js`) automatically forwards all `/api/*` requests to `http://localhost:5000`.

### 3 — Get a MongoDB Atlas connection string

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2. Create a free **M0** cluster (any region is fine).
3. Under **Database Access** → Add a database user with a username and password.
4. Under **Network Access** → Add IP address `0.0.0.0/0` (allows connections from anywhere).
5. On your cluster, click **Connect → Drivers** → copy the connection string.
6. Paste it into `server/.env` as `MONGO_URI`, replacing `<password>` with your actual password.

It will look something like:
```
MONGO_URI=mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/pagepulse?retryWrites=true&w=majority
```

### 4 — Start both dev servers

You need **two terminals open at the same time** — one for the backend, one for the frontend.

```bash
# Terminal 1 — backend API (auto-restarts on file changes)
npm run dev:server

# Terminal 2 — React frontend (hot reload)
npm run dev:client
```

Once both are running you should see:
- Terminal 1: `MongoDB connected` then `Server running on port 5000`
- Terminal 2: `VITE ready in Xms ➜ Local: http://localhost:5173`

Open **http://localhost:5173** in your browser — paste any URL and click Run Audit.

---

## API Contract

### `POST /api/audit`

Fetch and analyse a URL, save the result to MongoDB, and return the report.

**Request**

```json
POST /api/audit
Content-Type: application/json

{ "url": "https://example.com" }
```

**Success — 200**

```json
{
  "url": "https://example.com",
  "report": {
    "statusCode": 200,
    "responseTimeMs": 312,
    "title": "Example Domain",
    "metaDescription": "This domain is for use in illustrative examples.",
    "h1Count": 1,
    "missingAltCount": 0,
    "wordCount": 280
  }
}
```

**Error responses**

| Scenario                      | Status | `error` message                                        |
|-------------------------------|--------|--------------------------------------------------------|
| Missing / empty `url` field   | 400    | `A "url" field is required in the request body.`      |
| Malformed URL or no scheme    | 400    | `"xyz" is not a valid URL. Please include the scheme…` |
| Site took too long to respond | 504    | `The request to "…" timed out after 8 seconds.`       |
| Host unreachable / DNS fail   | 502    | `Could not reach "…". Check the URL and try again.`   |
| Response is not HTML          | 422    | `The URL returned a non-HTML response (Content-Type…)` |
| Unexpected server error       | 500    | `Something went wrong. Please try again.`             |

---

### `GET /api/audits`

Returns the 10 most recent audits, newest first.

**Success — 200**

```json
[
  {
    "_id": "...",
    "url": "https://example.com",
    "createdAt": "2025-07-24T14:00:00.000Z",
    "report": { "statusCode": 200, "responseTimeMs": 312, ... }
  }
]
```

---

## Design Decisions

These are the three decisions I thought hardest about and would want to defend in a conversation.

### 1 — cheerio over regex for HTML parsing

My first instinct was to reach for a regex — it feels simpler for grabbing a title tag or counting H1s. But real pages are messy: attributes span multiple lines, tags are nested in unexpected ways, and some sites serve minified HTML with no whitespace at all. A regex that works on ten test pages will silently miscount on the eleventh. Cheerio loads the HTML into a proper DOM tree and lets me write `$('h1').length` or `$('meta[name="description"]').attr('content')` — the same way you'd query the DOM in a browser. It handles malformed HTML gracefully, and if I want to add a new metric later (say, broken link count), I add one selector, not one new regex with its own edge cases.

### 2 — Check Content-Type before touching the body

The alternative — just try to parse whatever comes back and catch any errors — sounds pragmatic but creates two real problems. First, if a site never responds, the request hangs until the Node process decides to give up, which could be minutes. By setting an 8-second axios timeout and handling `ECONNABORTED` explicitly, the user gets a clear "timed out" message instead of staring at a spinner. Second, if a URL serves a PDF or a binary file, loading it into cheerio doesn't throw — it just produces junk output that looks like a valid audit with zero words and no title. Checking the `Content-Type` header first costs one line of code and gives a precise, honest error. I'd rather tell the user the truth upfront than return a report that looks wrong.

### 3 — Non-blocking DB writes

When the audit finishes, I save it to MongoDB — but I wrapped that write in its own `try/catch` that only logs a warning on failure. The HTTP response goes out regardless. My reasoning: the core value of the tool is the report, not the history log. If MongoDB is having a bad moment, the user still gets their audit result. The alternative — failing the whole request because the DB write failed — would be annoying and incorrect from a user's perspective. The history feature is a nice-to-have; the audit itself is the product.

---

## Running Tests

```bash
cd server
npm test
```

Jest + Supertest. Mongoose and axios are fully mocked so no real network calls or DB connections happen. The suite covers:

| Test | Expected status |
|------|----------------|
| Valid HTML page (fixture) | 200 — all report fields correct |
| Missing `url` field | 400 |
| Malformed URL string | 400 |
| URL without http/https | 400 |
| Axios timeout | 504 |
| PDF content type | 422 |
| JSON content type | 422 |
| DNS / unreachable host | 502 |
| GET /api/audits | 200 + array |

---

## Deployment on Render

### Backend — Web Service

| Setting        | Value               |
|----------------|---------------------|
| Root directory | `server`            |
| Build command  | `npm install`       |
| Start command  | `node src/index.js` |

**Environment variables:**

| Key             | Value                                  |
|-----------------|----------------------------------------|
| `MONGO_URI`     | Your Atlas connection string           |
| `PORT`          | `10000` (Render's default)             |
| `CLIENT_ORIGIN` | `https://your-frontend.onrender.com`   |
| `NODE_ENV`      | `production`                           |

### Frontend — Static Site

| Setting        | Value           |
|----------------|-----------------|
| Root directory | `client`        |
| Build command  | `npm run build` |
| Publish dir    | `dist`          |

**Environment variables:**

| Key            | Value                                |
|----------------|--------------------------------------|
| `VITE_API_URL` | `https://your-server.onrender.com`   |

### Steps

1. Push the repo to GitHub.
2. On Render: **New → Web Service** → connect repo → root dir `server` → add env vars.
3. **New → Static Site** → same repo → root dir `client` → build `npm run build` → publish `dist` → add `VITE_API_URL`.
4. Both services auto-deploy on every push to `main`.

> The `VITE_API_URL` env var is picked up at build time by Vite. In local dev the proxy in `vite.config.js` handles routing to `localhost:5000`, so you don't need it locally.

---

## AI Usage

I used Kiro (an AI-assisted development environment) throughout this project — for initial scaffolding, wiring up the test mocks, and getting the Vite proxy config right. The AI generated the first version of most files. My role was directing the structure (I pushed back on the original two-file `app.js` + `index.js` split in favour of a single entry point, moved the service logic into the controller, and added the `config/db.js` separation), writing the design decisions, and making the judgment calls described above.
---

*Built for [Digital Heroes Training Task](https://digitalheroesco.com)*
