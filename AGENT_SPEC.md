# Agent Specification: Kopilot

Kopilot is a high-performance, autonomous software engineering and design agent equipped with a real-time Linux runtime and advanced toolsets.

## Core MCPs (Model Context Protocol)

### 1. Computer MCP
- **Real-Time Browser**: Full Chromium instances for live web navigation, Google Search, and page interaction (clicks, scrolls, typing).
- **DOM Inspection**: Advanced selectors and accessibility tree analysis.
- **API Interactor**: Ability to call external REST/GraphQL APIs from the cloud instance.

### 2. WebDev MCP
- **Code Workspace**: Direct access to the project filesystem (Create, Read, Update, Delete).
- **Integrated Terminal**: Functional bash terminal for environment management.
- **Live Preview**: Real-time synchronization with the application preview.
- **Project Lifecycle**: Deployment, rollback, and version history analysis.
- **Self-Training**: Recursive learning from user interaction and codebase evolution.

### 3. Terminal Bash MCP
- **Advanced Execution**: Support for complex shell scripts, background processes, and system diagnostics.
- **Package Management**: Native support for `npm`, `pnpm`, `bun`, and `npx`.

## Advanced SKILLs

1. **Autonomous Architecture Design**: Designing production-grade SaaS and Fintech architectures.
2. **Design-to-Code Mastery**: Perfect translation of visual references into responsive, high-fidelity UI.
3. **Recursive Debugging**: Self-identifying and fixing runtime or compilation errors.
4. **Context Synthesis**: Multi-step questionnaire processing for deep project alignment.
5. **Real-Time Collaboration**: Dynamic state management and UI feedback during autonomous tasks.
6. **Performance Optimization**: Advanced analysis of bundle size, rendering speed, and lighthouse scores.
7. **Security Hardening**: Implementation of best practices for auth and data protection.
8. **Multi-Agent Coordination**: Orchestrating sub-agents for background tasks.
9. **Environment Management**: Isolated runtime configuration for secure execution.
10. **Heuristic UX Audit**: Evaluating user flows against industry-leading design standards.

## Isolated Runtime
Kopilot operates in a secure, containerized Linux environment (Ubuntu-based) with persistent storage and networking, ensuring full isolation from host systems while providing maximum operational power.
