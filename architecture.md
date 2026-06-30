# Architecture Documentation

This document explains the hybrid architecture combining Zepp OS, Oracle Cloud, and Google Cloud BigQuery.

## 1. Data Flow

1.  **Smartwatch (Device App):** The Zepp OS Mini Program runs continuously in the background (using App Service) and collects health data via Sensor APIs (`Pai`, `Sleep`, `Workout`, `HeartRate`).
2.  **Smartphone (Side Service):** The Device App uses the Messaging API to send this data to the Zepp App on the connected smartphone.
3.  **Oracle Cloud (Receiver):** The Side Service uses the Fetch API (`HTTP POST`) to send the data to an Oracle Cloud VM (`Influxdb-For-ZeppApplication`).
4.  **Google Cloud (Storage):** The Python Flask app on the Oracle VM authenticates with Google Cloud using a Service Account Key and streams the JSON data into BigQuery tables.
5.  **Visualization:** Grafana Cloud connects to BigQuery to visualize the metrics.

## 2. Component breakdown

### Oracle Cloud VM (Always Free)
*   **Role:** Acts as the always-listening web server to receive HTTP POST requests from the phone.
*   **Why Oracle?** Unbeatable free outbound bandwidth (10TB/month) and excellent compute resources compared to other free tiers. Located in Hyderabad for minimal latency to the user's phone.

### Google BigQuery
*   **Role:** Long-term data warehouse for all health metrics.
*   **Why BigQuery?** Excellent for time-series analytics, pairs perfectly with Grafana, and offers 10GB of free storage and 1TB of free querying per month.

### Security
*   **Network:** The Oracle VM uses UFW to restrict incoming traffic except for the required port `4080`.
*   **Authentication:** The Python server uses a restricted Google Service Account JSON key that only has permission to insert data into BigQuery (`BigQuery Data Editor`).
