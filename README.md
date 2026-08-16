# TOY
Code on Phone is a SaaS IDE for toying around with vibe coding.

## Why

While keyboards are powerful interfaces, humans have evolved computers to be mobile and so code should be too. A future where meaningful programming can only be done on a keyboard would be a great loss to productivity, this must be fixed.

## Old & New

Code on Phone needs to pioneer the most intuitive & efficient pedestrian programming interfaces, however everything it is built ontop of must be fixable via itself - if something breaks it cannot rely on needing a keyboard to resolve. Therefore it must expose access to the lowest level traditional systems as well: shell command line terminals.

## Structure

TOY is the Open Source future, COP is the enterprise legacy integrations. `index.html` advertises sellable features of TOY with a login link to `app.html` which lets users connect to their IT department's `ssh` spec COP host (or a limited VM or demo), TOY then inits `#shell.html` using the [`gun/kit`](https://github.com/amark/gun) framework. `shell.html` parses an interactive bash CLI, streaming output into matching modular `cmd/*.html` iframe components - these may have a `#` dedicated `pty` session, or may spawn upgrades to the ssh host via `^` messages that bypass `pty` entirely, like to serve or write files directly.

## Contributing

See `contributing.md` & `test/README.md`. All features should be separate file modular `kit` iframe component, ideally only 20 ~ 50 lines long - for example, even the shell's `<help>` is its own isolated `aid.js` with event listener that progressively enhances `#shell.html`, use this as a guiding inspiration.