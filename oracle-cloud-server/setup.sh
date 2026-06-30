#!/bin/bash
# Oracle Cloud Ubuntu VM Setup Script for Zepp Receiver

echo "Updating system and installing dependencies..."
sudo apt-update
sudo apt install -y python3-pip python3-venv

echo "Creating virtual environment..."
python3 -m venv venv
source venv/bin/activate

echo "Installing Python packages..."
pip install -r requirements.txt

echo "Opening port 4080 in Oracle UFW firewall (if applicable)..."
sudo ufw allow 4080/tcp
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 4080 -j ACCEPT
sudo netfilter-persistent save

echo "Setup complete. You can run the server manually for testing using:"
echo "source venv/bin/activate"
echo "python receiver.py"

echo "To run continuously, you can use gunicorn:"
echo "gunicorn -b 0.0.0.0:4080 receiver:app --daemon"
