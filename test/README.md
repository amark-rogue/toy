# Shell test guide

Run the shell checks before committing a change that can affect terminal input, output, frames, prompts, or demo mode.

```sh
node test/testshell.js
node test/test-demo.js
node test/test-bash.js
node test/test-term.js
node test/test-task.js
node test/test-git.js
node test/test-pwd.js
node test/test-http.js
node test/test-aid.js
node test/test-aid-wire.js
node test/test-aid-host.js
node test/test-book.js
node test/test-open.js
node test/test-dom.js
```

`testshell.js` runs the real shell stream, task router, result renderer, and terminal detection functions against saved PTY frames. `test-demo.js` runs the demo and Nodepod terminal adapter, then compares its `node -v` frame to the exact frame consumed by `testshell.js`.

`test-task.js` checks task placement and navigation separately: string `same`/`add`/`back`/`next` actions, targeted `.set` drafts, ID-only `#` targeting, command-derived inherited paths, and prompt history versus the preserved draft.

`test-aid.js` drives the browser agent through provider fallback, native-to-canonical capability negotiation, repair turns, tool execution, unique and ambiguous path drift, roles, memory, todos, retrieval, delegation, OPFS sessions, edit/diff/undo, Nodepod, and the real demo route. `test-aid-wire.js` derives data from every live tool declaration: it permutes properties and hostile values, checks canonical text plus OpenAI Chat, Responses, Anthropic, Gemini, Ollama, Bedrock, and generic envelopes, rejects missing/extra/wrong/malformed arguments, and splits native arguments, SSE, UTF-8, and JSON-lines streams without naming a particular tool or path. `test-aid-host.js` proves that an exact direct or nested host command-not-found result switches to frontend aid while all files, sessions, shell tools, and read-only path recovery remain on that host; it also proves demo still uses OPFS. Open `test/aid.html` in Chrome for concurrent lazy-part loading, the first stream event arriving during iframe navigation, in-place card updates, plain-host fallback, approval replies, and private credential input. Open `test/aidui.html` for safe Markdown, folded work, lazy fold rendering, and visible direct/final replies. Open `test/aidnet.html` separately for the live anonymous `ch.at` CORS/SSE boundary; unlike the deterministic tests, it requires that external service to be reachable.

The mode dimensions must stay independent: demo owns OPFS and may wake Nodepod; direct VM/SSH and nested SSH try the host command first and, only when it is truly missing, run frontend aid against that same host PTY; provider choice changes only the model wire; `plan`/`work`/`all` changes only authority. Optional commands own dormant routes that activate from generic host state—demo and Nodepod cores must not name them. Test a changed boundary across the applicable cross-product instead of assuming one named mode represents the others.

When a provider produces a new shape, keep its exact unedited response in `test/samples/aidtools.json` (for plain text) or a focused wire assertion (for a native envelope), including prose, fences, ordering, truncation, and stream splits. Then generalize the parser or generated matrix so the assertion is about a protocol dimension, never that captured tool name, path, model, or vendor. Exact captures are regression evidence; the schema-generated matrix is what protects future tools and values.

## Component requests

Open `test/http.html` in Chrome through a static HTTP server and expect `PASS`. The same fixture can be opened directly with `file://` when testing local-file deployment. It loads only `gun/kit/web.js` and exercises a request arriving before server declaration, direct and named iframe requests, repeated in-place hydration, a nested component targeting an uncle, targetless programmatic responses and reuse, concurrent navigation of one target to different URLs, explicit no-server fallback, edited form submission without duplicate sends, reserved browser names, duplicate-name rejection, and `location.path` page framing. Do not replace these with source-shape assertions: ordering, iframe navigation, opaque origins, routing, and form submission must run in a browser.

Open `test/cmd.html` the same way and expect `PASS`. It sends saved command frames through the real finite servers for every lightweight TOY command component; add a sample whenever a command renderer is added or its input shape changes.

Run `node test/test-as.js` for Kit's integrated response binder. It checks that nested `name` paths bind response data, repeated responses update text, unrelated branches stay untouched, and the binder remains fast without HTML injection.

Open `test/form.html` to test a native GET form targeting a dynamic Kit iframe. The browser builds the `test/server.html` query from the named controls; its overloaded server parses the direct URL into `req.query`, binds the response, and sends the hydrated document.

