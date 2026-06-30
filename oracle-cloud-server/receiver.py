import os
import json
from datetime import datetime
from flask import Flask, request, jsonify
from google.cloud import bigquery

app = Flask(__name__)

# Initialize BigQuery Client
# Ensure GOOGLE_APPLICATION_CREDENTIALS is set in the environment
bq_client = bigquery.Client()
DATASET_ID = f"{bq_client.project}.zepp_health_data"

@app.route('/health/metrics', methods=['POST'])
def receive_metrics():
    """Receives continuous metrics like Heart Rate, Steps, etc."""
    try:
        data = request.get_json()
        
        rows_to_insert = [{
            "timestamp": data.get("timestamp", datetime.utcnow().isoformat()),
            "metric_type": data.get("type"),
            "value": data.get("value")
        }]
        
        table_id = f"{DATASET_ID}.metrics_history"
        errors = bq_client.insert_rows_json(table_id, rows_to_insert)
        
        if errors:
            print(f"BQ Insert Errors: {errors}")
            return jsonify({"status": "error", "message": "Failed to write to BQ"}), 500
            
        return jsonify({"status": "success"}), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/health/sleep', methods=['POST'])
def receive_sleep():
    """Receives sleep summaries and scores"""
    try:
        data = request.get_json()
        
        rows_to_insert = [{
            "date": data.get("date"),
            "start_time": data.get("start_time"),
            "end_time": data.get("end_time"),
            "total_sleep_mins": data.get("total_time"),
            "deep_sleep_mins": data.get("deep_time"),
            "sleep_score": data.get("score"),
            "stages_json": json.dumps(data.get("stages", []))
        }]
        
        table_id = f"{DATASET_ID}.sleep_history"
        errors = bq_client.insert_rows_json(table_id, rows_to_insert)
        
        if errors:
            return jsonify({"status": "error", "message": "Failed to write to BQ"}), 500
            
        return jsonify({"status": "success"}), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/health/pai', methods=['POST'])
def receive_pai():
    """Receives PAI scores"""
    try:
        data = request.get_json()
        rows_to_insert = [{
            "date": datetime.utcnow().strftime('%Y-%m-%d'),
            "total_pai": data.get("total_pai"),
            "daily_pai": data.get("daily_pai")
        }]
        table_id = f"{DATASET_ID}.pai_history"
        errors = bq_client.insert_rows_json(table_id, rows_to_insert)
        if errors:
             return jsonify({"status": "error", "message": "Failed to write to BQ"}), 500
             
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "online", "message": "Zepp Oracle Receiver is running"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=4080)
