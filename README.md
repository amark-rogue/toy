# TOY
Code on Phone is a SaaS IDE for toying around with vibe coding.

## Why

While keyboards are powerful interfaces, humans have evolved computers to be mobile and so code should be too. A future where meaningful programming can only be done on a keyboard would be a great loss to productivity, this must be fixed.

## Old & New

Code on Phone needs to pioneer the most intuitive & efficient pedestrian programming interfaces, however everything it is built ontop of must be fixable via itself - if something breaks it cannot rely on needing a keyboard to resolve. Therefore it must expose access to the lowest level traditional systems as well: shell command line terminals.

## Structure

TOY is the Open Source future, COP is the enterprise legacy integrations. `index.html` advertises sellable features of TOY with a login link to `app.html` which lets users connect to their IT department's `ssh` spec COP host (or a limited VM or demo), TOY then inits `#shell.html` using the [`gun/kit`](https://github.com/amark/gun) framework. `shell.html` parses an interactive bash CLI, streaming output into matching modular `cmd/*.html` iframe components - these may have a `#` dedicated `pty` session, or may spawn upgrades to the ssh host via `^` messages that bypass `pty` entirely, like to serve or write files directly. All further features need to be built in their own separate modular 20 ~ 50 line file as a component that extends the shell or extends some other module, feature, command, etc. or component.

A `<shell>` can have many `<task>`s (like a browser has many tabs), actions in the task can cause new prompts to run (prompts are alike a URL bar), these can be targeted into the same or other or new `<task>`s. A singular complete `<-` left arrow tap when selection is at the start of a prompt will put that prompt's preceding prompt in, a singular complete `->` right arrow tap when selection is at the end of a prompt will put that prompt's next prompt in or last known new draft, editing a prior prompt does not count as a draft nor are the edits preserved (if the user wants to keep it it must be submitted which then adds it to the end or before the draft). Tapping / holding up or down key focuses on prior or next `<task>`. Any task with no `<-` left arrow history inherits context, environment, `pwd`, etc. from the prior task.

Code in the shell document should keep the returned task handle instead of recreating routing envelopes: `var task = shell.task('git status', 'prompt.add')`, then `task.set('git clone https://github.com/')` or `task.run('git status')`. `run` and `set` target that exact task by default and return its handle; their optional second argument accepts the existing `prompt.back`, `prompt.next`, `prompt.pre`, or `prompt.add` placement. The canonical same-task events are bare `prompt` and `prompt.set`. Prompt events remain the transport adapter for isolated iframe components, but they call the same task runner and setter.

A typed `ssh` command composes a nested `shell.html` inside its own task while one outer PTY remains the transport. Inner task IDs are local routing IDs; bytes sent to the host retain the outer task ID. This lets normal command components keep working after a nested login. If native `aid` is missing, its frontend fallback uses that exact direct or nested PTY for filesystem and shell tools; only demo mode uses OPFS.

Host authority, agent provider, and agent permission are orthogonal. Demo gives frontend `aid` the OPFS project and lazily uses Nodepod for rich commands. A direct VM/SSH shell or a nested SSH shell always tries its own `aid` first; only an exact completed command-not-found result starts the frontend agent, whose reads, writes, commands, sessions, working folder, and later tool calls remain on that same PTY and host. Independently, the frontend agent may use a plain, OpenAI-compatible, Responses, Anthropic, Gemini, Ollama, Bedrock, or extended provider wire, and independently the session may be `plan`, `work`, or `all`. Never let changing one dimension silently change another.

`gun/kit/web.js` is Kit's one browser library, binder, and transport. A finite component registers its server near the top of its script and normally ends with `res.send(kit.bind(document, data))`; nested `name` attributes declare where `data` binds, and `kit.bind(root, data)` returns that root. The handler receives programmatic data as `req.body` and URL parameters as `req.query`. A native GET iframe also runs its server with the query as its body, while named POST forms use the same component route. Call a component with `kit.fetch(url||iframe, body, target?)`, which resolves to its sent data. Omit `target` for a hidden reused component, pass an iframe for an exact instance, or pass an iframe `name` to hydrate the nearest matching component in place. Failures reject with `error.status`; `res.status` and `res.end(value)` remain the lower-level status path. TOY sends potentially large arbitrary shell text directly as the finite request body rather than leaking it into a URL; keep `kit.say` for ongoing PTYs, terminals, live updates, and user actions, and use the browser's native `fetch` for actual HTTP.

