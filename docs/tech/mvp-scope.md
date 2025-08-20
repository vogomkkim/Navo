# MVP Scope v0.9

## Acceptance Criteria

- Draft preview ≤ 10 s (mock acceptable in early weeks)
- Editor supports: inline text edit, image replace/upload, style sliders, add/move/remove section, chat edits with visible diff
- Publish: subdomain auto, success URL, rollback last 3 builds
- Analytics: track `view` and `click`; daily suggestion (style or copy)

## SLO Targets

- Editor perceived latency ≤ 200 ms
- Average publish time ≤ 60 s
- Availability ≥ 99.5%

## Minimum Events

- `view:page`
- `click:cta`
- `submit:form`
- `purchase`
- `editor:change`
- `publish:success`

## Notes

- Keep end‑user experience simple; hide infra details
- Prefer plain language and visible results

See `README.md` for the canonical list and `docs/tech/roadmap.md` for milestones.
