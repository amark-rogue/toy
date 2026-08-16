# Shell test guide

Run the shell checks before committing a change that can affect terminal input, output, frames, prompts, or demo mode.

```sh
node test/testshell.js
node test/test-demo.js
node test/test-bash.js
node test/test-term.js
```

`testshell.js` runs the real shell stream, task router, result renderer, and terminal detection functions against saved PTY frames. `test-demo.js` runs the demo and Nodepod terminal adapter, then compares its `node -v` frame to the exact frame consumed by `testshell.js`.

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
- Test normal SSH, VM, demo, and Nodepod whenever a shared framing adapter changes.

`testshell.js` already splits the Nodepod `node -v` frame at every byte boundary. Add the same kind of loop for every new framing bug; it is cheap and catches the chunking differences that browsers, WebSockets, and PTYs introduce.
