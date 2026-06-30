# Zepp OS Health Data Extractor

This project extracts continuous health data (PAI, Sleep Scores, Workout History, and basic metrics) from a Zepp OS smartwatch and streams it into Google BigQuery for visualization in Grafana.

## Architecture

This project utilizes a 100% Free Tier hybrid architecture:
1. **Zepp OS Mini Program (Device App & Side Service):** Runs on the smartwatch to collect sensor data and the companion phone app to send it externally.
2. **Oracle Cloud "Always Listening" Server:** An Oracle Cloud Always Free VM (Hyderabad region for low latency) running a Python Flask application. It acts as a webhook receiver to catch data from the phone's Side Service.
3. **Google Cloud BigQuery:** The Python server uses a Google Service Account to securely stream the formatted data into BigQuery.
4. **Grafana Cloud:** Connects directly to BigQuery for visualization.

For detailed architecture diagrams and design choices, see [architecture.md](architecture.md).

## Project Structure

*   `/oracle-cloud-server`: Contains the Python Flask application, dependencies, and deployment scripts for the Oracle VM.
*   `/zepp-mini-program`: (Coming Soon) Contains the JavaScript code for the Zepp OS Mini Program and the Side Service.

## Prerequisites

1.  **Google Cloud Project:** With BigQuery enabled.
2.  **Google Service Account Key:** With `BigQuery Data Editor` role, saved as a JSON file.
3.  **Oracle Cloud Always Free VM:** Running Ubuntu/Oracle Linux with port `4080` open.
4.  **Zepp OS Developer Mode:** Enabled in the Zepp App on your smartphone.

## Quick Start (Server)

Navigate to the `oracle-cloud-server` directory and follow the instructions in the setup script to deploy the receiver to your Oracle VM.
