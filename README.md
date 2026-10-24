# Playwright Docker Kubernetes Testing Lab

A Playwright testing framework that demonstrates UI and API testing with Docker containerisation and Kubernetes-based parallel execution — built for learning scalable QA infrastructure.

---

## What This Project Covers

| Layer | Tool | What It Does |
|---|---|---|
| Test runner | Playwright | Runs UI and API tests |
| Parallelism (local) | Playwright workers | Runs test files concurrently within one process |
| Parallelism (CI) | GitHub Actions matrix | Splits the suite into 3 shards running on separate machines |
| Packaging | Docker | Wraps the test environment into a portable container |
| Infrastructure | Kubernetes | Schedules test pods, controls resources, and manages lifecycle |

---

## Prerequisites

Make sure you have the following installed before getting started.

### 1. Node.js
Download the LTS version from [nodejs.org](https://nodejs.org)

Verify installation:
```bash
node --version   # should be v18 or higher
npm --version
```

### 2. Git
Download from [git-scm.com](https://git-scm.com)

### 3. Docker Desktop
Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)

Verify installation:
```bash
docker --version
```

### 4. kubectl (for Kubernetes — optional for local K8s)
Download from [kubernetes.io/docs/tasks/tools](https://kubernetes.io/docs/tasks/tools)

### 5. Minikube (local Kubernetes cluster — optional)
Download from [minikube.sigs.k8s.io](https://minikube.sigs.k8s.io/docs/start)

---

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/playwright-docker-kubernetes-testing-lab.git
cd playwright-docker-kubernetes-testing-lab
```

### 2. Install Node dependencies
```bash
npm install
```

### 3. Install Playwright browsers
```bash
npx playwright install
```

### 4. Set up environment variables
```bash
cp .env.example .env
```

Then open `.env` and fill in the values:

```
STANDARD_USERNAME=standard_user
PASSWORD=secret_sauce
LOCKED_OUT_USER=locked_out_user
PETSTORE_API_KEY=special-key
```

> These are the public demo credentials for [saucedemo.com](https://www.saucedemo.com) and [petstore.swagger.io](https://petstore.swagger.io). The `.env` file is gitignored and will never be committed.

---

## Project Structure

```
playwright-docker-kubernetes-testing-lab/
├── framework/
│   ├── api/                    # API client classes
│   │   └── petStoreClient.ts
│   ├── pages/                  # Page Object Models
│   │   └── saucedemologinPage.ts
│   ├── support/
│   │   └── fixtures.ts         # Custom Playwright fixtures
│   ├── testdata/
│   │   └── petPayload.ts       # API test data
│   └── utils/
│       ├── authHelper.ts       # API auth header setup
│       └── apiHelper.ts        # Report attachment helper
├── tests/
│   ├── ui/
│   │   └── saucedemoproduct.spec.ts   # UI tests
│   └── api/
│       └── petstore.spec.ts           # API tests
├── k8s/
│   ├── configmap.yaml          # Non-sensitive config for K8s pods
│   ├── secret.yaml             # Credentials for K8s pods
│   └── playwright-job.yaml     # Kubernetes Job (3 shards, 2 workers each)
├── .github/
│   └── workflows/
│       └── playwright.yml      # GitHub Actions CI pipeline
├── Dockerfile                  # Container definition
├── .dockerignore
├── playwright.config.ts
├── eslint.config.mjs
└── package.json
```

---

## Running Tests

### Locally (no Docker)

```bash
# Run all tests
npm test

# Run UI tests only (all browsers)
npm run test:ui

# Run API tests only
npm run test:api

# View the HTML report
npm run report
```

### With Docker

```bash
# Build the image
docker build -t playwright-tests .

# Run all tests
docker run --env-file .env playwright-tests

# Run API tests only
docker run --env-file .env playwright-tests --project=api

# Run a specific browser
docker run --env-file .env playwright-tests --project=chromium

# Simulate a single Kubernetes shard (shard 1 of 3, 2 workers)
docker run --env-file .env -e CI=true -e WORKERS=2 playwright-tests --shard=1/3
```

### With Kubernetes (local minikube)

```bash
# Start minikube
minikube start

# Build image inside minikube (so it can access it locally)
eval $(minikube docker-env)
docker build -t playwright-tests:latest .

# Update playwright-job.yaml image to: playwright-tests:latest
# and add imagePullPolicy: Never before applying

# Apply manifests
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/playwright-job.yaml

# Watch pod status
kubectl get pods -w

# View logs from a pod
kubectl logs -l app=playwright-tests

# Clean up after run
kubectl delete job playwright-test-run
```

---

## Viewing HTML Reports

The reporter used depends on how the tests are run. The key rule for `merge-reports` is that it accepts **one combined directory**, not multiple separate ones — blobs from all shards must be copied into a single folder first.

### Local (no Docker)

HTML report is generated automatically after each run:
```bash
npm run report
# or
npx playwright show-report
```

### Local Docker (without `CI=true`)

The HTML reporter is used. Mount a volume so the report is written to your host machine:
```bash
# Windows PowerShell
docker run --env-file .env -v "${PWD}/playwright-report:/app/playwright-report" playwright-tests

# Then open it
npx playwright show-report playwright-report
```

### Local Docker shard simulation (with `CI=true`)

The blob reporter is used. Combine all shard blobs into one folder, then merge:
```bash
# Run 3 shards (each writes blob-report to the mounted folder with a shard suffix)
docker run --env-file .env -e CI=true -e WORKERS=2 -v "${PWD}/blob-report-1:/app/blob-report" playwright-tests --shard=1/3
docker run --env-file .env -e CI=true -e WORKERS=2 -v "${PWD}/blob-report-2:/app/blob-report" playwright-tests --shard=2/3
docker run --env-file .env -e CI=true -e WORKERS=2 -v "${PWD}/blob-report-3:/app/blob-report" playwright-tests --shard=3/3

# Combine all blobs into one directory
mkdir blob-report-all
xcopy blob-report-1 blob-report-all /E /Y   # Windows
xcopy blob-report-2 blob-report-all /E /Y
xcopy blob-report-3 blob-report-all /E /Y

# Merge into HTML report (single directory argument)
npx playwright merge-reports --reporter html ./blob-report-all
npx playwright show-report
```

### Kubernetes

After the Job completes, pods stay in `Completed` state. Copy blob reports from each pod into one local folder, then merge:
```bash
# Copy blob reports from all 3 pods into one combined directory
mkdir blob-report-all
kubectl cp playwright-test-run-0:/app/blob-report/. ./blob-report-all
kubectl cp playwright-test-run-1:/app/blob-report/. ./blob-report-all
kubectl cp playwright-test-run-2:/app/blob-report/. ./blob-report-all

# Merge into a single HTML report
npx playwright merge-reports --reporter html ./blob-report-all
npx playwright show-report
```

### GitHub Actions CI

The pipeline merges reports automatically. After a run completes:
```
GitHub → Your repo → Actions tab → click the workflow run → Artifacts section → download playwright-report
```
Reports are kept for **30 days**. Open `index.html` from the downloaded zip to view the full merged report.

### Report summary

| Run type | Reporter used | Where to find the report |
|---|---|---|
| Local (no Docker) | HTML | `playwright-report/` — `npm run report` |
| Local Docker (no `CI=true`) | HTML | Mount `-v` and open `playwright-report/` |
| Local Docker (with `CI=true`) | Blob | Combine shard folders → `merge-reports` |
| Kubernetes | Blob | `kubectl cp` all pods → `merge-reports` |
| GitHub Actions | Blob → merged HTML | Actions → Artifacts → `playwright-report` |

---

## GitHub Actions CI

The pipeline runs automatically on push or pull request to `main`/`master`.

It splits the test suite into **3 shards** running in parallel, each with **2 workers**, giving up to **6 concurrent test executions**. After all shards finish, a merge job combines them into a single downloadable HTML report.

### Add Secrets to GitHub

Go to your repository on GitHub:
**Settings → Secrets and variables → Actions → New repository secret**

Add these four secrets:

| Secret name | Value |
|---|---|
| `STANDARD_USERNAME` | `standard_user` |
| `PASSWORD` | `secret_sauce` |
| `LOCKED_OUT_USER` | `locked_out_user` |
| `PETSTORE_API_KEY` | `special-key` |

> Note: These are public demo credentials for [saucedemo.com](https://www.saucedemo.com) and [petstore.swagger.io](https://petstore.swagger.io). In a real project replace these with your actual credentials and never commit them.

---

## How the Parallel Execution Works

```
GitHub Actions / Kubernetes
        │
        ├── Shard 1 ── Worker 1 ─── test file A
        │           └── Worker 2 ─── test file B
        │
        ├── Shard 2 ── Worker 1 ─── test file C
        │           └── Worker 2 ─── test file D
        │
        └── Shard 3 ── Worker 1 ─── test file E
                    └── Worker 2 ─── test file F
```

- **Workers** run test files concurrently inside a single process/pod
- **Shards** split the suite across separate machines (GitHub runners) or pods (Kubernetes)
- The Kubernetes Job uses `completionMode: Indexed` — each pod gets a `JOB_COMPLETION_INDEX` (0, 1, 2) which maps to `--shard=1/3`, `--shard=2/3`, `--shard=3/3`

---

## Why Docker for QA

| Benefit | Why It Matters |
|---|---|
| Consistent environment | Every engineer and CI runner uses exactly the same Node version, browser version, and OS — no "it works on my machine" |
| No local setup conflicts | The container is isolated from whatever browsers or tools are installed on the host |
| Locked dependencies | The Playwright browser version is pinned in the Docker base image, preventing surprise failures after updates |
| Portable | Share a test environment with a developer, a tester, or deploy it to any cloud with one command |
| Fast onboarding | A new team member runs two commands and has a working test environment |
| Reproducible CI | Every CI run starts from the same image — no flakiness caused by environment drift |

---

## Why Kubernetes for QA

| Benefit | Why It Matters |
|---|---|
| Horizontal scaling | Run hundreds of test files in parallel across many pods — turn a 30-minute suite into a 5-minute one |
| Resource management | Set CPU and memory limits per pod, preventing one runaway test from starving others |
| Automatic scheduling | Kubernetes decides which node runs each pod — no manual machine management |
| Pod isolation | A crash in one shard does not affect the others |
| Lifecycle control | Pods start on demand and are cleaned up automatically after the Job completes — no idle machines |
| Infrastructure as code | The entire test execution environment is defined in YAML files, versioned alongside the tests |
| Scales with the project | As the test suite grows from 50 to 5000 tests, increase `completions` and `parallelism` in one line |

### Kubernetes vs Just Using More Workers

Adding more Playwright workers on a single machine eventually hits CPU and memory limits. Kubernetes breaks past that ceiling by spreading the load across multiple machines, each running their own set of workers.

---

## Code Quality

```bash
# Run ESLint
npm run lint

# Auto-format all files
npm run format
```

ESLint is configured with:
- TypeScript rules (`typescript-eslint`)
- Playwright-specific rules (`eslint-plugin-playwright`) applied to test specs
- No `console.log`, no unused variables, no implicit `any`

---

## Environment Variables Reference

| Variable | Where Set | Purpose |
|---|---|---|
| `STANDARD_USERNAME` | `.env` / GitHub Secret / K8s Secret | Saucedemo login username |
| `PASSWORD` | `.env` / GitHub Secret / K8s Secret | Saucedemo login password |
| `LOCKED_OUT_USER` | `.env` / GitHub Secret / K8s Secret | Saucedemo locked user |
| `PETSTORE_API_KEY` | `.env` / GitHub Secret / K8s Secret | Petstore API auth key |
| `WORKERS` | K8s ConfigMap / CI env | Playwright workers per shard |
| `CI` | GitHub Actions / K8s ConfigMap | Enables blob reporter and CI settings |
