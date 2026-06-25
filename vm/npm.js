// npm // AUTHOR CREDIT: @abenezermario

VM.cmd.routes.push({
  match: /^npm\s+install\s+/,
  run: function (s, emu) {
    return VM.pkg.npm.run(s, emu);
  }
});

VM.pkg.npm = {};
VM.pkg.npm.got = {};

VM.pkg.npm.run = function (cmd, emu) {
  var m = cmd.match(/^npm\s+install\s+(.+)/);
  if (!m) return false;
  VM.pkg.npm.exec(m[1].trim().split(/\s+/), emu);
  return true;
};

VM.pkg.npm.exec = async function (names, emu) {
  VM.pkg.npm.got = {};
  var base = "/root",
    t = Date.now();
  VM.say("npm install " + names.join(" ") + "\n");
  for (var i = 0; i < names.length; i++) {
    var raw = names[i].replace(/^--.*/, "");
    if (!raw) continue;
    var at = raw.lastIndexOf("@");
    var name = at > 0 ? raw.slice(0, at) : raw;
    var ver = at > 0 ? raw.slice(at + 1) : "latest";
    try {
      await VM.pkg.npm.one(name, ver, emu, 0, base);
    } catch (e) {
      VM.say("ERR " + e.message + "\n");
    }
  }
  var n = Object.keys(VM.pkg.npm.got).length;
  VM.say(
    "added " +
      n +
      " packages in " +
      ((Date.now() - t) / 1000).toFixed(1) +
      "s\n",
  );
  emu.serial0_send("echo done\n");
};

VM.pkg.npm.one = async function (name, ver, emu, depth, base) {
  if (VM.pkg.npm.got[name]) return;
  VM.pkg.npm.got[name] = 1;
  var pad = "  ".repeat(depth || 0);

  try {
    var res = await fetch("https://registry.npmjs.org/" + name + "/latest");
    if (!res.ok) res = await fetch("https://registry.npmjs.org/" + name);
    if (!res.ok) return;
    var meta = await res.json();
    ver = meta.version || (meta["dist-tags"] || {}).latest;
    if (!ver) return;
  } catch (e) {
    return;
  }

  VM.say(pad + "+ " + name + "@" + ver + "\n");

  var tree = await fetch(
    "https://data.jsdelivr.com/v1/packages/npm/" + name + "@" + ver,
  );
  if (!tree.ok) return;
  var files = [];
  var flat = (arr, pre) => {
    (arr || []).forEach((f) => {
      var p = pre + "/" + f.name;
      if (f.type === "directory") flat(f.files, p);
      else files.push(p);
    });
  };
  flat((await tree.json()).files, "");

  var dest = base + "/node_modules/" + name;
  VM.fs.dir(emu, dest);

  for (var j = 0; j < files.length; j += 12) {
    var batch = files.slice(j, j + 12);
    await Promise.all(
      batch.map(async (f) => {
        try {
          var r = await fetch(
            "https://cdn.jsdelivr.net/npm/" + name + "@" + ver + f,
          );
          if (!r.ok) return;
          await VM.fs.put(emu, dest + f, new Uint8Array(await r.arrayBuffer()));
        } catch (e) {}
      }),
    );
  }

  var deps = Object.keys(meta.dependencies || {});
  for (var k = 0; k < deps.length; k++) {
    await VM.pkg.npm.one(deps[k], "latest", emu, (depth || 0) + 1, base);
  }
};