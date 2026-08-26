never use _ or - or snakeCase in names, html css or js, instead always choose the simplest shortest English word that would describe a thing or it's category, easiest to translate or to explain to a child even if it breaks from coding traditions. Pick 1 or 2 letter words for common reused variables, use 3 letter words for main APIs or globals etc., use 4 letter words for specific features, tools, methods, etc. try to never use more than 5 letter words. For many variables or names that share commonality where no short words are available or could cause conflicts, just make an object and then use sub-property fields instead, following the same naming patterns but now nested. 

never use innerHTML, createContextualFragment, or anything that could cause an XSS or similar security breach.

do not use JS to create HTML or set CSS, instead create the HTML and CSS regularly (if necessary, inside a hidden model class div), then in the JS you can clone and insert it where needed. JS can be used to trigger class changes. Favor many small CSS classes that do 1 or maybe a few things, and then reuse those on elements instead of re-writing the same CSS properties again and again.

ideally stick to ES5 syntax except please use await (async) and arrow functions. 

always focus on performance & minimalism. Benchmark everything. Use progressive enhancement over graceful degradation. Keep everything modular and loosely coupled, even in the same file, using immediately invoked functions to indicate separate modules. Prefer passing contexts objects around that get mutated over having many parameters for functions.

always do code that structurally looks more like this:
```
var PDF = {};

PDF.read = function(path){
	readFromDisk(path, PDF.split);
}

PDF.split = function(file){
	splitIntoPages(file).forEach(PDF.save);
}

PDF.save = function(page, number){
	saveToFolder('page' + number, page, PDF.done);
}

PDF.done = function(err, done){
	console.log("Done! If no", err);
}

PDFs.forEach(PDF.read); 
```
and avoid doing code that structurally look like this:
```
// ugly
for(var i = 0; i < PDFs.length; i += 1){
	var fileName = PDFs[i];
	readFromDisk(filename, function(file){
		var pages = splitIntoPages(file);
		for(var j = 0; j < pages.length; j += 1){
			var page = pages[j];
			saveToFolder('page' + j, page, function(err, done){
				console.log("Done! If no," err);
			});
		}
	});
}
```

All design must be fat thumb friendly, responsive for phones (without needing to use CSS media query breakpoints) foremost, and be easy to operate by elderly, toddler, disabled, and/or one-handed while someone is driving a dodgem bumper car with minimal screen attention glancing.

Look for folder or sub-project specific contributing or README or agent instructions, guidelines, rails, etc.

---

Mandatory primitive and composition rule: Build every feature from the smallest orthogonal primitives that can be composed to produce it; never add another event name, field, helper, wrapper, mode, or lifecycle when an existing primitive plus an explicit target can express the same behavior. A new primitive is allowed only when it has one clear owner and meaning, cannot be derived cleanly from existing primitives, removes more special cases than it adds, and is demonstrated by at least two unrelated uses. Higher layers should wrap lower layers but also expose them; lower layers must never learn higher-layer assumptions.

Before accepting a refactor, compare total code and bytes, performance, failure behavior, and tests; prefer the design from which stateful reuse, replacement, nesting, streaming, and fallback behavior can all be built, not the design that handles only the immediate example.

For library level tooling, fit everything in 1 file with each module (ideally 20 ~ 50 lines) separated by its own immediately invoked function (IIFE). For app-like coding, use `gun/kit` HTML iframe component framework where every feature (even buttons if they do something non-trivial) is split into separate (ideally 20 ~ 50 lines) html & js files that can compose, assimilate together to progressively enhance, extend, decorate or add to each minimally working feature (which in turn exposes the ability to be enhanced, extended, etc.) - one of the goals is that this can speed up coding collaborations (by many humans & many agents simultaneously) through parallel file contributions that reduces conflicts and eliminates git branch & worktree splitting.

---

## KIT components

