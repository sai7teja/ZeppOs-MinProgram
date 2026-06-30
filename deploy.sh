#!/bin/bash
# Master Deployment Script for Zepp Health Extractor
# This script configures Google Cloud and deploys the receiver securely to an Oracle VM.
# It also ensures Oracle VCN Security Lists are updated for inbound traffic.

# Configuration Variables
PROJECT_ID="your-gcp-project-id"
SA_NAME="zepp-bq-writer"
DATASET_NAME="zepp_health_data"
ORACLE_IP="your-oracle-vm-ip"
ORACLE_USER="ubuntu"
SSH_KEY_PATH="~/.ssh/your_oracle_key.key"
# OCI CLI variables (Fill these if you want the script to automate VCN updates)
OCI_SECURITY_LIST_OCID="your-security-list-ocid"

echo "=== 1. Google Cloud BigQuery & IAM Setup ==="
# Create BigQuery Dataset
bq mk --location=US -d ${PROJECT_ID}:${DATASET_NAME} || true

# Create Service Account
gcloud iam service-accounts create ${SA_NAME} \
    --display-name="Zepp OS BigQuery Writer" \
    --project=${PROJECT_ID} || true

# Grant BigQuery Editor Role
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/bigquery.dataEditor"

# Download JSON Key
gcloud iam service-accounts keys create ./secrets-key.json \
    --iam-account=${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com \
    --project=${PROJECT_ID}

echo "=== 2. Oracle Cloud VCN Firewall Setup ==="
# Automatically inject Port 4080 into the Oracle VCN Security List using OCI CLI
if [ -n "$OCI_SECURITY_LIST_OCID" ] && [ "$OCI_SECURITY_LIST_OCID" != "your-security-list-ocid" ]; then
    echo "Updating Oracle VCN Security List to allow port 4080..."
    # Fetch current rules, append port 4080, and push back
    oci network security-list get --security-list-id ${OCI_SECURITY_LIST_OCID} > /tmp/seclist.json
    jq '.data."ingress-security-rules" += [{"description": "Zepp Receiver", "icmp-options": null, "is-stateless": false, "protocol": "6", "source": "0.0.0.0/0", "source-type": "CIDR_BLOCK", "tcp-options": {"destination-port-range": {"max": 4080, "min": 4080}, "source-port-range": null}, "udp-options": null}] | .data."ingress-security-rules"' /tmp/seclist.json > /tmp/new_ingress.json
    oci network security-list update --security-list-id ${OCI_SECURITY_LIST_OCID} --ingress-security-rules file:///tmp/new_ingress.json --force
    rm /tmp/seclist.json /tmp/new_ingress.json
else
    echo "OCI_SECURITY_LIST_OCID not set. Please manually open port 4080 in the Oracle Cloud Console."
fi

echo "=== 3. Deploying to Oracle Cloud VM ==="
# Securely transfer key and code to Oracle VM
scp -i ${SSH_KEY_PATH} -o StrictHostKeyChecking=no ./secrets-key.json ${ORACLE_USER}@${ORACLE_IP}:~/secrets-key.json
scp -i ${SSH_KEY_PATH} -o StrictHostKeyChecking=no -r ./oracle-cloud-server ${ORACLE_USER}@${ORACLE_IP}:~/oracle-cloud-server

# Run remote setup on Oracle VM
ssh -i ${SSH_KEY_PATH} -o StrictHostKeyChecking=no ${ORACLE_USER}@${ORACLE_IP} << EOF
    # Secure the Google JSON key
    mkdir -p ~/.secrets
    mv ~/secrets-key.json ~/.secrets/zepp-bq-writer-key.json
    chmod 600 ~/.secrets/zepp-bq-writer-key.json

    # Install Python Dependencies
    cd ~/oracle-cloud-server
    sudo apt update
    sudo apt install -y python3-pip python3-venv jq
    python3 -m venv venv
    ./venv/bin/pip install -r requirements.txt

    # Open Linux Firewall (iptables) for Port 4080
    sudo iptables -I INPUT -m state --state NEW -p tcp --dport 4080 -j ACCEPT
    sudo netfilter-persistent save || true

    # Start the daemon
    export GOOGLE_APPLICATION_CREDENTIALS=/home/${ORACLE_USER}/.secrets/zepp-bq-writer-key.json
    ./venv/bin/gunicorn -b 0.0.0.0:4080 receiver:app --daemon
EOF

# Clean up local key to prevent leaks
rm -f ./secrets-key.json

echo "=== Deployment Complete ==="
echo "Your Oracle receiver is running on http://${ORACLE_IP}:4080"
