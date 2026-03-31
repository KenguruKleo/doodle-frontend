# Project Requirements

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
- **OpenAPI Schema Client Generator** (Auto-generated API client)
- **Infinite Scroll Pagination**: Fetching older messages seamlessly using the undocumented `before` query parameter supported by the backend.

### Code Quality & Testing
- **Unit Tests**: React Testing Library
- **Linter Rules**: Strict linting configuration

### CI/CD Pipeline
- **GitHub Actions**: Automated workflows (run unit tests followed by other actions)

## Backend API Investigation Findings

During the initial testing of the backend API, the following undocumented behaviors were discovered, which are crucial for the implementation:

1. **Chronological Sorting:**
   Despite the challenge documentation stating that `GET /api/v1/messages` returns messages in "reverse chronological order", actual tests show that the server returns them in **direct chronological order** (from oldest to newest). This must be accounted for when rendering the chat UI.

2. **Backward Pagination (`before` parameter):**
   The API supports an undocumented `before` query parameter in addition to `after`. This allows for robust cursor-based pagination when scrolling up to load older messages.
   - Example usage: `GET /api/v1/messages?before=<oldest_message_createdAt>&limit=10`
   - This ensures that older messages can be loaded without duplication or missing items as new messages are added in real-time.
