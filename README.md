# Zepp OS Health Data Extractor

This project provides end-to-end data pipelines for extracting continuous health data (PAI, Sleep Scores, Steps, and Heart Rate) from Zepp OS smartwatches and streaming it into Google BigQuery for visualization.

Because Zepp Health has multiple generations of smartwatches with vastly different capabilities, this project is split into two distinct pipelines:

## 🔀 Two distinct Pipelines

### Pipeline A: Legacy Devices (e.g., Amazfit GTR 2)
Legacy devices run on a proprietary RTOS and **do not support** Zepp OS Mini-Programs. They cannot push data directly to a server.
*   **How it works:** A Python background daemon (`oracle-server-sync/`) runs on an Oracle Cloud VM. It securely authenticates with the Zepp Cloud APIs, pulls your continuous sync data (PAI and `band_data`), and streams it to BigQuery.
*   **Key Features:**
    *   **Rate-Limit Evasion:** Uses a pre-extracted token cache (`.zepp_token_cache.json`) to bypass the login endpoint and avoid HTTP 429 rate limits.
    *   **CI/CD Production Deployment:** Automated via GitHub Actions. Pushing to `main` instantly lints, rebuilds, and restarts the Docker container on the Oracle VM via SSH.
    *   **100% Secure:** Zepp passwords and SSH keys are stored in GCP Secret Manager and GitHub Secrets. Zero passwords are in the codebase.
*   **Documentation:** See [oracle-server-sync/README.md](oracle-server-sync/README.md) for full setup and CI/CD deployment instructions.

### Pipeline B: Modern Devices (e.g., Amazfit GTR 4, GTS 4)
Modern devices natively support Zepp OS 3.0 JavaScript Mini-Programs and background HTTP `fetch` requests via a Side Service.
*   **How it works:** The smartwatch app (`zepp-mini-program/`) extracts data via the `@zos/sensor` APIs and uses a Bluetooth-bridged smartphone Side Service to push the data in real-time to our Oracle Cloud server.
*   **Key Features:**
    *   **Real-time Push:** Data is sent the moment it is generated, avoiding cloud polling delays.
    *   **Oracle Flask Receiver:** A highly concurrent Python Flask webhook listens on port `4080` to catch the payloads and insert them into BigQuery.
*   **Documentation:** See `zepp-mini-program/` for Zepp OS 3.0 build instructions and simulator deployment.

---

## 🏗️ General Architecture (Pipeline B - Webhook)

1. **Zepp OS Mini Program (Smartwatch App)**: Extracts data via `@zos/sensor` APIs.
2. **Oracle Cloud "Always Listening" Server:** An Oracle Cloud Always Free VM running a Python Flask application on port `4080`.
3. **Google Cloud BigQuery:** The Python server uses a Google Service Account to securely stream the formatted data into BigQuery.
4. **Grafana Cloud:** Connects directly to BigQuery for visualization.

For detailed architecture diagrams of the webhook push system, see [architecture.md](architecture.md).

## 🛠️ Complete Toolchain Configured
During the development of this project, we successfully engineered the following:
1. **GitHub Actions CI/CD:** Fully automated Docker deployments to Oracle Cloud VMs via SSH.
2. **Google Cloud Secret Manager & BigQuery:** Secured integration via Service Account JSON keys.
3. **Zepp OS Zeus CLI (`@zeppos/zeus-cli`):** The official compiler for Zepp OS 3.0, installed globally to bypass WSL file-locking bugs.
4. **Python Data Extraction:** Advanced base64 decoding of undocumented Zepp `band_data` blobs to retrieve minute-by-minute sleep and step metrics.

## 🛡️ Security & Best Practices
*   **No Hardcoded Secrets:** The `.gitignore` strictly prevents Google Cloud JSON keys, `.env` files, or token caches from being committed.
*   **Secure Deployment:** CI/CD uses GitHub Secrets to inject production keys directly into the Oracle VM without human intervention.
*   **Least Privilege:** The Google Service Account is strictly limited to the `BigQuery Data Editor` and `Secret Manager Secret Accessor` roles.
