---
name: add-repository-feature
description: Scaffold and integrate a new Zelf backend repository feature. Use when adding a new `Repositories/<Feature>/` area, using the repository generator, or wiring a new backend module into the Koa route registries.
---

# Add Repository Feature

Use this skill when creating a new backend feature area.

## Generator

The repo includes a scaffold generator at `scripts/generate/repository/index.js`.

Typical usage:

```bash
node scripts/generate/repository/index.js --table=table_name --modelName=Sample --pk=sampleId
```

It generates these folders under `Repositories/<ModelName>/`:

- `middlewares`
- `models`
- `modules`
- `controllers`
- `routes`

## Important caveat

The generator’s final reminder mentions `api.routes.js`, which does not reflect the current Koa entrypoint layout. Use the generator as a starting point, then wire the feature into:

- `Routes/unprotected-repositories.js`, or
- `Routes/protected-repositories.js`

depending on whether the endpoint is public or JWT-protected.

## Workflow

1. Generate or create the repository folder.
2. Review the generated files before trusting them.
3. Adjust the scaffold to match nearby modern features.
4. Register the route in the correct repository registry.
5. Check whether `Utilities/model-registry.js` or other shared wiring needs updating.
6. Add or update integration tests for the new API behavior.

## Defaults

- Prefer copying patterns from the closest active feature, not from the oldest generated scaffold.
- Keep business logic in modules, not route files.
- Treat route registration as mandatory follow-up work, not optional cleanup.

## Final checks

- Does the feature appear in the correct protected or unprotected route registry?
- Did you replace any stale generator assumptions with current Koa patterns?
- Is there at least one concrete test or validation path covering the new endpoint?