A component is an ordinary, independently loadable HTML document with declared markup, dependencies, declared CSS, and only the behavior needed to hydrate or operate that 1 tiny HTML component, it exists in its own global (a page with 2 sub-components for example, each are allowed to use their own dependencies that would otherwise conflict or compete with the other component) isolated world and can only communicate with other components (even their own sub-components) through messaging. It should be as useful as possible when loaded directly even via `file://` albeit even if minimally plain, or gracefully reloading to another component that provides a user with better context. Most of the time however it will be loaded as a nested HTML kit component iframe, and should be ready to inherit as much styling as possible to match the surrounding design and UX. Component communication will orchestrate its seamless sizing and/or animations / transitions with or within or alongside other components. Treat its iframe boundary as a real component boundary: the component owns its DOM, while callers know its URL, its API or default request body, optional message passed return values or deliberately published events. Components can progressively enhance, extend, enrich, decorate other components in failsafe ways but must not break any minimally working behavior. Tests should inspect components individually and in various combinations to assert behavior.

Arbitrary document previews are not KIT components. Run them in an iframe sandbox that omits `allow-same-origin`, forms, popups, modals, downloads, and top navigation; never combine `allow-scripts` with `allow-same-origin` for same-origin or `srcdoc` content. Pin an inert base URL, then put the fixed CSP and trusted guards before untrusted markup so `srcdoc` cannot inherit host paths or weaken the policy; suppress referrers and ambient credentials, and deny network and device capabilities by default. KIT deliberately rejects messages from opaque sandbox frames, including under `file://` where every message origin is `null`; do not route around that boundary.

### KIT communication

- Use `await kit.fetch(url||iframe, data, target)` with one `kit.createServer((req, res)=>{ ... })` for a finite request that has one response or view. For example partial or "full" page changes, forms, menus, details, and initial snapshots are finite requests, and/or may setup further communications.
- Use `kit.say(data, topic, target)` and `kit.ear(event, listener)` for UX events, user actions or reactions, ongoing streams, live updates, etc. that may happen any number of times. Event topic names describe enduring capabilities, not individual command names.
- A layer that fully consumes an event calls `eve.preventDefault()`. KIT relays only unclaimed events across iframe boundaries and installs one relay per component/topic, so do not echo the same event manually through a second path.
- Use the browser's native `fetch` for a real HTTP resource. `kit.fetch` is the local Kit component request primitive, not an imitation of every browser HTTP feature.
- Do not implement the same finite hydration through both a "server" and an event listener. A component may receive a finite initial snapshot and then listen for genuinely later stream updates, but those are separate lifetimes and must not render the same bytes twice.

### Canonical Shape

Load `gun/kit/web.js` using the correct relative path or CDN, declare the component's real HTML before its behavior, and put the server registration first in the component's own behavior script. KIT queues an early request until that registration exists, so there is no need to add ready events, timeouts, or handshake flags.

```html
<script src="gun/kit/web.js"></script><link rel="stylesheet" href="gun/kit/web.css">

<p>Hello <span name="who">World</span>!</p>

<style>
	span { color: blue; color: var(--hue, blue); }
</style>

<script>
kit.createServer(function(req, res){
	// req.body = {who: "Kitten"};
  res.send(kit.bind(document, req.body));
});
</script>
```

There is one component server per document. Its request contract must be visible before parser, drawing, and interaction helpers so a reader can understand the boundary first. Keep helpers as short object methods with one responsibility, and keep the server handler as orchestration rather than hiding all work inside it.

`req.body` is the payload supplied by the caller. It may be an object, an array, or raw text. Put only small, addressable, non-sensitive state in a URL. Large output, arbitrary bytes, private values, and transient state belong in the body.

`kit.bind(document, data)` hydrates or partially updates the component with matching nested name attributes.

`res.send(data)` in-browser only sends message-passable JS primitives (including transferable arrays / objects) back to (if) the/a `fetch` and only if it had no target (else the "return" value is the loading of the iframe component into the target), and it won't actually send any DOM (plain text encoded or otherwise) regardless of whether it is given `document`, `self`, `window` (this is merely to match any potential SSR/remote/edge function).

### Prefer Declarative Binding

Use nested `name` attributes to make the HTML declare the shape it accepts, then end with `res.send(kit.bind(document, data))`. A nested element reads the matching nested field. A scalar writes through `textContent` or a form control's `value`; an object reveals a container so its descendants can bind; `false`, `null`, or `undefined` hides it (for now, though this will probably change in the future to support checkboxes etc.). Data with no matching top-level branch leaves unrelated markup alone. `kit.bind` returns its first argument so binding and sending compose without another helper.

