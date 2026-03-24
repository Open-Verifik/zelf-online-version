---
name: backend-patterns
description: Follow Zelf backend architecture and implementation patterns. Use when adding or refactoring Koa routes, controllers, modules, middleware, repository folders, or backend API features.
---

# Backend Patterns

Use this skill when editing backend code in `zelf`.

## Priority references

When there is ambiguity, check these files first:

1. `server.js`
2. `Routes/unprotected-repositories.js`
3. `Routes/protected-repositories.js`
4. `Core/config.js`
5. The nearest existing feature under `Repositories/<Feature>/`
6. `tests/integration/` for the API behavior you are changing

## Default flow

- Keep the backend flow `route -> controller -> module -> model/middleware`.
- Keep route files thin and focused on request wiring.
- Put business rules and external-service orchestration in modules.
- Reuse feature-local middlewares for validation and permission checks.

## Route wiring rules

- New public endpoints belong in `Routes/unprotected-repositories.js`.
- Authenticated endpoints belong in `Routes/protected-repositories.js`.
- `server.js` mounts unprotected routes before `koa-jwt`, then protected routes after JWT.
- If a generated scaffold mentions `api.routes.js`, translate that to the current repository registries instead of following the old instruction literally.

## Design defaults

- Prefer extending an existing repository area before inventing a new parallel structure.
- Match naming and file layout already used by the closest feature.
- Keep endpoint behavior explicit: validation, auth, error handling, and response shape should be visible from nearby files and tests.

## Review checklist

- Is the route registered in the correct protected or unprotected registry?
- Does the controller stay thin?
- Did module logic remain in modules instead of routes?
- Is there an existing integration test pattern to follow or update?
- If the endpoint is public-facing, does `zelf-documentation` need a docs update too?
