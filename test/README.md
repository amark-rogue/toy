# Shell test guide

Run the shell checks before committing a change that can affect terminal input, output, frames, prompts, or demo mode.

```sh
node test/testshell.js
node test/test-demo.js
node test/test-bash.js
node test/test-term.js
node test/test-task.js
node test/test-pwd.js
```

`testshell.js` runs the real shell stream, task router, result renderer, and terminal detection functions against saved PTY frames. `test-demo.js` runs the demo and Nodepod terminal adapter, then compares its `node -v` frame to the exact frame consumed by `testshell.js`.

`test-task.js` checks task placement and navigation separately: string `same`/`add`/`back`/`next` actions, ID-only `#` targeting, command-derived inherited paths, and prompt history versus the preserved draft.

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