Use the smallest meaningful names, but make them describe the data rather than its visual position. Never insert trusted-looking HTML from data. If a variable number of rows cannot be expressed by scalar bindings, declare one hidden model or `<template>` in the HTML, clone it, recursively or iteratively fill it with `textContent`, replacing or appending children (this should be a feature of KIT's binding by annotating HTML components). Then call `res.send(document)`. Do not build markup strings in JavaScript.

### Prefer Explicit Targets

Prefer submitting form elements or fetch targeted elements that use / render their own component view, this is significantly better than getting returned data that then has to be parsed again and rendered into some inline built view (duplicative, unnecessary, mixing concerns, & poor isolation).

Pass a URL without a target for a hidden, reused, programmatic component. Pass an iframe `name` only when declarative or a nested component must address a visible component without holding its element. Target names are local routing names, not global services: the nearest routing scope is used, names beginning with `_` are reserved, and duplicate matching iframe names fail instead of being guessed. The document that owns the target also owns and declares its name.

Native GET forms may target an iframe and put their named controls in `req.query`; for a direct GET component load, KIT also supplies those values as the initial body. KIT intercepts named POST forms and sends their fields as a finite component request. An `onsubmit` handler may validate or edit controls and then allow the event to continue. Do not send a second request from that handler, and remember that calling the browser's low-level `form.submit()` bypasses submit events.

The optional target never changes the meaning of the body. Do not put routing fields, DOM references, aliases, etc. into a universal KIT request. A caller that needs only returned data should omit the target. A caller that needs visible hydration should target the exact owned iframe whenever possible.

### Compose, Assimilate, Extend

Aim for one independently understandable feature per 20–50 line HTML or JS file. This is a design pressure, not permission to scatter inseparable statements. When features grows, keep its original HTML as the stable entry component and put independently useful renderers, parsers, styles, or child components in a folder with the same name. Load only the pieces used by that component. Compose through URLs, requests, targets, events, and returned handles rather than shared globals or selectors into surrounding documents.

For external dependencies prefer using a CDN but ALWAYS pin an exact immutable version with a verified SRI `integrity` attribute value if any appropriate `crossorigin` attribute. A dependency that is not needed during initial interaction should load lazily; preload only when there is a demonstrated user pause that hides its cost. Importantly: locally cache (simulated or otherwise) these external dependencies so the app can still work offline-first after some first load or download (this should be a feature of KIT to automatically cache & subsequently inject in-place of network errors, Service Workers or not).

Assume `file://` but do NOT let that limit features, progressively enhance for richer hosts (`HTTPS`, `localhost`, `OPFS`, etc.) but have error components that notify & instruct or link the user on how to upgrade or why offline-first is impossible at this moment.

### iFrame Resize

A component's normal body flow determines its intrinsic height. However min/max width/heights and overflow policy by if any parent must be respected. KIT's resize observer reports the body's border box to only the direct parent which then resizes the source iframe. It must be careful to exactly mimic the component as if were an inherited DIV, not to twitch or glitch during resizing (animated or not) some would-be-unnecessary scrollbar. Fixed and absolutely positioned children do not increase intrinsic height, exactly as they would not enlarge a normal div. We want to support playful UI transitions where a buttons/elements/etc. can morph (on scroll, CSS scroll timeline / animations / transitions, requestAnimationFrame, FLIP animation technique, or other) and may turn into a scrollable section or page, but should not glitch with jittering scrollbars before or meanwhile.

As much as possible on a phone, scrolling should cause the URL / browser / OS bars to collapse / slide / hide so there is more screen realestate for the app, make sure these do not cause a sudden layout shift if/when they occur, use the expected size or if unknown make sure it is silky smooth. Same with a phone's keyboard popup, whatever item was the intent or focus stays in its relatively correct same view point, for example: if a chat box was near the bottom the keyboard should not pop up over it (the chatbox should be near the bottom but above the keyboard), if something is being searched for then it should show up in the middle of the view, etc.

Do not add manual measurements, resize messages, delayed refreshes, hold flags, `data-fit` attributes, hardcoded heights, or scroll geometry to stabilize an individual component. Avoid anything (CSS, JS, etc.) that could cause a scrollbar repeatedly appearing & disappearing around a fractional boundary. If sizing flickers, reduce the page to an intrinsic layout case and report a bug to KIT to fix the automatic sizing primitive or the component's real CSS cause rather than patching the component itself.
