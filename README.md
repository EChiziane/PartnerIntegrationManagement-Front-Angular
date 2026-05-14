# Carload System Management Frontend

Angular frontend for the Carload System Management platform used by Transportes Chiziane to manage customers, carloads, invoices, quotations, campaigns/sprints, dashboards and operational reports.

This repository contains only the frontend application. The Spring Boot backend is maintained in a separate repository/project.

## Main Features

- Modern landing page and login flow.
- Protected application layout.
- Dashboard with operational carload summaries.
- Customer management and customer detail view.
- Carload management with filters, status tracking and PDF reports.
- Driver and logistics manager management.
- Invoice and quotation workflows.
- Campaign/sprint management and campaign reports.
- Location suggestions for recurring delivery areas.
- PDF generation for business documents.
- Internationalization foundation through local translation files.
- Responsive UI based on NG-ZORRO components.

## Tech Stack

- Angular 19
- TypeScript
- RxJS
- NG-ZORRO Ant Design
- Angular Material/CDK
- jsPDF
- jspdf-autotable
- html2canvas
- Moment.js

## Project Structure

```txt
src/app
  core/
    guards/          route protection
    interceptors/    HTTP token handling
    services/        API and domain services

  features/
    auth/            login and registration
    carloads/        carload list and detail flows
    customers/       customer list and detail flows
    dashboard/       operational dashboard
    drivers/         driver management
    invoices/        invoice management
    managers/        logistics manager management
    public/          public landing page
    quotes/          quote documents
    quotations/      quotation flow
    shell/           authenticated layout
    sprints/         campaign/sprint management
    users/           user management

  shared/
    data/            static/shared datasets
    models/          TypeScript interfaces/models
    pipes/           reusable pipes

src/environments
  environments.ts
  environment.prod.ts
```

## Requirements

- Node.js LTS
- npm
- Angular CLI

> Production builds should use an LTS version of Node.js.

## Environment Configuration

The API base URL is configured in:

```txt
src/environments/environments.ts
src/environments/environment.prod.ts
```

Example:

```ts
export const environment = {
  production: false,
  baseURL: 'http://localhost:8080'
};
```

For production, use the deployed backend URL without exposing database credentials or secrets.

## Installation

```bash
npm install
```

## Running Locally

```bash
npm start
```

or:

```bash
ng serve
```

The app will run by default on:

```txt
http://localhost:4200
```

## Build

```bash
npm run build
```

The compiled output is generated in:

```txt
dist/customer-dashboar-angular-ng-zorro
```

## Tests

```bash
npm test
```

## Deployment Notes

- Configure the production `baseURL` to point to the deployed backend.
- Configure CORS in the backend to allow the frontend production domain.
- Do not commit tokens, passwords or database connection strings.
- After deployment, test:
  - login;
  - dashboard loading;
  - carload creation/update;
  - invoice creation/download;
  - customer detail and PDF generation;
  - sprint/campaign reports.

## Security Notes

- JWT tokens are attached through the HTTP interceptor.
- Protected routes should remain behind the Angular auth guard.
- Sensitive credentials must stay in the backend/deployment environment, never in the frontend.
- The frontend should only store the minimum required session data.

## Related Project

Backend API:

```txt
CarloadSystemManagement
```

## License

Private/internal project unless a license is explicitly added.
