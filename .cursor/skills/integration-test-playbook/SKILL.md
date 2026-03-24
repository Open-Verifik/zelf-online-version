---
name: integration-test-playbook
description: Write and verify Zelf backend integration tests against the real API. Use when adding or updating backend API tests, session bootstrap flows, auth headers, test data, or live-server verification.
---

# Integration Test Playbook

Use this skill for backend API tests under `tests/integration/`.

## Core rules

- Do not mock the database, sessions, blockchain responses, or external services.
- Run against a live backend server.
- Start MongoDB locally and use the isolated `zelf_testing` database flow described in `tests/README.md`.
- Set `PORT` explicitly before starting the server and running the test so you do not depend on mixed fallback ports in older test files.

## Standard auth bootstrap

Most protected tests should:

1. `POST /api/sessions`
2. Send `Origin: https://test.example.com`
3. Extract `response.body.data.token`
4. Use `Authorization: Bearer <token>` on protected calls

## Test data defaults

- Use timestamped identifiers such as `test_${Date.now()}_${Math.random().toString(36).substring(7)}`.
- Use `config/0012589021.json` when a biometric test needs a face payload.
- Clean up any durable records your test creates when the flow leaves persistent data behind.

## Command examples

```bash
PORT=3003 npm start
```

```bash
PORT=3003 npm run test:lease
```

If a specific older test expects `3050`, run the server and test command with `PORT=3050` instead of editing the guidance around the inconsistency.

## Assertions to include

- Happy path behavior
- Validation failure behavior
- Unauthorized behavior when JWT is missing or invalid
- Any domain-specific response fields that the endpoint promises

## Review checklist

- Does the test hit the correct local base URL for the running server?
- Does it create a session before protected requests?
- Does it send the `Origin` header?
- Does it cover both success and failure paths?
