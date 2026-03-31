# Doodle FE Challenge

[![CI](https://github.com/KenguruKleo/doodle-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/KenguruKleo/doodle-frontend/actions/workflows/ci.yml)
![Coverage](./badges/coverage.svg)

**Reference:** [Challenge Description](./docs/challenge.md)

**API Reference:** [OpenAPI Schema](./docs/openapi.json)

## Tech Stack & Architecture

### Core Technologies

- **React**
- **TypeScript**

### State Management

- **Redux + RTK** (Redux Toolkit)

### Styling & UI Architecture

- **Tailwind CSS** (with Theme Setup)
- **Responsive Design** (Mobile-first approach)
- **Presentational UI Components**: "Dumb" components with re-render controls (using `React.memo` when necessary)

### API & Data Fetching

- **OpenAPI Schema**
- **OpenAPI Schema Client Generator** (using `@hey-api/openapi-ts` for strictly typed API client)
- **Infinite Scroll Pagination**: Fetching older messages seamlessly using the undocumented `before` query parameter supported by the backend.

### Code Quality & Testing

- **Unit Tests**: Vitest + React Testing Library
- **Linter Rules**: Strict linting configuration (ESLint + Prettier)
- **Pre-commit Hooks**: Husky + lint-staged (runs linter and unit tests before committing)

### CI/CD Pipeline

- **GitHub Actions**: Automated workflows (run unit tests followed by other actions)

## Local Setup & Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and configure it if needed:

```bash
cp .env.example .env
```

This file includes the following configuration options:

- `VITE_API_BASE_URL`: The base URL of the backend API (default: `http://localhost:3000/api/v1`)
- `VITE_API_TOKEN`: The bearer token used for authorization (default: `super-secret-doodle-token`)
- `VITE_CURRENT_USER`: The name of the current user sending messages in the chat (default: `Michael`)

### 3. Start the Development Server

```bash
npm run dev
```

### 4. Generate the API Client

If the OpenAPI schema (`docs/openapi.json`) changes, regenerate the API client by running:

```bash
npm run api:generate
```

This will output the new TypeScript client to `src/api/generated`.

### 5. Running Tests

- **Run tests once**: `npm run test:run`
- **Run tests in watch mode**: `npm run test`
- **Run tests with UI**: `npm run test:ui`
- **Run tests with Coverage**: `npm run test:coverage` (generates coverage reports using v8)

To view the coverage reports online, go to the GitHub repository, click on the **Actions** tab, select the latest "CI" workflow run, and look at the **Summary** page. A detailed coverage table will be displayed there automatically.

### 6. Linting & Formatting

- **Lint code**: `npm run lint`
- **Format code**: `npm run format`

### 6. Seeding the Database (Test Data)

To test pagination and scrolling, you can generate 100 test messages. Due to API constraints, backend always overwrites the `createdAt` timestamp with the current server time.

```bash
npm run seed
```

## Docker & Deployment

The application includes a `Dockerfile` optimized for production, using **Caddy** as a lightweight web server. It uses Caddy's template directive to inject environment variables at runtime, which means you only need to build the image once and can reuse it across different environments.

### 1. Build the Docker Image

```bash
docker build -t doodle-frontend .
```

### 2. Run the Container

You can pass environment variables dynamically during runtime:

```bash
docker run -p 8080:80 \
  -e VITE_API_BASE_URL="http://localhost:3000/api/v1" \
  -e VITE_API_TOKEN="super-secret-doodle-token" \
  -e VITE_CURRENT_USER="Michael" \
  doodle-frontend
```

Now the application will be accessible at `http://localhost:8080`.

### 3. CI/CD (Automated Publishing to Docker Hub)

The project includes a GitHub Action workflow (`.github/workflows/docker.yml`) that automatically builds and pushes the Docker image to Docker Hub whenever changes are pushed to the `main` branch.

To enable this, configure the following **Repository Secrets** in your GitHub repository (`Settings` > `Secrets and variables` > `Actions`):

- `DOCKERHUB_USERNAME`: Your Docker Hub username (e.g., `kengurukleo`).
- `DOCKERHUB_TOKEN`: A Personal Access Token (PAT) generated in your Docker Hub account settings.

Once configured, the image will be published to `kengurukleo/doodle-frontend` with the `latest` tag and a short Git SHA tag.

## Backend API Investigation Findings

During the initial testing of the backend API, the following undocumented behaviors were discovered, which are crucial for the implementation:

1. **Chronological Sorting & Default Behavior:**
   Despite the challenge documentation stating that `GET /api/v1/messages` returns messages in "reverse chronological order", actual tests show that the server returns them in **direct chronological order** (from oldest to newest). Furthermore, a request without pagination parameters returns the **oldest** messages in the database, not the latest.

2. **Fetching Latest Messages (`before` parameter):**
   To fetch the most recent messages on initial load, we must query using `before` set to the current time:
   `GET /api/v1/messages?limit=20&before=<current_time_iso_string>`.
   This instructs the server to return the latest 20 messages up to the current moment.

3. **Backward Pagination:**
   The API supports an `before` query parameter in addition to `after`. This allows for robust cursor-based pagination when scrolling up to load older messages.
   - Example usage: `GET /api/v1/messages?before=<oldest_message_createdAt>&limit=10`
   - This ensures that older messages can be loaded without duplication or missing items as new messages are added in real-time.
