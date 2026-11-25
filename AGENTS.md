# AI Agent Guidelines & Architecture Standards (`App-Internal-Frontend`)

Welcome AI Assistant. When contributing to or refactoring code in this repository, you **MUST** strictly adhere to the following architecture standards, invariants, and best practices.

---

## 🏛️ Core Architecture Principles

1. **Centralized API & Authentication (`src/lib/api.ts`):**
   - **Single Source of Truth:** All API base URLs, auth token access, authorization headers, and image resolvers reside strictly in `@/lib/api`.
   - **Token Retrieval:** Always use `getAuthToken()` or `getAuthHeaders()` imported from `@/lib/api`.
   - **NEVER** read `localStorage.getItem('auth_token')` directly inside components, hooks, or pages.
   - **NEVER** hardcode `http://localhost:5000/api` or `import.meta.env.VITE_API_URL` fallbacks. Always import `API_URL` or `API_BASE_URL` from `@/lib/api`.

2. **Authentication & Session (`src/contexts/AuthContext.tsx`):**
   - Internal user authentication state, role permissions, login, and logout are managed exclusively by `AuthContext`.
   - Redundant auth contexts (e.g. `RoleContext`) and duplicate proxy services (e.g. `services/api.ts`) have been pruned. Do not re-introduce them.

3. **Layout & Dashboard State (`src/contexts/DashboardContext.tsx`):**
   - Shared layout/drawer states between `Navbar` and `Dashboard` are managed via `DashboardContext`.
   - Do not create circular imports between navigation components and page routes.

4. **Accounting & Financial Operations:**
   - Folio ledgers, debit/credit entries, disbursement workflows, and Tally sync mechanisms must maintain 100% calculation and payload fidelity.
   - When uploading receipts, bill mappings, or bulk loan Excel files using `FormData`, pass `headers: getAuthHeaders()`.
   - **NEVER** manually set `'Content-Type': 'multipart/form-data'`. Let the browser automatically set the boundary.

5. **Clean Module Imports:**
   - Consolidate imports cleanly at the top of the file without duplicate identifiers.

---

## 🛠️ Mandatory Modernization Skill

This repository includes the `/code-quality-modernizer` skill located at `.agents/skills/code-quality-modernizer/`.
When auditing, modernizing, or refactoring code:
- Follow the read-only audit gate before mutating code.
- Zero breaking changes to financial calculation logic, table filters, or API payloads.
- Refactor in small, atomic, verifiable steps.

---

## 🧪 Verification Standard

After any modifications or new feature implementations, you **MUST** run:
1. `npx tsc --noEmit` — must exit with 0 errors.
2. `npm run build` — must build the production Vite bundle with 0 errors.
