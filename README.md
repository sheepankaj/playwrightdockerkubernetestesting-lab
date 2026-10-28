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
git clone https://github.com/sheepankaj/playwrightdockerkubernetestesting-lab.git
cd playwrightdockerkubernetestesting-lab
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
playwrightdockerkubernetestesting-lab/
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

### With AWS EKS

> **Note on automated CI deployment:** AWS Academy and organisation-managed accounts have Service Control Policies (SCPs) that block `iam:CreateOpenIDConnectProvider` and other IAM operations required for OIDC-based GitHub Actions → EKS authentication. For these accounts, EKS deployment is a manual step run from your local terminal. CI still handles test execution and Docker image publishing automatically — only the `kubectl apply` step is manual.

#### Prerequisites
Install the AWS CLI and authenticate:
```bash
# Install AWS CLI — https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html
aws configure   # enter your AWS Access Key, Secret, region: eu-north-1, output: json
```

#### Step 1 — Connect kubectl to your EKS cluster
```bash
aws eks update-kubeconfig --region eu-north-1 --name playwrighttest

# Verify connection
kubectl get nodes
```

#### Step 2 — Create the namespace and secrets
```bash
# Create the playwright namespace
kubectl apply -f k8s/namespace.yaml

# Create credentials secret inside the playwright namespace
kubectl create secret generic playwright-secrets \
  --namespace=playwright \
  --from-literal=STANDARD_USERNAME=standard_user \
  --from-literal=PASSWORD=secret_sauce \
  --from-literal=LOCKED_OUT_USER=locked_out_user \
  --from-literal=PETSTORE_API_KEY=special-key
```

#### Step 3 — Apply config and run the Job
```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/playwright-job.yaml

# Watch pods start across 3 shards
kubectl get pods -n playwright -w

# View test output from all pods
kubectl logs -n playwright -l app=playwright-tests --prefix
```

#### Step 4 — Collect reports
```bash
# Copy blob reports from all 3 pods into one folder
mkdir blob-report-all
kubectl cp playwright/playwright-test-run-0:/app/blob-report/. ./blob-report-all
kubectl cp playwright/playwright-test-run-1:/app/blob-report/. ./blob-report-all
kubectl cp playwright/playwright-test-run-2:/app/blob-report/. ./blob-report-all

# Merge into HTML report
npx playwright merge-reports --reporter html ./blob-report-all
npx playwright show-report
```

#### Step 5 — Clean up
```bash
kubectl delete job playwright-test-run -n playwright
```

> **Node type note:** `a1.large` is ARM64 (Graviton). The Docker image is built for both `linux/amd64` and `linux/arm64` via the CI pipeline — EKS will pull the correct architecture automatically. With 2 vCPU / 4 GB RAM, each pod runs 2 Playwright workers giving 3 shards × 2 workers = **6 parallel test slots** at ~$0.007/hr per node.

---

### With Kubernetes (local minikube)

#### Before applying manifests — create the Secret locally

`k8s/secret.yaml` is gitignored (never committed) to prevent credentials from entering the repository. Create the Kubernetes Secret directly via `kubectl` instead:

```bash
kubectl create secret generic playwright-secrets \
  --from-literal=STANDARD_USERNAME=standard_user \
  --from-literal=PASSWORD=secret_sauce \
  --from-literal=LOCKED_OUT_USER=locked_out_user \
  --from-literal=PETSTORE_API_KEY=special-key
```

#### Run the tests

```bash
# Start minikube
minikube start

# Point your shell at minikube's Docker daemon so the Job can pull the image locally
# Bash / Git Bash:
eval $(minikube docker-env)

# PowerShell:
& minikube -p minikube docker-env --shell powershell | Invoke-Expression

docker build -t playwright-tests:latest .

# In playwright-job.yaml, change the image line to:
#   image: playwright-tests:latest
#   imagePullPolicy: Never

# Apply config and job (Secret already created above)
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/playwright-job.yaml

# Watch pod status live
kubectl get pods -w -l app=playwright-tests

# View test output from all pods at once
kubectl logs -l app=playwright-tests --prefix

# View events if a pod fails (OOMKilled = needs more memory, ImagePullBackOff = wrong image name)
kubectl describe pod <pod-name>

# Clean up after run
kubectl delete job playwright-test-run
```

#### Collecting reports from Kubernetes pods

Pods stay in `Completed` state after the Job finishes, giving you time to copy the blob reports out. Copy from each pod into one combined local folder, then merge:

```bash
mkdir blob-report-all
kubectl cp playwright-test-run-0:/app/blob-report/. ./blob-report-all
kubectl cp playwright-test-run-1:/app/blob-report/. ./blob-report-all
kubectl cp playwright-test-run-2:/app/blob-report/. ./blob-report-all

npx playwright merge-reports --reporter html ./blob-report-all
npx playwright show-report
```

