# Architecture Overview

Navo combines a client‑side visual editor with a DI + DAG orchestrator to generate, build, and deploy projects quickly and safely.

## Components

- Client: Visual Editor (canvas, side panel, chat), Preview, Publish UI
- Orchestrator: Node Graph runner with DI, timeouts, and retries
- Services: generation (LLM, image), storage, deploy/CDN, analytics

## Component System Architecture

The component system has been refactored to separate platform logic from user component logic:

### Phase 1: Component Rendering Logic Separation

- **`components.js`**: Handles all component rendering logic, separated from platform code
- **`app.js`**: Focuses on platform logic (authentication, project management, AI commands)
- **ES6 Modules**: Modern JavaScript module system for better code organization

### Phase 2: Dynamic Component Loading System

- **Database-driven Components**: Component definitions stored in `component_definitions` table
- **Template-based Rendering**: HTML templates with variable substitution (`{{variable}}`)
- **Dynamic Loading**: Components loaded at runtime from database via API
- **Fallback System**: Maintains backward compatibility with hardcoded components

### Component Definition Schema

```sql
model component_definitions {
  id              String   @id
  name            String   @unique        -- Component type name (Header, Hero, etc.)
  display_name    String                  -- User-friendly display name
  description     String?                 -- Component description
  category        String                  -- Component category (basic, forms, etc.)
  props_schema    Json                    -- JSON Schema for component properties
  render_template String                  -- HTML template with placeholders
  css_styles      String?                 -- Component-specific CSS
  is_active       Boolean  @default(true) -- Whether component is available
}
```

### Benefits

- **Scalability**: New component types can be added without code changes
- **Maintainability**: Platform and user logic clearly separated
- **Flexibility**: Components can be customized per user/project
- **Performance**: Components loaded on-demand, reducing initial bundle size

## Flow

1. User completes onboarding and requests a draft.
2. Orchestrator executes generation nodes (copy, image) in parallel.
3. Build node composes a page or layout JSON.
4. Deploy node builds and publishes to CDN, returning a public URL.
5. Client receives updates and shows progress; analytics capture events.

## DI + Node Graph

- Node: small job with inputs/outputs and dependencies
- DI: shared services (APIs, config, logger)
- Graph: validated as a DAG; independent nodes run concurrently

## Data (sketch)

- users, projects, pages, components, assets
- events (view, click, publish), suggestions, publish_deploys

## Data Storage Rationale

The project uses a database as the primary source of truth for content and metadata, rather than managing content directly in Git files. This decision is based on the following reasons:

- **Speed & Latency**: Database queries are significantly faster for the frequent, granular read/write operations required by a real-time visual editor, compared to the slower `git commit/push/pull` cycle.
- **Granular Control**: A database allows for atomic updates to small pieces of data (e.g., a single component's properties), which is more efficient than file-based operations.
- **Concurrency**: Databases are designed to handle simultaneous operations from multiple users, which is crucial for future real-time collaboration features.
- **Analytics**: A structured database is necessary for efficiently querying and aggregating the data needed for the analytics and AI suggestion features.

The architecture uses a hybrid model:

1.  **Database as Source of Truth**: The editor interacts directly with the database for a fast and responsive user experience.
2.  **Git as Deployment Target**: When a user publishes their project, the system generates the necessary files from the database and commits them to a Git repository, which then triggers a CI/CD pipeline for deployment.

### Scalability

Database size is managed through two key strategies:

- **Assets**: Large binary files (images, videos) are not stored in the database. The `assets` table only contains a URL pointing to the file's location in a dedicated object storage service (e.g., AWS S3).
- **Events**: The `events` table, which can grow large, can be managed with standard data engineering practices like TTL (Time-To-Live) policies, archiving, or aggregating raw data into summary tables as the service scales.

## Observability

- Structured logging per node with duration and outcome
- Event stream for editor changes and publishes
- Basic metrics: success rate, retries, P95 latency by node

## Reliability & Safety

- Isolate steps; retry or re‑run a single node when safe
- Rollback last 3 publishes
- Contract‑first interfaces between nodes

## Performance Goals

- Draft generation perceived in ~10 s (with mocks early on)
- Editor interactions ≤ 200 ms
- Publish ≤ 60 s average

See `README.md` for the canonical summary and goals.

## MCP Server Configuration

The Model Context Protocol (MCP) server is a component designed to facilitate interaction between AI models and external data sources, such as databases. In this project, the MCP server is configured to connect to a PostgreSQL database hosted on Render. For the overall platform deployment strategy, including Render's role, refer to the [Platform Configuration & Deployment Strategy](../../docs/plan/platform-deployment-strategy.md) document.

Configuration details for the MCP server, including database connection strings, are managed within the `settings.json` file located in the project root. This file contains an `mcpServers` object where individual server configurations are defined.

For connecting to Render PostgreSQL, the `connectionString` within the `mcpServers` configuration specifies the database URL. It is crucial to use environment variables for sensitive credentials (like passwords) to enhance security, rather than hardcoding them directly in `settings.json`. Additionally, `sslmode=require` is used in the connection string to ensure a secure, encrypted connection to the PostgreSQL database.

Example configuration in `settings.json`:

```json
{
  "mcpServers": {
    "renderPostgres": {
      "type": "postgresql",
      "config": {
        "connectionString": "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"
      },
      "description": "Render PostgreSQL connection for Navo data."
    }
  }
}
```
