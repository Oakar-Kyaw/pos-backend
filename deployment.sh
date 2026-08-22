#!/bin/bash
set -e

echo "git pull"

export INFISICAL_TOKEN="$(infisical login --method=universal-auth --client-id="31106e2c-18af-4d94-90f5-75c8be060b4a" --client-secret="1a29ee5b4e77e188cc2e03e2e9a1af378fb96dee48f8a19520d73f261852d1cb" --silent --plain)"

infisical export --projectId="a0c8d416-3131-429d-bb55-6c29340b190d" --env="prod" > /home/ubuntu/pos-backend/.env

echo "end of file"

#!/bin/bash
set -e

# Non-interactive Mode သတ်မှတ်ခြင်း
export DEBIAN_FRONTEND=noninteractive

echo "Updating system..."
apt update -y

echo "Installing prerequisites..."
apt install -y ca-certificates curl git nodejs npm

# Install Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

apt update -y
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker

# Install Global Packages
npm install -g @infisical/cli pm2

# Setup Application
TARGET_DIR="/home/ubuntu/test-backend"

if [ ! -d "$TARGET_DIR" ]; then
  git clone https://github.com/Oakar-Kyaw/test-backend.git "$TARGET_DIR"
fi

cd "$TARGET_DIR"

# Install Project Dependencies
npm install

# Infisical Token Generation & Env Export
INFISICAL_TOKEN=$(infisical login --method=universal-auth --client-id="31106e2c-18af-4d94-90f5-75c8be060b4a" --client-secret="1a29ee5b4e77e188cc2e03e2e9a1af378fb96dee48f8a19520d73f261852d1cb" --silent --plain)

INFISICAL_TOKEN="$INFISICAL_TOKEN" infisical export --projectId="a0c8d416-3131-429d-bb55-6c29340b190d" --env="prod" > .env

# Change Ownership to ubuntu user
chown -R ubuntu:ubuntu "$TARGET_DIR"

# Start App with PM2
pm2 start server.js --name "backend-api"
pm2 save

echo "End successfully 💃🏿"