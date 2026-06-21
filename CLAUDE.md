# component-fetch — Agent Instructions

Pull named UI components from external registries. Zero auth, runs from any machine.

## Quick ref

```bash
npx github:Turbial/component-fetch --source shadcn --name button --out ./out
npx github:Turbial/component-fetch --source magicui --name marquee --out ./out
npx github:Turbial/component-fetch --source 21st --name shadcn/accordion --out ./out
npx github:Turbial/component-fetch --source hyperui --name marketing/ctas/1 --out ./out
```

## Supported sources

| Source    | `--name` format             | Example                          |
|-----------|-----------------------------|----------------------------------|
| `shadcn`  | component/block slug        | `--name login-01`                |
| `magicui` | component slug              | `--name marquee`                 |
| `21st`    | `author/component`          | `--name shadcn/accordion`        |
| `hyperui` | `category/subcategory/n`    | `--name marketing/ctas/1`        |

## Output

```
<out>/
  manifest.json    # npm deps + fetched tree + integration notes
  files/           # .tsx sources (registry) or component.html (hyperui)
```

## Browse first

- shadcn: https://ui.shadcn.com/docs/components
- magicui: https://magicui.design/docs/components
- 21st.dev: https://21st.dev
- hyperui: https://www.hyperui.dev/components

## Bin aliases

- `npx github:Turbial/component-fetch` (primary)
- `npx cfetch` (short alias, if installed globally)

## Adaptation

Registry sources (shadcn/magicui/21st) return React + Tailwind `.tsx` — rewrite JSX into target template language. HyperUI returns plain HTML + Tailwind classes, usually drop-in ready.