Open `test/stack.html` through a same-origin static server and expect `PASS`. It drives real task replies through `shell.html`, verifies that separate `ls` and `pwd` tasks hydrate their iframe components through Kit requests, then verifies that an event-only terminal declines the finite request and receives the same data through the live stream fallback. This fixture inspects the nested shell DOM, so opening the fixture itself through `file://` cannot report its result under browsers that give local files separate opaque origins; the component request and sizing fixtures above remain the direct-file checks.

Open `test/ssh.html` to verify that a nested SSH shell keeps one outer PTY while its inner commands still hydrate the normal TOY command components. It also verifies that a missing remote `aid` starts exactly one frontend agent whose working directory and filesystem RPCs stay on that nested remote PTY.

Open `test/relay.html` to verify that multiple listeners in one component create one iframe relay, all local listeners still run once, and a parent can claim an event before it crosses into children.

Open `test/open.html` in Chrome through HTTP and directly through `file://`; both must report `PASS`. It runs hostile script in the real `open` preview and proves the opaque sandbox cannot read parent DOM, origin storage, inherited host paths, or referrers; remove its sandbox; open popups or peer connections; make CSP-blocked requests; or forge Kit events. `node test/test-open.js` separately locks the declarative sandbox, permissions, private base, referrer, CSP, credential-free fetch, and single hardened `srcdoc` path.

## Frames

Each task is a separate stream. A frame has an id and raw bytes:

```js
{'#':'2', '$':'node -v\r\nv22.12.0\r\n~ $ '}
```

Tests must keep these facts true:

- Bytes from one id never change another task.
- The task prompt owns the echoed command; result text must not repeat it.
- A closing prompt finishes a frame but must not replace its result.
- A full-screen escape sequence selects `term.html` only for its own task.
- Prompt floats stay inside their task and never prefix result text or the next prompt.

## Add a regression sample

When a device shows a bad terminal result:

1. Save the smallest raw PTY frame that reproduces it in `test/samples/`.
2. Include control bytes exactly. JSON escapes such as `\u001b` are preferred for short frames.
3. Add the frame to `shelltask.json` when it is a cross-platform protocol case.
4. Add an assertion to `testshell.js` for the command, result, task id, and terminal mode that must survive.
5. If demo or Nodepod emitted it, make `test-demo.js` produce and compare that same fixture.
6. Run the four commands above.

Never fix a capture by checking a program name. Test bytes and task ids instead.

## Component sizing

A nested Kit document defaults to intrinsic body height. Its `ResizeObserver` reports that body box to its direct parent, and that parent consumes the report after sizing the source iframe. A nested report must never be forwarded as the ancestor component's size.

Keep component width, `min-height`, and `max-height` in ordinary CSS. Fixed and absolute children behave like they do in a div and do not enlarge the component. Do not add sizing flags or measure scroll geometry; use an explicit body height only when a component intentionally fills its viewport.

Open `test/fit.html` through a static HTTP server and expect `PASS`. It checks fractional content, iframe borders, growth through `max-height`, and shrinking. Run `node test/test-fit.js` for the source-contract check.

## Platform captures

On a machine with `node-pty`, run:

```sh
node test/genshell.js
node test/testshell.js
```

The generator saves a platform, architecture, and Node-version-specific shell capture. The shell test reads every contributed `.shellnode.` capture. Captures are validated by common invariants, not by requiring different operating systems to print identical bytes.

## Variations to predict

For each new frame, test at least these dimensions:

- Deliver it whole, then split before and after every control sequence, newline, prompt, and command echo.
- Interleave it with another task id while preserving byte order within each task.
- Test an ordinary result, ANSI-coloured result, carriage-return progress result, and full-screen result.
- Test initial task creation, task reuse from a component click, and terminal exit.
- For task reuse, assert partial bytes stay hidden, the same renderer receives one complete frame, and its iframe does not navigate.
- Test normal SSH, VM, demo, and Nodepod whenever a shared framing adapter changes.

`testshell.js` already splits the Nodepod `node -v` frame at every byte boundary. Add the same kind of loop for every new framing bug; it is cheap and catches the chunking differences that browsers, WebSockets, and PTYs introduce.
