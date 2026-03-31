# Project Requirements

[![CI](https://github.com/KenguruKleo/doodle-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/KenguruKleo/doodle-frontend/actions/workflows/ci.yml)

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
- **SASS**
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

### 6. Linting & Formatting

- **Lint code**: `npm run lint`
- **Format code**: `npm run format`

### 6. Seeding the Database (Test Data)

To test pagination and scrolling, you can generate 100 test messages. Due to API constraints, backend always overwrites the `createdAt` timestamp with the current server time, so we cannot artificially spread messages over the last 24 hours. The script will generate messages sequentially with a small delay.

```bash
npm run seed
```

## Backend API Investigation Findings

During the initial testing of the backend API, the following undocumented behaviors were discovered, which are crucial for the implementation:

1. **Chronological Sorting:**
   Despite the challenge documentation stating that `GET /api/v1/messages` returns messages in "reverse chronological order", actual tests show that the server returns them in **direct chronological order** (from oldest to newest). This must be accounted for when rendering the chat UI.

2. **Backward Pagination (`before` parameter):**
   The API supports an undocumented `before` query parameter in addition to `after`. This allows for robust cursor-based pagination when scrolling up to load older messages.
   - Example usage: `GET /api/v1/messages?before=<oldest_message_createdAt>&limit=10`
   - This ensures that older messages can be loaded without duplication or missing items as new messages are added in real-time.
