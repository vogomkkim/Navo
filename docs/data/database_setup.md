# Database Setup for Navo

This document outlines the necessary configurations for setting up the PostgreSQL database connection across different environments (local, development, production).

## 1. PostgreSQL Connection String (DATABASE_URL)

The application connects to the PostgreSQL database using a `DATABASE_URL` environment variable. This URL typically follows the format:

`postgresql://[user]:[password]@[host]:[port]/[database]`

*   **User, Password, Host, Port, Database Name**: These credentials are provided by your PostgreSQL hosting provider (e.g., Render for production, or your local PostgreSQL setup).

## 2. SSL Configuration

For production environments like Render, SSL is often required. The current `server.ts` configuration includes:

```typescript
ssl: {
  rejectUnauthorized: false,
},
```

*   `rejectUnauthorized: false`: This setting is used to allow connections to databases with self-signed or untrusted SSL certificates, which is common in some cloud environments like Render.
*   **Local Development**: For local PostgreSQL setups, you might not need SSL, or you might configure it differently. Adjust this setting as needed for your local environment.

## 3. Environment Variable Setup

Ensure the `DATABASE_URL` environment variable is correctly set in each environment:

*   **Render (Production)**: Set `DATABASE_URL` directly in your Render service's environment variables.
*   **Local Development**:
    *   You can use a `.env` file at the root of your project.
    *   Example `.env` entry: `DATABASE_URL="postgresql://user:password@localhost:5432/navo_db"`
    *   Ensure your application loads environment variables from `.env` (e.g., using `dotenv` package).
*   **Other Environments (e.g., Work Desktop)**: Follow the best practices for setting environment variables in those specific operating systems or development setups.

## 4. Node.js Version

The project is configured to use Node.js version `22.x`. Ensure your development and deployment environments use a compatible version to avoid unexpected issues.

*   **Render**: Automatically uses `22.x` as specified in `package.json`.
*   **Local**: Use a Node Version Manager (e.g., `nvm`) to install and switch to Node.js `22.x`.

## 5. Postgres MCP Server Setup

This refers to the setup of the Postgres Multi-Cloud Proxy server, which is a separate component. Details for this setup should be documented here once finalized.