## Contributing

See `contributing.md` & `test/README.md`. All features should be separate file modular `kit` iframe component, ideally only 20 ~ 50 lines long - for example, even the shell's `<help>` is its own isolated `aid.js` with event listener that progressively enhances `#shell.html`, use this as a guiding inspiration.

Keep universal transport, request, response, target, component, and stream behavior in Kit; keep shell commands, tasks, prompts, PTYs, history, and working-directory behavior in TOY; Put independently useful behavior in its own small HTML or JS file, ideally 20 ~ 50 lines, and compose files through URLs, declared targets, finite requests, streams, and returned handles rather than shared globals or knowledge of surrounding DOM structure. Convenience APIs must be exact aliases or compositions of canonical primitives, never alternate protocols.

Please use `gun/kit/dom.js` API as much as possible for as many DOM manipulations.


### Normalize at boundaries

When an outside system has many dialects, normalize once at its boundary and keep one small internal shape. Downstream code must not branch on provider names, command names, platforms, paths, or sample values. AID, for example, carries every model turn as `{text,calls,use}` and every call as `{id,name,args}`; provider adapters own outside request/response fields, while the shared boundary normalizes native calls, fenced calls, streams, and token usage before the agent loop sees them. Every call is validated from the same live schema used to advertise tools, and invalid calls are repaired before execution.

Test the invariant as a generated cross-product, not as a growing pile of examples: derive valid, reordered, missing, extra, wrong-type, collision, chunked, and provider-wrapped cases from the registry or schema itself. Keep exact real-world captures too, but use each capture to expand a general dimension; never fix it with a one-off check for the captured tool, command, path, model, or backend. If a genuinely new request protocol cannot be derived from an existing adapter, add one edge adapter without leaking its fields into the core.

### Keep KIT and TOY at their own layers

Kit may know how to bind a document, route a request to a local iframe, resize a component, relay an event, or return a response. It must not know what `git`, `ls`, a shell prompt, a PTY, a working directory, or a TOY task means. Do not add another Kit side library that TOY must load for core binding or transport; `gun/kit/web.js` is the one browser library for those primitives, and every byte added to it must benefit unrelated apps.

TOY chooses a command component and gives that component the raw complete frame. The component parses its own format. Never hardcode program names in generic shell parsing or terminal detection; classify protocol bytes and task IDs instead. Inside a TOY component, publish a same-task command with the canonical bare event, for example `kit.say('git branch -a', 'prompt')`, and edit the same task with `prompt.set`. Shell-owned code should keep the handle returned by `shell.task(...)` and call its `run` or `set` methods instead of recreating routing envelopes. `#` is reserved for a real task or PTY ID, never a nickname such as `same`.

### Testing

- Add or update a saved command frame in `test/cmd.html` whenever a finite command renderer or its accepted input shape changes.
- Add raw PTY samples and chunking/interleaving assertions when shell parsing, prompt recovery, terminal selection, or task routing changes. Fix byte patterns and IDs, never program names.
- Exercise component transport in a real browser through `test/http.html`: early requests, exact and named targets, reuse, navigation, concurrency, forms, failures, nested routing, `file://`, and static HTTP behavior cannot be proven by searching source text.
- Exercise nested sizing through `test/fit.html`, including growth, shrinkage, borders, fractions, maximum sizes, and fixed overlays.
- Test the smallest relevant unit as well as the composed shell path. A parser test alone does not prove iframe delivery, and a source-shape assertion is not a substitute for browser ordering.
- Compare total files loaded, request count, bytes in `gun/kit/web.js`, rendering time, and failure behavior before calling a refactor simpler. Removing lines from one component by moving special cases into Kit is not a reduction.

Before finishing a component, ask: Is this finite or streaming? Does static HTML plus `name` binding express the result? Is the body data while the query is truly addressable state? Is the exact target explicit? Does the component know only its own DOM? Is every helper at the correct Kit or TOY layer? Does normal flow size it? Is there a real boundary test that would fail if ordering, routing, reuse, or chunking regressed? If any answer is unclear, simplify the primitives before adding another protocol.
