# Navo Engine: Available Tools List

**Version:** 1.0
**Status:** Active

This document is a quick reference for all available Tools within the Navo Workflow Engine.

---

### Project & Architecture
- **create_organization** - Creates a new organization (tenant) for a user.
- **create_project_in_db** - Creates a new project record in the database.
- **create_project_architecture** - Analyzes a user's request to generate a detailed project blueprint (pages, components, file structure).
- **compile_blueprint_to_vfs** - Compiles a project blueprint into a complete file and directory structure within the project's VFS.
- **scaffold_project_from_blueprint** - (Legacy) Scaffolds a project's file structure in the VFS from a blueprint.

### VFS (Virtual File System)
- **create_vfs_file** - Creates a new file or **updates the entire content** of an existing file in the VFS.
- **create_vfs_directory** - Creates a new directory in the VFS.

### Code Generation
- **generate_backend_code_from_plan** - Generates Fastify backend route code from an API Blueprint and saves it to the VFS.
- **generate_deno_functions_from_blueprint** - Generates Deno serverless function scripts from an API Blueprint and saves them to the VFS.

### General Purpose & System
- **run_shell_command** - Executes a shell command and returns its output.
- **list_directory** - (Local FS) Lists contents of a directory on the local file system.
- **read_file** - (Local FS) Reads the content of a file from the local file system.
- **write_file** - (Local FS) Writes content to a file on the local file system.

---
*Note: Tools marked with (Local FS) interact with the server's local file system, not the project's VFS.*
