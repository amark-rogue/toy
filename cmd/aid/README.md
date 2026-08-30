# aid browser agent

`aid` is the browser fallback's general agent harness. In demo it keeps its project in the existing `/root` OPFS sandbox and wakes the larger Nodepod runtime only when a command needs it. One operator loop can act through user-made role lenses instead of maintaining unrelated bots. VM and SSH hosts retain ownership of commands installed on those systems; their ordinary `aid` and other agent output uses the same component without being intercepted by the browser harness.

On a direct SSH or v86 shell, and inside a nested `ssh` component, the host command always runs first. Only a completed shell diagnostic saying that `aid` itself was not found starts the browser fallback. The component then claims that task's shell stream: marked RPC commands leave through its `host` event and targeted `term` replies bypass ordinary shell parsing. Every read, search, edit, shell command, role, memory, and session therefore stays on that exact PTY and its real home/current filesystem. It never switches a host task to demo OPFS. The AID extension owns one dormant VM route whose matcher activates from generic demo state, so demo and Nodepod cores never name AID while demo still keeps its faster direct OPFS behavior.

## Start

```sh
aid explain this project
aid fix the failing test
aid plan add a search page
aid all build and test the feature
aid I want a reusable chief of staff role
aid turn these notes into follow-ups
aid help me think through this choice
```

`work` is the default. Reads and exact file edits can proceed in the sandbox; shell commands ask first. `plan` denies writes and shell commands. `all` permits every sandbox tool for that session. The Stop button aborts the current model request or question.

The agent can read trees and line ranges, search text, write or exactly edit files, run shell commands, publish a plan, ask a question, and show its cumulative diff. It can also retrieve CORS-enabled public pages, search prior sessions, keep explicit long-lived facts, track commitments, and delegate bounded work to child agents. In demo, common commands stay on the small OPFS shell; Node, npm, scripts, pipes, redirects, and other rich commands lazily wake Nodepod and stream their process output. A host fallback runs those tools on its owning PTY instead.

Project trees print complete paths relative to the working folder so a model never has to infer a child's parent from indentation. Exact paths always win. If a model nevertheless drops or stales a path, read and find may recover only one same-named item found within the bounded current project tree and report the exact substitution with their evidence. Multiple matches are returned as choices instead of being guessed, and mutating tools never repair a path. Every failed result is marked as failed and carries an explicit warning not to treat the attempted action as observed fact.

Final replies render as safe Markdown. User-visible progress and tool cards stay folded by default so multi-step work does not bury the conclusion; opening a fold renders its contents on demand. The renderer never mounts model HTML and permits only credential-free HTTP(S), mail, and phone links. The component policy independently allows only same-origin script and CSS plus the HTTP(S) connections aid explicitly needs; it denies inline script, inline CSS, images, media, fonts, frames, objects, workers, and form submission.

A trusted same-origin component may add a line or inline rule through `AID.md.use('line', fn)` or `AID.md.use('span', fn)`. The function receives only a frozen text view: `{kind, at, text, all?}`. It returns `{at, name, text, url?, head?}`, where `name` selects a declared safe model under `.mark`; returned text is always assigned with `textContent`, links pass the same URL policy, and every CSS, HTML, event, source, or arbitrary attribute field is ignored. Extensions do not receive the live output DOM. Extension JavaScript itself is privileged application code—not an untrusted plugin sandbox—and must be reviewed like any other same-origin script.

```js
AID.md.use('span', function(ctx){
  var hit = /^==([^=]+)==/.exec(ctx.text.slice(ctx.at));
  return hit && {at:ctx.at + hit[0].length, name:'bold', text:hit[1]};
});
```

## Roles

`auto` is the only built-in role and combines capabilities to fit the request. Roles are ordinary user-made records, not hardcoded command aliases. Ask aid to create one in natural language; it will propose a name and instructions, save them after permission, and may select the new role:

```sh
aid Create and use a Chief of Staff role that organizes decisions, owners, risks, and follow-ups
aid role
aid role ROLE_ID
aid role auto
```

Roles change judgment and presentation, not authority. They all use the same permissions, project context, local state, providers, tools, and bounded model/tool loop. Any role can delegate work to `auto` or another user-made role by name or ID. Child work defaults to read-only `plan`, is limited in depth and count, and returns one result to its parent. Child edits are merged into the parent's diff and undo journal even when the child fails afterward.

## Memory and commitments

In demo, explicit durable facts and active commitments live outside the project under `/.aid`. A direct or nested host fallback uses `$HOME/.aid` on that host instead:

```sh
aid remember I prefer terse weekly briefs
aid memo
aid memo find weekly
aid forget MEMORY_ID
aid todo add Send the weekly brief
aid todo
aid todo due TODO_ID 2030-01-02T09:00:00-08:00
aid todo done TODO_ID
aid past launch plan
```

The model may read memory and open commitments at the start of a session. Their contents therefore become part of the prompt sent to the selected provider. It is instructed not to infer memories or store secrets. Model-requested memory or todo changes require permission; direct CLI commands are already explicit user actions. A todo may carry a due date through the tool API and is surfaced in future sessions, but a static page cannot wake itself after the browser closes or silently send mail, book meetings, or operate accounts. Those actions need an explicit future connector; aid never claims a draft was sent.

