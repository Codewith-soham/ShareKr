# ShareKar — Development Guidelines

**Document:** 07 — Development Guidelines  
**Project:** ShareKar  
**Version:** V1 — Local MVP  
**Status:** Draft for review  
**Repository structure:** Monorepo  
**Frontend:** React + TypeScript + Vite  
**Backend:** Node.js + Express + TypeScript  
**Database:** PostgreSQL + Prisma  
**Styling:** Tailwind CSS

---

## 1. Purpose

This document defines the development standards, coding conventions, project organization, Git workflow, testing practices, and code quality requirements for ShareKar.

The objectives are to:

- Maintain readable and maintainable code.
- Keep frontend and backend responsibilities separate.
- Enforce consistent coding practices.
- Reduce bugs and prevent regressions.
- Follow approved product and business rules.
- Make future development and collaboration easier.

These guidelines apply to all V1 development.

## 2. General development principles

All development must follow these principles:

1. Prefer simple, maintainable solutions over unnecessary complexity.
2. Use TypeScript wherever possible.
3. Keep business logic separate from presentation and HTTP handling.
4. Validate all external inputs.
5. Enforce business rules on the backend.
6. Use database transactions for operations requiring consistency.
7. Avoid unnecessary dependencies.
8. Write tests for important business logic.
9. Never commit secrets or credentials.
10. Keep documentation updated when implementation decisions change.

The application will follow a modular monolith architecture. Microservices and distributed infrastructure are not part of V1.

## 3. TypeScript standards

TypeScript strict mode must be enabled in frontend and backend projects.

Recommended compiler settings include:

- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`

Additional compiler options should be enabled where compatible with the selected build tooling.

Development rules:

- Avoid `any` wherever possible.
- Prefer explicit types for public function inputs and outputs.
- Use interfaces or type aliases appropriately.
- Use discriminated unions for complex state and result types.
- Handle nullable values explicitly.
- Avoid unsafe type assertions.
- Do not suppress TypeScript errors without a documented reason.

## 4. Formatting and linting

Use:

- ESLint for code-quality and linting rules.
- Prettier for consistent formatting.

ESLint configuration should include recommended TypeScript and React rules.

Rules should detect:

- Unused variables and imports.
- Unnecessary or unsafe type usage.
- React hook violations.
- Incorrect dependency arrays.
- Inconsistent or potentially unsafe coding patterns.

Formatting must be consistent across the repository.

Recommended scripts:

```json
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit"
  }
}
```

Actual scripts may differ slightly between frontend and backend packages.

## 5. Naming conventions

Use the following conventions consistently.

| Element | Convention | Example |
|---|---|---|
| Variables | camelCase | `poolId` |
| Functions | camelCase | `createPool()` |
| React components | PascalCase | `PoolCard` |
| Classes | PascalCase | `AppError` |
| Types/interfaces | PascalCase | `PoolResponse` |
| Constants | UPPER_SNAKE_CASE | `MAX_POOL_CAPACITY` |
| Filenames | kebab-case | `pool-service.ts` |
| React component files | PascalCase | `PoolCard.tsx` |
| Database fields | camelCase in Prisma | `createdAt` |
| API routes | lowercase plural nouns | `/pools` |

Names should describe their purpose clearly. Avoid unnecessary abbreviations.

## 6. Frontend development guidelines

### 6.1 React architecture

Use functional React components and hooks.

Class components must not be introduced into new V1 code.

Components should:

- Have one clear responsibility.
- Avoid excessive size and complexity.
- Reuse common UI elements.
- Keep business logic out of presentation components.
- Handle loading, error, empty, and success states.

### 6.2 State management

Start with:

- React local state for component-specific state.
- React Context for suitable shared application state.

A dedicated state-management library may be introduced later if complexity justifies it.

Do not introduce Redux or another state library without a clear requirement.

### 6.3 API data fetching

Use TanStack Query for server-state management.

It should handle:

- API request lifecycle.
- Loading and error states.
- Caching.
- Refetching.
- Query invalidation.
- Mutation states.

Use Axios or Fetch as the underlying HTTP client. The selected client should be wrapped in a centralized API layer.

Components should not independently duplicate API configuration or authentication handling.

### 6.4 Form handling

Use:

- React Hook Form.
- Zod for validation.

Forms must provide clear validation messages and prevent invalid submissions.

Frontend validation improves user experience but does not replace backend validation.

### 6.5 UI components

Use Tailwind CSS with reusable custom components.

Create reusable components for commonly repeated elements, such as:

- Buttons.
- Inputs.
- Modals.
- Cards.
- Loading indicators.
- Alerts.
- Navigation elements.
- Form fields.

A component library may be used selectively when it saves development time without compromising consistency.

Avoid building an unnecessarily large design system for V1.

### 6.6 Frontend organization

Suggested structure:

```text
apps/web/src/
├── assets/
├── components/
│   ├── ui/
│   └── shared/
├── features/
│   ├── auth/
│   ├── profile/
│   ├── destinations/
│   ├── pools/
│   ├── notifications/
│   ├── safety/
│   └── admin/
├── hooks/
├── layouts/
├── lib/
├── pages/
├── routes/
├── services/
├── types/
├── utils/
├── App.tsx
└── main.tsx
```

Each feature should contain its related components, hooks, validation, and feature-specific logic where appropriate.

## 7. Backend development guidelines

### 7.1 Backend architecture

Use the approved layered architecture:

**Routes → Controllers → Services → Repositories**

Responsibilities:

| Layer | Responsibility |
|---|---|
| Routes | Define endpoints and middleware |
| Controllers | Handle HTTP requests and responses |
| Services | Implement business logic |
| Repositories | Handle database access |
| Middleware | Authentication, authorization, validation and other cross-cutting concerns |

Controllers should remain lightweight.

Business rules must be implemented in services, not duplicated across controllers.

Repositories should handle Prisma database operations.

### 7.2 Backend organization

Suggested structure:

```text
apps/api/src/
├── config/
├── lib/
├── middleware/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── destinations/
│   ├── destination-requests/
│   ├── pools/
│   ├── invitations/
│   ├── notifications/
│   ├── reports/
│   ├── blocks/
│   ├── feedback/
│   ├── admin/
│   └── health/
├── jobs/
├── routes/
├── utils/
├── app.ts
└── server.ts
```

Each feature module should use a consistent internal structure where appropriate:

```text
pools/
├── pool.routes.ts
├── pool.controller.ts
├── pool.service.ts
├── pool.repository.ts
├── pool.schema.ts
├── pool.types.ts
└── pool.constants.ts
```

Avoid creating unnecessary files when a module is still small.

### 7.3 Error handling

Use centralized error-handling middleware.

Create custom application errors for known cases, such as:

- Validation errors.
- Authentication errors.
- Authorization errors.
- Resource-not-found errors.
- Business-rule conflicts.
- Database-related conflicts.

Controllers must pass errors to centralized error handling.

Do not expose stack traces or internal implementation details in production responses.

All API errors must follow the response format in Document 06.

### 7.4 Request validation

Use Zod for request validation.

Validate:

- Request body.
- Query parameters.
- Route parameters.
- Required headers where appropriate.

Validation should happen before controller business logic.

Use reusable schemas where appropriate.

### 7.5 Logging

Use Pino for structured logging.

Logs should include useful context such as:

- Timestamp.
- Log level.
- Request ID.
- Route or operation.
- Relevant resource IDs.
- Error information.

Never log:

- OTP values.
- Access or refresh tokens.
- Passwords or secrets.
- Sensitive personal information unnecessarily.

## 8. API response conventions

Use centralized response helpers.

All successful responses must follow the approved structure:

```json
{
  "success": true,
  "message": "Pool created successfully",
  "data": {}
}
```

All error responses must follow:

```json
{
  "success": false,
  "message": "Pool is full",
  "errorCode": "POOL_FULL",
  "details": null
}
```

Do not return raw Prisma objects directly.

Map database models into appropriate API response objects. Avoid exposing internal fields that the client does not need.

## 9. Database and Prisma guidelines

### 9.1 Database access

Use Prisma for database operations.

Database access must happen through repository functions rather than directly from controllers or arbitrary frontend-facing code.

Services should coordinate repository operations and enforce business rules.

### 9.2 Migrations

Use Prisma migrations for database schema changes.

Rules:

- Create migrations for schema changes.
- Commit migration files to Git.
- Test migrations locally.
- Never use `prisma db push` as the migration strategy for shared or production environments.
- Do not manually edit an already-applied migration.
- Create a new migration when changing an existing schema.

### 9.3 Transactions

Use database transactions for operations involving dependent writes or concurrency-sensitive rules.

Important ShareKar examples:

- Creating a pool and its creator membership.
- Joining a pool while checking capacity.
- Leaving a pool and updating related lifecycle information.
- Cancelling a pool and updating related records.
- Suspending a user and applying pool participation rules.

Transactions must protect against race conditions and inconsistent state.

### 9.4 Database query practices

- Select only required fields.
- Avoid unnecessary database queries.
- Avoid N+1 query patterns.
- Add indexes for frequently queried fields.
- Use pagination for collection endpoints.
- Use database constraints for important invariants.
- Do not rely solely on frontend checks for uniqueness or capacity.

## 10. Shared types and validation

Use `packages/shared` for genuinely shared definitions, such as:

- Common enums.
- API request and response types.
- Shared validation schemas where appropriate.
- Common constants.

Suggested structure:

```text
packages/shared/
├── src/
│   ├── enums/
│   ├── schemas/
│   ├── types/
│   └── constants/
└── package.json
```

Do not duplicate types unnecessarily.

Avoid coupling frontend code directly to internal database models.

The OpenAPI specification remains the API contract. Generated frontend types can be considered as the API grows.

## 11. Git and GitHub workflow

### 11.1 Branch strategy

ShareKar will use two primary long-lived branches:

- `main`
- `development`

**Development workflow:**

1. New work is committed to `development`.
2. Changes are tested locally.
3. Linting, formatting checks, type checks, and relevant tests are completed.
4. Bugs found during testing are fixed on `development`.
5. Once the changes are sufficiently tested, merge `development` into `main`.
6. `main` should always represent a stable, tested version.

Workflow:

```text
development
    |
    | Implement features and fixes
    |
    v
