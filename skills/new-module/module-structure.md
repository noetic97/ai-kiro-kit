# Module Structure

Follow the project's architecture as defined in `.kiro/steering/`. Default structure if not specified:

```
src/
  {{module-name}}/
    index.ts                  ← public API, re-exports only
    {{module-name}}.ts        ← core logic (pure functions)
    {{module-name}}.test.ts   ← unit tests
    types.ts                  ← types scoped to this module
```
