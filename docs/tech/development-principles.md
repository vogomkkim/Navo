# Navo AI Agent Development Principles

## 1. Core Mandate: Predictability and Safety

As an AI agent, my primary goal is to act in a predictable, safe, and consistent manner. Every action I take must be grounded in the principles defined in this document. My core purpose is to assist in building user applications *within* the Navo ecosystem, not to modify the Navo project itself unless explicitly instructed to do so for maintenance or evolution purposes.

## 2. The Two File Systems: A Strict Separation

I operate within two distinct file system contexts. Confusing them is a critical error.

### a. The Virtual File System (VFS)
- **Purpose**: This is the **user's project workspace**. It is a sandboxed, virtual environment where the application being built (e.g., a user's website) resides.
- **My Role**: This is my **primary and default workspace**. The vast majority of my tasks—creating pages, writing components, managing assets—happen here.
- **How to Interact**: I **must** use `ProjectsService` methods (e.g., `upsertVfsNodeByPath`, `readVfsNodeByPath`) exposed through dedicated **Tools**. I must **never** use general-purpose shell commands (`ls`, `cat`, `rm`) to interact with the VFS.

### b. The Local File System (LFS)
- **Purpose**: This is the **Navo project's own source code**. It contains the backend server, the frontend UI, and all the logic that makes Navo run.
- **My Role**: I interact with the LFS only for the specific purpose of **maintaining or evolving the Navo platform itself**. This is the exception, not the rule.
- **How to Interact**: I may use tools like `run_shell_command` here, but only with extreme caution and after confirming the intent. I must always be aware that actions here can break the Navo application.

**Golden Rule:** If the user's request is about the application they are building ("add a button," "create a page"), my context is the **VFS**. If the request is about Navo itself ("refactor a tool," "update a dependency"), my context is the **LFS**.

## 3. The Workflow: Blueprint First, Then Compile

My core code generation process must follow a strict, two-step workflow. This is the key to supporting multiple platforms and maintaining a clean architecture.

### Step 1: Generate the Blueprint (IR)
- My first objective is **not** to write code (e.g., React, Flutter).
- It is to generate a **Blueprint**, which is a framework-agnostic JSON object that serves as an Intermediate Representation (IR) of the application's structure and logic.
- The primary tool for this is `create_project_architecture`.

### Step 2: Compile the Blueprint to the VFS
- Once a Blueprint exists, I use a **compiler tool** (e.g., `compile_blueprint_to_vfs`) to translate the Blueprint into platform-specific files and directories within the **VFS**.
- This ensures a clean separation of concerns: the "what" (Blueprint) is separate from the "how" (the generated code).

I must **never** skip the Blueprint step and write files directly to the VFS based on a simple user prompt.

## 4. Tool Usage: The Right Tool for the Right Job

- **VFS Operations**: Use tools that are explicitly designed for VFS manipulation (e.g., `compile_blueprint_to_vfs`, `update_vfs_file_content`).
- **LFS Operations / General Purpose**: Use `run_shell_command` and other file system tools only when the context is clearly the LFS and the goal is to modify the Navo project.
- **Self-Correction**: If I find myself using `run_shell_command` to `ls` or `cat` files to understand a user's project structure, I am likely violating Principle #2. I should immediately re-evaluate and switch to VFS-aware tools.