Run checks and test locally
    |
    v
Fix issues and retest
    |
    v
Merge into main
    |
    v
Stable application version
```

Do not commit unfinished or untested features directly to `main`.

Feature branches are not required by default for this solo-development workflow. They can be introduced later if collaboration or parallel development requires them.

### 11.2 Commit messages

Use Conventional Commits.

Examples:

```text
feat: add pool creation endpoint
fix: prevent joining full pools
docs: update API specification
refactor: simplify pool service
test: add pool membership tests
chore: configure eslint
```

Commit messages should describe the change clearly.

### 11.3 Pull requests and merging

For this solo project:

- Small changes may be committed directly to `development`.
- Major changes may use pull requests for review and documentation.
- Merge into `main` only after testing.
- Do not force-push or rewrite shared history unnecessarily.
- Keep commits focused and meaningful.

## 12. Testing and quality checks

### 12.1 Testing tools

Use:

- Vitest for unit testing.
- Supertest for backend HTTP integration testing.
- Postman for manual API exploration and verification.

### 12.2 Unit tests

Test individual functions and services independently.

Priority areas include:

- Pool capacity validation.
- Eligibility checks.
- Deadline calculations.
- Pool lifecycle transitions.
- Membership restrictions.
- Women-only pool access.
- Blocking rules.

### 12.3 Integration tests

Test complete API and database interactions.

Important cases include:

- User registration and OTP verification.
- Profile completion.
- Pool creation.
- Concurrent pool joining.
- Pool cancellation.
- Pool expiration.
- Admin suspension.
- Invitation validation.

### 12.4 Pre-merge quality checks

Before merging `development` into `main`, run:

1. ESLint.
2. Prettier check.
3. TypeScript type checking.
4. Relevant automated tests.
5. Manual testing for important user flows.

A failed quality check must be fixed before merging.

## 13. Comments and documentation

Comments should explain complex business logic, non-obvious decisions, and important constraints.

Do not comment every line or every simple function.

Document:

- Public API behavior.
- Complex service logic.
- Important database constraints.
- Background job behavior.
- Environment configuration.
- Setup and deployment steps.

When implementation changes an approved business rule, update the relevant project documentation rather than silently changing behavior.

## 14. Dependency management

Prefer minimal, actively maintained dependencies.

Before adding a dependency:

1. Confirm that it solves a real requirement.
2. Check maintenance and compatibility.
3. Review security and known vulnerabilities.
4. Review its license.
5. Consider its impact on bundle size and deployment.
6. Prefer existing dependencies when they already solve the problem.

Avoid installing multiple libraries that perform the same task.

The no-paid-subscription and no-payment-card policy remains applicable to external services.

## 15. Environment configuration

Validate environment variables at application startup using a schema.

Maintain:

- `.env.example`
- Local `.env` files excluded from Git.
- Separate configuration for local, staging, and production environments.

Never commit real credentials.

Required configuration should fail fast with a clear startup error if missing or invalid.

Example categories:

- Database connection.
- Authentication secrets.
- Frontend origin and CORS.
- Cloudinary credentials.
- Email provider credentials.
- Firebase configuration.
- Application environment and port.

Actual variable names will be documented in the environment setup documentation.

## 16. Security practices

All developers must follow these rules:

- Never expose secrets in source code.
- Never trust client-provided user IDs for authorization.
- Validate all incoming requests.
- Enforce permissions on the backend.
- Use secure authentication and token handling.
- Avoid leaking sensitive user profile information.
- Apply rate limits to sensitive endpoints.
- Protect admin endpoints.
- Use database transactions for sensitive state changes.
- Keep dependencies updated.
- Review logs for accidental sensitive-data exposure.

The backend is the authority for all pool and account business rules.

## 17. Performance and maintainability

- Avoid unnecessary React re-renders.
- Use pagination for large collections.
- Optimize database queries.
- Avoid loading unnecessary relations.
- Keep API response payloads focused.
- Use caching only when it has a clear benefit.
- Avoid premature optimization.
- Keep modules focused and reasonably sized.

Do not introduce Redis, Kafka, Kubernetes, microservices, or other distributed infrastructure into V1 without a demonstrated requirement.

## 18. Development workflow

Every feature should follow this sequence:

1. Review its Jira task and relevant approved documentation.
2. Understand the applicable business rules.
3. Implement the feature on `development`.
4. Add or update validation and error handling.
5. Add unit or integration tests as appropriate.
6. Run linting, formatting checks, and type checking.
7. Test the feature locally.
8. Update documentation if necessary.
9. Commit with a Conventional Commit message.
10. Merge into `main` only after successful testing.

Jira tasks should be updated as work progresses.

## 19. V1 development philosophy

ShareKar is initially a solo-developed local MVP.

Development decisions should prioritize:

- Correctness over unnecessary features.
- Security over convenience shortcuts.
- Reliable pool matching and membership logic.
- Maintainable code over premature abstraction.
- Low infrastructure cost.
- Clear documentation.
- Fast feedback from actual pilot users.

Do not build future features until the V1 use case is working reliably.

## 20. Approval

This document defines the proposed development standards for ShareKar V1.

**Status:** Draft — approved