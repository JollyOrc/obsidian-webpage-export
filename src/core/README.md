# `src/core` — pure logic of the fork

Code here must not import from `obsidian`, Electron, or any Node/DOM I/O API
(`CLAUDE.md`, Architecture expectations). It is type-checked with
`tsconfig.strict.json` and linted with the strict eslint block.
