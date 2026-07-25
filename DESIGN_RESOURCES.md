# Curated Design and Component Resources

Use this registry to make informed, original design decisions. It is a research catalogue, not a permission slip to copy code, layouts, brand assets, or visual identity.

| Category | Resource | Best use | Adoption rule |
| --- | --- | --- | --- |
| Design-system analysis | [getdesign.md](https://getdesign.md/) | Study reusable `DESIGN.md` systems: color, type, spacing, components, and reasoning. | Convert insights into this project's `design.md`; do not import a system unchanged. |
| Design-system gallery | [Aura](https://www.aura.build/design-systems?sort=popular) | Compare complete visual systems and component language. | Select principles, not a cloned theme. |
| Visual research | [Pinterest](https://www.pinterest.com/) | Assemble focused mood/reference boards. | Save original source links; no unlicensed asset reuse. |
| Visual research | [Awwwards](https://www.awwwards.com/) | Observe high-end interaction, hierarchy, and storytelling. | Inspect performance cost before adopting motion patterns. |
| Visual research | [Godly](https://godly.website/) | Discover contemporary website patterns and layout rhythm. | Extract one specific idea at a time into the reference ledger. |
| React/Tailwind registry | [21st.dev](https://21st.dev/) | Discover shadcn-compatible components, marketing blocks, shaders, and interactions. | Copy only after dependency, a11y, mobile, motion, and bundle review. Integrate into project tokens. |
| Microinteractions | [Fancy Components](https://www.fancycomponents.dev/) | Find small open-source React interactions and components. | Prefer lightweight, purposeful interactions; avoid decoratively expensive effects. |
| Icons | [Phosphor Icons](https://phosphoricons.com/) | Single source for UI iconography. | Use `@phosphor-icons/react` named imports only; maintain coherent weight and size per component family. |

## Component evaluation gate

Before adopting a component, confirm all of the following:

1. It solves a real user or communication need in the official brief.
2. It can inherit this project's tokens and does not force an unrelated aesthetic.
3. Keyboard behavior, focus visibility, semantic markup, and reduced-motion behavior are acceptable.
4. It works at desktop and mobile widths without layout shift or clipped content.
5. Its dependencies and client-side JavaScript are proportionate to its value.
6. It passes the local browser and performance gates in `PERFORMANCE_AND_QA.md`.
