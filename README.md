# Pre-production Analyzer

This project provides a CLI tool and a pipeline for pre-production screenplay analysis, with support for Arabic/RTL languages.

## Getting Started

To set up the project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/sinsweatpants/advance-analayze.git
    cd advance-analayze
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Build the project:**
    ```bash
    pnpm run build
    ```

## Running the CLI Tool

The `analyze-script` CLI tool can be run directly from the command line after installation.

### Example Usage:

To run the pipeline on a sample text file and generate various reports:

```bash
analyze-script -i data/input/sample.txt --export-json --export-html --export-pdf --export-csv
```

### CLI Options:

*   `-i, --input <path>`: Path to the input script file (e.g., `.fdx`, `.txt`). (Required)
*   `--export-json`: Export detailed pipeline outputs as JSON.
*   `--export-html`: Export a simple HTML report with charts.
*   `--export-pdf`: Export the final report as a PDF (currently a placeholder HTML).
*   `--export-csv`: Export the final report as a CSV.

## End-to-End Testing

To run the end-to-end tests, which execute the CLI on a sample file and generate reports:

```bash
pnpm run e2e
```

This will generate `pipeline-report.json`, `pipeline-report.html`, `pipeline-report.pdf` (as HTML placeholder), and `pipeline-report.csv` in the `data/artifacts/` directory.

### Report Outputs:

*   **JSON Report (`pipeline-report.json`):** Contains a detailed breakdown of outputs from all stages of the analysis pipeline (ingestion, segmentation, feature extraction, sentiment analysis, topic modeling, and fusion).
*   **HTML Report (`pipeline-report.html`):** Provides a user-friendly summary table and a sentiment analysis chart generated using Vega-Lite.
*   **PDF Report (`pipeline-report.pdf`):** A placeholder HTML file for future PDF generation.
*   **CSV Report (`pipeline-report.csv`):** A tabular representation of key metrics from the fused data.

## Docker Usage

You can build and run the analyzer within a Docker container for a consistent environment.

1.  **Build the Docker image:**
    ```bash
    docker build -t analyzer .
    ```

2.  **Run the Docker container:**
    To run the CLI inside the container, you need to mount your input data and output artifacts directories.
    ```bash
    docker run -v $(pwd)/data/input:/app/data/input -v $(pwd)/data/artifacts:/app/data/artifacts analyzer analyze-script -i data/input/sample.txt --export-json --export-html
    ```
    *(Note: Adjust the input file path and export options as needed.)*

## Environment Configuration

*   `.env`: Used for local development.
*   `.env.production`: Used for production deployments. This file should contain your production `DATABASE_URL`.

    ```
    # Example .env.production
    DATABASE_URL="postgresql://user:password@host:port/database"
    ```

## CI/CD Integration (GitHub Actions)

To integrate the Docker build and E2E tests into your GitHub Actions workflow, add the following steps to your workflow file (e.g., `.github/workflows/main.yml`):

```yaml
name: CI/CD Pipeline

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build project
        run: pnpm run build

      - name: Run E2E Tests
        run: pnpm run e2e

      - name: Build and Run Docker Image
        run: |
          docker build -t analyzer .
          # Create dummy input/output directories for Docker test
          mkdir -p data/input data/artifacts
          echo "Sample text for Docker test." > data/input/docker_sample.txt
          docker run -v $(pwd)/data/input:/app/data/input -v $(pwd)/data/artifacts:/app/data/artifacts analyzer analyze-script -i data/input/docker_sample.txt --export-json
          ls data/artifacts/ # Verify artifacts are generated
