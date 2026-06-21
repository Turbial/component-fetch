#!/usr/bin/env node
// Universal component fetcher: pulls a component/block from a registry-style
// source (shadcn, magicui, 21st.dev) or a plain-HTML source (hyperui) and
// writes the raw source + a manifest.json to disk. Adapting the fetched
// code to a target site's stack (Handlebars, React, plain HTML, etc.) is a
// separate step performed by whoever calls this tool.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCES = {
  shadcn: { type: 'registry', urlTemplate: 'https://ui.shadcn.com/r/styles/default/{name}.json' },
  magicui: { type: 'registry', urlTemplate: 'https://magicui.design/r/{name}.json' },
  '21st': { type: 'registry', urlTemplate: 'https://21st.dev/r/{name}' },
  hyperui: { type: 'hyperui', urlTemplate: 'https://www.hyperui.dev/examples/{name}.html' },
};

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed ${res.status}: ${url}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed ${res.status}: ${url}`);
  return res.text();
}

async function resolveRegistry(source, name, visited, outDir) {
  if (visited.has(name)) return null;
  visited.add(name);
  const url = name.startsWith('http') ? name : SOURCES[source].urlTemplate.replace('{name}', name);
  const item = await fetchJson(url);

  const writtenFiles = [];
  for (const file of item.files || []) {
    const dest = path.join(outDir, 'files', file.path.replace(/^\//, ''));
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, file.content ?? '', 'utf8');
    writtenFiles.push(file.path);
  }

  const dependencies = item.dependencies || [];
  const registryDependencies = item.registryDependencies || [];
  const children = [];
  for (const dep of registryDependencies) {
    const child = await resolveRegistry(source, dep, visited, outDir);
    if (child) children.push(child);
  }

  return {
    name: item.name ?? name,
    type: item.type,
    description: item.description,
    dependencies,
    registryDependencies,
    files: writtenFiles,
    children,
  };
}

async function runRegistry(source, name, outDir) {
  const visited = new Set();
  const tree = await resolveRegistry(source, name, visited, outDir);

  const npmDependencies = new Set();
  (function collect(node) {
    if (!node) return;
    for (const d of node.dependencies) npmDependencies.add(d);
    for (const c of node.children) collect(c);
  })(tree);

  const manifest = {
    source,
    name,
    fetchedAt: new Date().toISOString(),
    npmDependencies: [...npmDependencies].sort(),
    componentsFetched: [...visited],
    tree,
    integrationNote:
      'Files are raw React/TSX as returned by the registry, written under files/. Adapt markup and CSS classes to the target stack before use.',
  };
  await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}

async function runHyperui(name, outDir) {
  const url = SOURCES.hyperui.urlTemplate.replace('{name}', name);
  const html = await fetchText(url);
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'component.html'), html, 'utf8');

  const manifest = {
    source: 'hyperui',
    name,
    fetchedAt: new Date().toISOString(),
    npmDependencies: [],
    files: ['component.html'],
    integrationNote:
      'Plain HTML + Tailwind utility classes, no JS framework. Drop directly into any static or server-rendered template; only Tailwind (or equivalent CSS) is required.',
  };
  await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { source, name, out } = args;

  if (!source || !name || !out) {
    console.error('Usage: node fetch.mjs --source <shadcn|magicui|21st|hyperui> --name <component-name> --out <output-dir>');
    process.exit(1);
  }
  if (!SOURCES[source]) {
    console.error(`Unknown source "${source}". Valid sources: ${Object.keys(SOURCES).join(', ')}`);
    process.exit(1);
  }

  const outDir = path.resolve(out);
  await mkdir(outDir, { recursive: true });

  const manifest =
    SOURCES[source].type === 'registry' ? await runRegistry(source, name, outDir) : await runHyperui(name, outDir);

  console.log(JSON.stringify({ ok: true, outDir, manifest }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
