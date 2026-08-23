# Partner Integration Management Frontend

Angular frontend for managing partner onboarding, integration updates, VPN actions, technical checks, UAT, handover and reporting.

## Main Areas

- Partner portfolio with category filters and searchable business records.
- Request pipeline with status ownership, aging and priority tracking.
- Partner profile pages with request history and PDF export.
- Pipeline and partner list downloadable reports.
- Frontend-only data mode backed by `public/data/partner-state.txt`.

## Frontend Data Mode

The app does not require a backend for the current V1 flow.

Official source data lives in:

```text
public/data/partner-state.txt
```

The file contains JSON text with:

- `version`
- `partners`
- `requests`
- `events`

When the app starts, Angular reads that TXT file before rendering the workspace. User actions such as creating partners, opening requests and updating workflow steps are saved in browser `localStorage` as local working changes.

When the TXT `version` changes, the app reloads from the new official source file.

## Development

```bash
npm install
npm start
```

The local frontend normally runs on `http://localhost:4200`. Use another port if that one is busy.