> **Production note:** In a real cluster you would mount a shared PersistentVolumeClaim or upload blob reports to object storage (S3, GCS) so all pods write to one place automatically. The `kubectl cp` approach works well for learning and small teams.

#### Why `backoffLimit: 0`

The Job is set to `backoffLimit: 0`, meaning Kubernetes will not automatically retry a failed pod. This is intentional for tests:
- A test failure is a deliberate signal — retrying it automatically hides the problem
- Infrastructure failures (wrong image, out of memory) should be fixed and re-run manually, not silently retried
- To distinguish a test failure from an infrastructure failure: check `kubectl logs` for test output vs `kubectl describe pod` for events like `OOMKilled` or `ErrImagePull`

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

### Pipeline jobs

| Job | Trigger | What it does |
|---|---|---|
| `Shard 1/3`, `Shard 2/3`, `Shard 3/3` | push + PR | Runs tests on native Ubuntu runners using `npm ci` + `npx playwright install` |
| `Merge & Publish Report` | after all shards | Merges blob reports into one HTML artifact |
| `docker-publish` | push to main/master only (after tests pass) | Builds the Docker image and pushes it to GitHub Container Registry (GHCR) |

### Why the test jobs use native runners, not Docker

The test shards run directly on `ubuntu-latest` using `npm ci` and `npx playwright install` rather than pulling the Docker image. This is intentional:

- **Faster**: no image pull or container startup overhead per shard
- **Simpler**: GitHub already provides a clean Ubuntu environment with the right Node version
- **Cheaper**: native runners use less CI minutes than building + pulling a container for every shard

The Docker image is built and published separately by `docker-publish` after tests pass. Its purpose is to make the test environment available to **Kubernetes** — not to run tests inside CI. Both layers serve different audiences: GitHub Actions runs the tests quickly, Docker packages the environment for K8s deployment.

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

## Scaling to Large Test Suites

This project uses 3 shards × 2 workers = **6 parallel slots** — a small setup to learn the concepts. Here is how the same infrastructure scales to thousands of tests by changing two numbers.

### Time savings by configuration

Assuming an average test duration of 15 seconds:

| Test count | Single threaded | 3 shards × 2 workers | 10 shards × 4 workers | 20 shards × 4 workers |
|---|---|---|---|---|
| 100 tests | ~25 min | ~5 min | ~1 min | <1 min |
| 1000 tests | ~4 hrs | ~33 min | ~7 min | ~4 min |
| 5000 tests | ~20 hrs | ~2.5 hrs | ~31 min | ~16 min |
| 10000 tests | ~41 hrs | ~5 hrs | ~63 min | ~31 min |

> Times are estimates. Real results depend on test complexity, setup/teardown time, and available cluster resources.

### How to scale up

**Kubernetes** — change two numbers in `k8s/playwright-job.yaml`:
```yaml
spec:
  completions: 10    # was 3 — total number of pods to run
  parallelism: 10    # was 3 — how many run at the same time
```

**GitHub Actions** — extend the matrix and update the shard total:
```yaml
matrix:
  shard: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]   # was [1, 2, 3]

run: npx playwright test --shard=${{ matrix.shard }}/10   # update total
```

**Workers per shard** — increase `WORKERS` in the ConfigMap or CI env:
```yaml
data:
  WORKERS: "4"   # was 2
```

No changes to test code. The same tests automatically distribute across however many shards you define.

### GitHub Actions free tier limits

GitHub free accounts have limits on concurrent jobs (typically 20). For large suites on a free account keep shards at 3–5 and increase workers per shard (4–6) rather than adding many shards. A paid account or self-hosted runners removes this ceiling.

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

---

## Docker & Kubernetes — QA Interview Reference

### Docker

**Q: What is Docker and why is it useful for QA?**
Docker packages an application and all its dependencies (Node.js, browsers, OS libraries) into a container image. For QA it means every test run — on a developer laptop, in CI, or on a Kubernetes pod — uses exactly the same environment, eliminating "it passed on my machine" failures.

**Q: What is the difference between a Docker image and a container?**
An image is the blueprint — a read-only snapshot of the filesystem and configuration built from a Dockerfile. A container is a running instance of that image. You can run many containers from the same image simultaneously.

**Q: What is a Dockerfile?**
A text file with instructions that Docker follows to build an image, step by step — choosing a base image, copying files, installing dependencies, and defining the command that runs when the container starts.

**Q: What is `.dockerignore` and why does it matter for QA?**
It tells Docker which files to exclude when building the image, similar to `.gitignore`. For test projects you exclude `node_modules`, `.env`, and `test-results` to keep the image small and prevent local secrets from being baked into the image.

