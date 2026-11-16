# Mindflow 🌿

**A calmer space to reflect, journal, and grow.**

Mindflow is a full-stack private journaling application. This refreshed version uses React for the user interface, Express and Node.js for the API, and MongoDB for persistence. It includes a redesigned authentication experience, mood-aware reflections, search and filtering, a responsive dashboard, light/dark themes, Docker, and a GitHub Actions CI pipeline.

> Mindflow supports personal reflection. It is not a medical service, diagnostic tool, or substitute for professional mental-health care.

## Highlights

- **Modern authentication:** responsive sign-in and sign-up screens, password confirmation, visibility toggle, input validation, clear loading and error states.
- **Personal journal:** create, edit, and delete private reflections.
- **Mood check-in:** Great, Good, Okay, Low, Anxious, and Neutral mood choices.
- **Reflection prompts:** rotate through gentle writing prompts when you need a starting point.
- **Dashboard:** reflection totals, today's count, days reflected, and searchable/filterable entries.
- **Themes:** persistent light and dark modes.
- **Responsive UI:** desktop, tablet, and mobile layouts; reduced-motion support and keyboard focus states.
- **Security foundations:** bcrypt password hashing, JWT-protected journal routes, environment-based secrets, Helmet, CORS allowlist, rate limiting, and per-user data scoping.
- **Containerized development:** Dockerfiles and Docker Compose for the React web app, API, and MongoDB.
- **CI:** GitHub Actions validates backend syntax, runs frontend tests, builds React, and builds both Docker images.

## Tech stack

| Layer          | Technology                |
| -------------- | ------------------------- |
| Frontend       | React 19, CSS             |
| Backend        | Node.js 22, Express 5     |
| Database       | MongoDB 7 / MongoDB Atlas |
| Authentication | JWT, bcryptjs             |
| Containers     | Docker, Docker Compose    |
| CI             | GitHub Actions            |
| Web server     | Nginx                     |

## Project structure

```text
Mindflow/
├── .github/workflows/ci-cd.yml
├── server/
│   ├── Dockerfile
│   ├── index.js
│   ├── models/
│   │   ├── Journal.js
│   │   └── user.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── journal.js
│   ├── .env.example
│   └── frontend/
│       ├── Dockerfile
│       ├── nginx.conf
│       ├── public/
│       └── src/
│           ├── App.js
│           ├── Auth.js
│           ├── Journal.js
│           ├── api.js
│           ├── App.css
│           └── index.css
├── docker-compose.yml
└── README.md
```

## Run locally (without Docker)

### Requirements

- Node.js 20+ (Node.js 22 recommended)
- npm
- MongoDB local instance or MongoDB Atlas database

### 1. Configure the API

```bash
cd server
cp .env.example .env
```

Set `MONGO_URI` and replace `JWT_SECRET` with a long random secret (at least 32 characters). Keep `.env` private and never commit it.

Example:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/mindflow
JWT_SECRET=replace-with-a-long-random-secret-of-at-least-32-characters
CLIENT_URL=http://localhost:3000
```

Install and start the API:

```bash
npm install
npm run dev
```

The API runs at `http://localhost:5000`. Check `http://localhost:5000/health`.

### 2. Configure and start React

Open a second terminal:

```bash
cd server/frontend
cp .env.example .env
npm install
npm start
```

The React app opens at `http://localhost:3000`. `REACT_APP_API_URL` defaults to `http://localhost:5000`.

## Run the full stack with Docker

From the repository root, set a secure JWT secret and start all services:

**PowerShell**

```powershell
$env:JWT_SECRET = "replace-with-a-long-random-secret-of-at-least-32-characters"
docker compose up --build
```

**macOS / Linux**

```bash
export JWT_SECRET="replace-with-a-long-random-secret-of-at-least-32-characters"
docker compose up --build
```

Open **http://localhost:8080**. Docker Compose starts MongoDB, waits for its health check, starts the API, and then serves the React build through Nginx. MongoDB data is stored in the `mongo_data` Docker volume.

Stop the stack:

```bash
docker compose down
```

Stop and delete the local MongoDB volume (this permanently deletes local container data):

```bash
docker compose down -v
```

## API overview

| Method | Endpoint            | Purpose                     | Auth         |
| ------ | ------------------- | --------------------------- | ------------ |
| GET    | `/`                 | API status                  | No           |
| GET    | `/health`           | API and database health     | No           |
| POST   | `/auth/signup`      | Create account              | No           |
| POST   | `/auth/login`       | Sign in                     | No           |
| GET    | `/auth/me`          | Validate current session    | Bearer token |
| GET    | `/api/journals`     | List current user's entries | Bearer token |
| POST   | `/api/journals`     | Create reflection           | Bearer token |
| PUT    | `/api/journals/:id` | Update reflection           | Bearer token |
| DELETE | `/api/journals/:id` | Delete reflection           | Bearer token |

Example journal payload:

```json
{
  "entry": "I took a walk and felt more settled afterwards.",
  "mood": "Good"
}
```

## CI pipeline

The workflow at `.github/workflows/ci-cd.yml` runs on pushes and pull requests to `main` and `master`, and can also be started manually from the GitHub Actions tab.

It currently:

1. Installs backend dependencies and checks server JavaScript syntax.
2. Installs frontend dependencies, runs tests, and builds the React production bundle.
3. Builds the API and frontend Docker images.

**Deployment note:** this is a CI pipeline and Docker image build pipeline. It does not automatically publish images or deploy to a cloud provider. To enable continuous deployment, add registry credentials and deployment secrets for your chosen hosting provider, then add a protected deploy job. Never place secrets directly in workflow YAML.

## Deploying to cloud

- **MongoDB:** create a MongoDB Atlas cluster and configure its connection string as `MONGO_URI`.
- **Backend:** deploy the `server` directory using `server/Dockerfile` or a Node runtime. Configure `PORT`, `MONGO_URI`, `JWT_SECRET`, and `CLIENT_URL`.
- **Frontend:** deploy `server/frontend` using its Dockerfile, or run `npm run build` and host the `build` folder. Set `REACT_APP_API_URL` to your public API base URL at build time.
- Update CORS `CLIENT_URL` to the exact frontend origin(s), comma-separated if more than one.

## Security and privacy notes

- Passwords are stored as bcrypt hashes; plain-text passwords are never stored.
- JWT signing uses `JWT_SECRET` from the environment. Use a unique, high-entropy secret in every environment.
- Journal endpoints verify the token and scope reads, edits, and deletes to the authenticated user.
- Helmet, JSON request size limits, and authentication rate limiting are enabled.
- The current browser client stores the JWT in `localStorage` for a straightforward portfolio-project setup. For a production deployment handling sensitive personal writing, consider migrating to secure, HttpOnly, SameSite cookies, adding CSRF protection, account recovery, email verification, and a formal privacy policy.
- Do not commit real credentials, Atlas connection strings, or `.env` files.

## Legacy data

Existing MongoDB user accounts can continue to sign in if their username and password records are unchanged. Existing journal documents remain readable; older entries without a `mood` field display as Neutral. The original app stored mood text inside the `entry` field, so review and migrate those legacy records if you want to split mood and entry into separate fields.

## License

Add a license file before distributing this project publicly. Mindflow is a personal software project and is not a medical or emergency service.
