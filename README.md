# Zepp OS Health Data Extractor

This project extracts continuous health data (PAI, Sleep Scores, Workout History, and basic metrics) from a Zepp OS smartwatch and streams it into Google BigQuery for visualization in Grafana.

## Architecture

This project utilizes a 100% Free Tier hybrid architecture:
1. **Zepp OS Mini Program (Smartwatch App)**

The smartwatch app is located in `zepp-mini-program/`. It extracts data via the `@zos/sensor` APIs and uses a Side Service to `fetch` the data to our Oracle Cloud server.

### Important Build Instructions for Windows/WSL Users:
Because of known NTFS file-extraction bugs in Node 22 and WSL, do **not** install the `@zeppos/zeus-cli` locally or use `npx`. 
Instead, install the CLI globally:
```bash
npm install -g @zeppos/zeus-cli
```

### Zepp OS 3.0 Compliance
The `app.json` configuration file has been fully upgraded to comply with the Zepp OS 3.0 schema:
* `configVersion: "v3"`
* `runtime` API version targeting `3.0`
* Explicit `platforms` definitions mapped inside the `targets` block.

### ⌚ Hardware Compatibility & Build Guide
Because Zepp Health has multiple generations of smartwatches, you must follow the instructions that match your physical hardware.

#### Category A: Modern Devices (Zepp OS 2.0 & 3.0)
*(e.g., Amazfit GTR 4, GTS 4, Balance, Cheetah, Active, T-Rex Ultra)*
* **Status:** Fully Supported. These devices natively support JavaScript Side Services and background `fetch` HTTP requests.
* **Build Instructions:** The `app.json` file in this repository is pre-configured for Zepp OS 3.0 (targeting `gtr4`). You can build and install directly:
  ```bash
  cd zepp-mini-program
  zeus preview
  ```

#### Category B: First-Gen Zepp OS Devices (Zepp OS 1.0)
*(e.g., Amazfit GTR 3, GTS 3, T-Rex 2, Amazfit Band 7)*
* **Status:** Supported, but requires downgrade. Zepp OS 1.0 supports basic Side Services but uses an older `app.json` schema. 
* **Build Instructions:** Before building, you **must** modify `zepp-mini-program/app.json`:
  1. Remove `"configVersion": "v3"`.
  2. Change the `runtime` API version from `"3.0"` to `"1.0"`.
  3. Change the target from `"gtr4"` to your device (e.g., `"band7"`).
  4. Edit `package.json` to downgrade the types: `"@zeppos/device-types": "^2.0.0"`.

#### Category C: Legacy Devices (Non-Zepp OS)
*(e.g., Amazfit GTR 2, GTS 2, T-Rex Pro, Band 6)*
* **Status:** **Not Supported.** These devices run an older, proprietary RTOS (Amazfit OS). They do not support the modern Zepp OS API, JavaScript Side Services, or background HTTP bridging.
* **How to Test Anyway (Simulator):** You cannot run this project on a physical GTR 2. Instead, test the full pipeline using the official Zepp OS Simulator on your computer. 
  1. Download the [Zepp OS Simulator](https://docs.zepp.com/docs/guides/tools/simulator/download/).
  2. Run the interactive bridge:
  ```bash
  cd zepp-mini-program
  zeus bridge
  # Inside the prompt, type:
  # bridge$ connect
  # bridge$ install
  ```
*This command connects to the Zepp OS Online Simulator, allowing you to emulate heart rate/sleep data on a virtual watch face and securely transmit it to the Oracle Cloud webhook.*
2. **Oracle Cloud "Always Listening" Server:** An Oracle Cloud Always Free VM running a Python Flask application. It acts as a webhook receiver to catch data from the phone's Side Service.
3. **Google Cloud BigQuery:** The Python server uses a Google Service Account to securely stream the formatted data into BigQuery.
4. **Grafana Cloud:** Connects directly to BigQuery for visualization.

For detailed architecture diagrams and design choices, see [architecture.md](architecture.md).

## Current State of the Project
As of right now, the infrastructure pipeline is **100% complete and deployed**:
1. **The Backend:** A Python Flask server is actively running on the Oracle Cloud Virtual Machine (`68.233.103.229:4080`) listening for HTTP POST requests. It successfully connects to Google BigQuery using a secure Service Account Key hidden in `~/.secrets`.
2. **The Front End:** The Zepp OS Mini Program (Watch UI + Smartphone Side Service) has been completely coded, configured for modern Zepp OS 3.0 standards, and is ready for execution.
3. **The Simulator:** Because legacy hardware like the Amazfit GTR 2 does not support modern Zepp OS Mini Programs, the project is configured to run on the **Zepp OS Simulator** to emulate a GTR 4 and send real data payloads through the pipeline.

## Complete Toolchain Installed
During the development of this project, we successfully installed and configured the following toolchain on your local machine and remote servers:
1. **Google Cloud SDK (`gcloud`):** Used to authenticate and programmatically create BigQuery datasets and Service Accounts from your local terminal.
2. **Oracle Cloud Infrastructure CLI (`oci-cli`):** Installed via Python `pip`. We used this to automatically manipulate the Oracle Cloud VCN Security Lists to open port 4080 via script.
3. **Node.js & NPM:** The core JavaScript runtime used to download dependencies and build the Zepp OS watch app.
4. **Zepp OS Zeus CLI (`@zeppos/zeus-cli`):** The official compiler for Zepp OS 3.0. Installed globally on your machine to bypass WSL NTFS file-locking bugs.
5. **Python 3, Flask, & Gunicorn:** Installed on the remote Oracle VM to serve as the highly concurrent production web server receiving the webhook data.
6. **Iptables:** Configured on the Oracle Linux server to correctly expose port 4080 by inserting rules at the absolute top of the firewall chain.
7. **Git (Personal Access Token):** Configured local Git to securely push changes using a GitHub PAT instead of a deprecated account password.

## Project Structure

*   `deploy.sh`: The master deployment script. Automates GCP setup, Oracle VCN Security List updates, and Oracle VM deployment.
*   `/oracle-cloud-server`: Contains the Python Flask application and dependencies for the Oracle VM.
*   `/zepp-mini-program`: Contains the JavaScript code for the Zepp OS smartwatch app.
*   `.gitignore`: Prevents sensitive files (`.json`, `.key`, `.env`) from being uploaded to GitHub.

## Security & Best Practices

*   **No Hardcoded Secrets:** The `.gitignore` strictly prevents Google Cloud JSON keys or Oracle `.pem` keys from being committed.
*   **Secure Deployment:** The `deploy.sh` script automatically places the Google JSON key into a hidden, permission-locked folder (`~/.secrets/`) on the production VM and cleans up the local copy after transfer.
*   **Least Privilege:** The created Google Service Account is strictly limited to the `BigQuery Data Editor` role.

## Quick Start (For Future Users)

If you are cloning this repository to build your own infrastructure, run the master deployment script:

```bash
# 1. Edit the configuration variables at the top of deploy.sh
nano deploy.sh

# 2. Make it executable
chmod +x deploy.sh

# 3. Run the deployment
./deploy.sh
```

The script will automatically:
1. Create your BigQuery datasets on GCP.
2. Generate a secure service account JSON key.
3. (Optional) Use the `oci-cli` to securely update your Oracle VCN Security List to allow inbound traffic on port 4080.
4. Transfer the code to your Oracle VM.
5. Configure the Ubuntu firewall (`iptables`).
6. Launch the Python daemon securely utilizing the hidden service account key.

To build and run the Zepp OS app, see the instructions inside the `zepp-mini-program/README.md`.