**Q: What is a volume mount and how would a QA engineer use it?**
A volume mount links a folder on the host machine to a folder inside the container. QA engineers use it to get test reports out of the container after tests finish — without a mount the report is generated inside the container and lost when it exits.
```bash
docker run -v "${PWD}/playwright-report:/app/playwright-report" playwright-tests
```

**Q: What is the difference between `CMD` and `ENTRYPOINT` in a Dockerfile?**
`ENTRYPOINT` sets the fixed command that always runs (e.g. `npx playwright test`). `CMD` provides default arguments that can be overridden. Using `ENTRYPOINT` for the test runner means you can still pass Playwright flags like `--project=api` or `--shard=1/3` when running the container.

**Q: How do you pass credentials to a Docker container without hardcoding them?**
Use `--env-file` to pass an `.env` file at runtime. The file stays on the host and is never baked into the image.
```bash
docker run --env-file .env playwright-tests
```

**Q: How do you check logs from a Docker container?**
```bash
docker logs <container-id>          # all logs
docker logs -f <container-id>       # follow live output
docker ps -a                        # list all containers including stopped ones
```

---

### Kubernetes

**Q: What is Kubernetes and why would a QA team use it?**
Kubernetes (K8s) is a system for managing containerised workloads across a cluster of machines. For QA it provides infrastructure to run test pods in parallel, control their resources, and clean them up automatically — without manually managing servers.

**Q: What is a Pod in Kubernetes?**
The smallest deployable unit in K8s. A Pod wraps one or more containers that share the same network and storage. In this project each Pod runs one Playwright shard.

**Q: What is the difference between a Deployment and a Job?**
A Deployment keeps containers running continuously (for web servers). A Job runs containers to completion and then stops — perfect for test execution where you want the pod to finish and exit, not restart.

**Q: What is an Indexed Job and how does it enable test sharding?**
An Indexed Job in K8s sets `completionMode: Indexed` and assigns each pod a unique index (`JOB_COMPLETION_INDEX`: 0, 1, 2...). Each pod uses its index to calculate its shard number, so 3 pods automatically run `--shard=1/3`, `--shard=2/3`, `--shard=3/3` without any manual coordination.

**Q: What is a ConfigMap and a Secret? Why are they separate?**
Both inject configuration into pods. ConfigMap is for non-sensitive values (like `WORKERS=2`, `CI=true`). Secret is for sensitive values (passwords, API keys) and is stored encrypted in the cluster. Keeping them separate follows the principle of least exposure.

**Q: What are resource requests and limits in a Kubernetes Pod?**
`requests` is the minimum CPU/memory the pod needs — K8s uses this to decide which node to place it on. `limits` is the maximum it can use — K8s kills the container if it exceeds this. For test pods this prevents one runaway test from consuming all cluster resources.

**Q: What does `restartPolicy: Never` mean in a test Job?**
If the container exits (pass or fail), K8s does not restart it. This is correct for tests — you want a clean result, not an infinite retry loop. Combined with `backoffLimit: 0` it means the Job stops immediately on failure so you can inspect the logs.

**Q: How does Playwright sharding work with Kubernetes?**
Playwright's `--shard=N/M` flag splits the test suite into M equal parts and runs only part N. In K8s, an Indexed Job with `completions: M` and `parallelism: M` starts M pods simultaneously. Each pod reads its `JOB_COMPLETION_INDEX`, adds 1, and passes that as N to Playwright. All pods run in parallel, each handling a different slice of the test suite.

**Q: What is `kubectl` and give some commands a QA engineer would use?**
`kubectl` is the command-line tool to interact with a Kubernetes cluster.
```bash
kubectl apply -f k8s/               # deploy all manifests
kubectl get pods -l app=playwright-tests    # list test pods
kubectl get pods -w                 # watch pod status live
kubectl logs <pod-name>             # view test output
kubectl logs -l app=playwright-tests --prefix   # logs from all pods at once
kubectl cp <pod>:/app/blob-report ./local-dir   # copy report out of a pod
kubectl delete job playwright-test-run          # clean up after a run
kubectl describe pod <pod-name>     # debug a failing pod
```

**Q: What is the difference between `parallelism` and `completions` in a Job?**
`completions` is the total number of pods that must finish successfully for the Job to be considered done. `parallelism` is how many can run at the same time. Setting both to the same number (e.g. 3) means all pods start simultaneously — which is what you want for test sharding.

**Q: How would you debug a Kubernetes pod that failed during a test run?**
```bash
kubectl get pods -l app=playwright-tests   # find the failed pod name
kubectl logs <pod-name>                    # check test output and errors
kubectl describe pod <pod-name>            # check events (OOMKilled = out of memory, ImagePullBackOff = wrong image name)
```
Common causes: wrong Docker image name, missing Secret values, or pod running out of memory (increase `limits.memory` in the Job manifest).
