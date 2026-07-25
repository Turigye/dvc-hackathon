# Performance and Browser QA Gates

## Baseline architecture

- Use Next.js App Router and Server Components by default.
- Load fonts through `next/font`; do not add third-party font stylesheet requests.
- Use `next/image` for application imagery with explicit `sizes` and dimensions.
- Import Phosphor icons by name so unused icons are tree-shaken.
- Dynamically import heavy client-only functionality and keep product-critical flow code straightforward.

## LCP gate

Target LCP <= 2.5 seconds on the production candidate. Record a trace with reload, then analyze the LCP breakdown before optimizing.

| LCP subpart | Target | Typical action |
| --- | --- | --- |
| TTFB | roughly 40% of total | Remove redirects; cache at the edge where appropriate. |
| Resource load delay | <10% | Put the LCP image in initial HTML; do not load it via CSS/JS or lazy loading. |
| Resource load duration | roughly 40% | Use AVIF/WebP, responsive dimensions, CDN delivery, and correct `sizes`. |
| Render delay | <10% | Remove render blocking, reduce long tasks, and keep the LCP element server-rendered. |

## Required browser checks

For each meaningful UI milestone:

1. Verify page identity and meaningful visible content.
2. Verify no framework error overlay.
3. Check console errors and warnings.
4. Test one intended interaction and confirm the rendered state change.
5. Capture desktop and mobile screenshots; check clipping, wrapping, overlap, scroll traps, missing assets, and layout shift.
6. Test keyboard navigation, focus visibility, labels, and reduced-motion behavior.

## Pre-submission command gate

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Then run the production server, test the core journey in an incognito browser, and record the final Core Web Vitals trace. Reject avoidable regressions.