`web(url, word)` performs a credential-free GET with cookies and referrer omitted, scans fetched markup as an ordinary string, and returns plain text plus credential-free HTTP(S) links. It does not invoke an HTML parser, create a fetched-page DOM, mount remote markup, interpret CSS, or initiate its subresource URLs. Model-requested network access asks once or for the session, and browser CORS still applies. `past` searches only local aid transcripts and likewise asks before an old transcript is sent back to a provider. Neither tool exposes the agent state directory as a project path.

## Providers

Anonymous `ch.at` is the default and needs no account or key. `aid /model`
starts one interactive flow that unifies the old `free`, `catalog`, `providers`,
`model`, and `use` actions: it lists providers in the order you can actually
reach them, lets you pick one, sets a key if that provider needs one, then lets
you pick a model for it.

```sh
aid /model
aid /status
```

The provider list is ordered by how easy each is to reach: the anonymous free
`ch.at` first, then any other free and anonymous options (`ollama`), then free
models that still need an API key (`router`, `groq`, `gemini`, `zen`), then paid
providers that need a key (`openai`, `anth`, `custom`). Keep current with the
`auto` choice, or pass a concrete value non-interactively:

```sh
aid /model openrouter/free
aid /model ollama llama3
aid /use router
aid /key router
aid /catalog
```

`aid /catalog` still prints a session-cached directory of free-access listings
without changing the selected provider. It is informational only: it does not
provide a credential, authorize an endpoint, or cause AID to send a prompt
anywhere.

Prompts, requested file excerpts, retrieved memory, and tool results are sent to the active model provider. The filesystem itself remains local unless a tool or prompt sends its contents.

All providers cross one wire boundary before the agent loop. Internally a turn is always `{text,calls,use}` and a call is always `{id,name,args}`. OpenAI Chat, OpenAI Responses, Anthropic, Gemini, Ollama, Bedrock, canonical responses, SSE, and JSON-lines streams normalize into that shape; selecting another provider cannot change filesystem or task authority. Provider adapters live in `aid.net.api`: each owns `body` and may add `turn` or `live`, so an unusual request or response dialect adds one edge adapter without adding provider checks to tools or the loop. `custom` uses the OpenAI-compatible adapter unless an extension selects another. If an OpenAI-compatible endpoint accepts the provider but its selected model rejects native tools, AID retries once with canonical fenced JSON and remembers that provider/model capability.

Providers with native functions receive the live shared tool schema. Plain chat providers are instructed to emit only this canonical form:

````markdown
```tool
{"tool":"read","args":{"path":"app.js"}}
```
````

The fallback parser still accepts older explicit and keyed forms as input compatibility, but AID only emits the canonical nested form. Tool names, required fields, optional fields, types, enums, and extra-field rejection all come from the same schema; nothing executes until it validates. A malformed text or native call requests a corrected model turn instead of ending the run or reaching a tool. A truly novel provider response envelope needs one boundary adapter—arbitrary undocumented protocols cannot be guessed safely—but no downstream agent code changes.

Optional adapters are `ollama`, `router`, `zen`, `groq`, `openai`, `anth`, `gemini`, and `custom`:

```sh
aid /use router
aid /key router
aid /model openrouter/free
aid /url https://your-cors-proxy.example/v1/chat/completions model-name
```

`aid /key router` opens a password-style component, so the key is not typed into the shell prompt. A key stays in `sessionStorage` and vanishes with the tab. Use `aid /key keep router` only when durable browser storage is intentional. The older inline form remains accepted for automation.

OpenCode Zen currently requires its own API credential and does not allow this static page to call its API directly through browser CORS. A zero-price Ox model is not an anonymous public endpoint. The `zen` adapter therefore reports that limitation instead of borrowing login state or fabricating credentials; a user-controlled CORS proxy can be selected with `aid url`.

## Sessions

In demo, transcripts and edit journals are JSON files under `/.aid`, outside the `/root` project copied into Nodepod. A direct or nested host fallback stores the same records under that host's `$HOME/.aid`:

```sh
aid list
aid resume SESSION_ID continue with the remaining tests
aid undo SESSION_ID
```

Model-visible context is bounded separately from the durable transcript. Compaction keeps the latest work, preserves assistant/tool-result pairs, and records a deterministic summary rather than replaying old side effects. Each completed turn records exact pre-edit text for bounded undo.

## Parts

[`aid.js`](./aid.js) is only the lazy route. Provider wires, SSE parsing, storage, roles, memory, commitments, retrieval, delegation, permissions, filesystem tools, shell execution, tool parsing, loop lifecycle, and UI cards are separate small files in this folder. They define independent methods and load concurrently on the first `aid` command. [`aid.html`](../aid.html) accepts its finite initial host result through `kit.createServer`, then stable item IDs update later streamed replies and tool cards in place while approvals return through `aid.ok`.

## Checks

```sh
node test/test-aid.js
node test/test-aid-safe.js
node test/test-aid-wire.js
node test/test-aid-host.js
```

The wire check generates calls from every live tool schema, permutes argument order and hostile values, rejects missing/extra/wrong fields, carries them through the common native backend envelopes, and splits streams independently of any particular tool name or path. The host check covers exact command-not-found detection, direct and nested SSH authority, POSIX and PowerShell wrappers, host-backed files and sessions, shell working directories, and demo OPFS isolation. Open `test/aid.html` in Chrome to check concurrent lazy loading, iframe card replacement, and approval replies. Open `test/ssh.html` to exercise the nested shell and host fallback together. Open `test/aidnet.html` to make a real anonymous browser SSE request to `ch.at`; that check requires a network connection and is intentionally separate from the deterministic test.
