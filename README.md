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

### Hardware Requirements & Compatibility
* **Supported Devices:** This mini-program relies on the Zepp OS `@zos/sensor` API and Side Service `fetch` capabilities. It requires a device running natively on **Zepp OS 2.0 or 3.0** (e.g., Amazfit GTR 4, GTS 4, Balance, Cheetah, Active).
* **Unsupported Devices:** Legacy devices like the **Amazfit GTR 2** run proprietary Amazfit OS environments. While they have a legacy "Mini Program" menu, they do not support JavaScript Side Services or background HTTP requests, making them physically incompatible with this architecture.

### How to Test (Without Physical Hardware)
If you do not have a compatible Zepp OS 3.0 smartwatch, the project is pre-configured for the **Amazfit GTR 4** and can be tested using the official Simulator:
```bash
cd zepp-mini-program
zeus bridge
```
*This command connects to the Zepp OS Online Simulator, allowing you to emulate heart rate/sleep data on a virtual watch face and securely transmit it to the Oracle Cloud webhook.*
2. **Oracle Cloud "Always Listening" Server:** An Oracle Cloud Always Free VM running a Python Flask application. It acts as a webhook receiver to catch data from the phone's Side Service.
3. **Google Cloud BigQuery:** The Python server uses a Google Service Account to securely stream the formatted data into BigQuery.
4. **Grafana Cloud:** Connects directly to BigQuery for visualization.

For detailed architecture diagrams and design choices, see [architecture.md](architecture.md).

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
