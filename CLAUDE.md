# Playwright Docker Kubernetes Testing Lab

## Project Overview
A Playwright testing framework covering UI tests (Saucedemo) and API tests (Petstore), containerised with Docker and designed to scale on Kubernetes using sharded parallel execution.

## Tech Stack
- **Playwright** v1.64 — test runner, UI automation, API client
- **TypeScript** — all source files
- **Docker** — packages the test environment
- **Kubernetes** — runs sharded test pods in parallel
- **GitHub Actions** — CI with 3-shard matrix + merged HTML report
- **ESLint + Prettier** — code quality

## Project Structure
```
framework/
  api/            # API client classes (PetStoreClient)
  pages/          # Page Object Models (SaucedemoLoginPage)
  support/        # Custom Playwright fixtures
  testdata/       # Static test payloads (petPayload.ts)
  utils/          # Shared helpers (authHelper, apiHelper)
tests/
  ui/             # UI test specs (saucedemoproduct.spec.ts)
  api/            # API test specs (petstore.spec.ts)
k8s/              # Kubernetes manifests (Job, ConfigMap, Secret)
.github/
  workflows/      # GitHub Actions CI pipeline
```

## Key Commands
```bash
npm test                          # run all tests locally
npm run test:ui                   # UI tests only (all browsers)
npm run test:api                  # API tests only
npm run lint                      # ESLint check
npm run format                    # Prettier format
npm run report                    # open HTML report (local runs only)

# Docker
docker build -t playwright-tests .
docker run --env-file .env playwright-tests
docker run --env-file .env -v "${PWD}/playwright-report:/app/playwright-report" playwright-tests  # with report

# Docker shard simulation (CI=true → blob reporter)
docker run --env-file .env -e CI=true -e WORKERS=2 playwright-tests --shard=1/3
```

## HTML Reports by Run Type

| Run type | Reporter | How to view |
|---|---|---|
| Local (no Docker) | HTML | `npm run report` |
| Local Docker (no `CI=true`) | HTML | mount `-v` → `npx playwright show-report playwright-report` |
| Local Docker (with `CI=true`) | Blob | combine shard folders → `npx playwright merge-reports --reporter html ./blob-report-all` |
| Kubernetes | Blob | `kubectl cp` each pod → same merge command above |
| GitHub Actions | Blob → merged | Actions tab → Artifacts → download `playwright-report` |

**Important**: `merge-reports` takes ONE directory. Copy all shard blob outputs into a single folder first, then run merge on that folder. Running it with multiple directory arguments is an error.

## Framework Conventions
- **POM pattern**: all locators and page actions live in `framework/pages/`. Tests only call page methods, never raw locators.
- **Fixtures**: all custom fixtures in `framework/support/fixtures.ts`. Import `test` and `expect` from there, not directly from `@playwright/test`.
- **API client**: `PetStoreClient` methods return raw `APIResponse`. Assertions stay in the test spec.
- **Auth**: `getApiAuthHeaders()` in `authHelper.ts` is the single source for API auth headers. It is applied once to the `APIRequestContext` via `extraHTTPHeaders` — never passed per-request.
- **Sharding**: `--shard=N/M` is used in both K8s (via `JOB_COMPLETION_INDEX`) and GitHub Actions (matrix). Workers per shard controlled by `WORKERS` env var.
- **No comments in code** unless the reason is non-obvious.
- **No console.log** — use `attachApiResponse()` for API response visibility in reports.

## Environment Variables
Loaded from `.env` locally (via dotenv in `playwright.config.ts`), from Kubernetes Secret/ConfigMap in K8s, and from GitHub Actions secrets in CI.

| Variable | Purpose |
|---|---|
| `STANDARD_USERNAME` | Saucedemo standard user |
| `PASSWORD` | Saucedemo password |
| `LOCKED_OUT_USER` | Saucedemo locked out user |
| `PETSTORE_API_KEY` | Petstore API auth key |
| `WORKERS` | Playwright workers per shard (K8s/CI) |
| `CI` | Switches to blob reporter + CI settings |

## Playwright Projects
| Project | Matches | Purpose |
|---|---|---|
| `chromium` | `tests/ui/**` | UI tests on Chrome |
| `firefox` | `tests/ui/**` | UI tests on Firefox |
| `webkit` | `tests/ui/**` | UI tests on Safari |
| `api` | `tests/api/**` | API tests, baseURL = petstore |
