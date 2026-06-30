# Zepp OS Health Data Extractor

This project extracts continuous health data (PAI, Sleep Scores, Workout History, and basic metrics) from a Zepp OS smartwatch and streams it into Google BigQuery for visualization in Grafana.

## Architecture

This project utilizes a 100% Free Tier hybrid architecture:
1. **Zepp OS Mini Program (Device App & Side Service):** Runs on the smartwatch to collect sensor data and the companion phone app to send it externally.
2. **Oracle Cloud "Always Listening" Server:** An Oracle Cloud Always Free VM running a Python Flask application. It acts as a webhook receiver to catch data from the phone's Side Service.
3. **Google Cloud BigQuery:** The Python server uses a Google Service Account to securely stream the formatted data into BigQuery.
4. **Grafana Cloud:** Connects directly to BigQuery for visualization.

For detailed architecture diagrams and design choices, see [architecture.md](architecture.md).

## Project Structure

*   `deploy.sh`: The master deployment script. Automates GCP setup and Oracle VM deployment.
*   `/oracle-cloud-server`: Contains the Python Flask application and dependencies for the Oracle VM.
*   `/zepp-mini-program`: Contains the JavaScript code for the Zepp OS smartwatch app.

## Security & Best Practices

*   **No Hardcoded Secrets:** The `.gitignore` prevents Google Cloud JSON keys from being committed.
*   **Secure Deployment:** The `deploy.sh` script automatically places the Google JSON key into a hidden, permission-locked folder (`~/.secrets/`) on the production VM.
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

The script will automatically create your BigQuery datasets, generate a secure service account, transfer the code to your Oracle VM, configure the Ubuntu firewall, and launch the Python daemon.

To build and run the Zepp OS app, see the instructions inside the `zepp-mini-program/README.md`.
