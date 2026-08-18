#!/bin/bash
set -e

echo "git pull"

export INFISICAL_TOKEN="$(infisical login --method=universal-auth --client-id="31106e2c-18af-4d94-90f5-75c8be060b4a" --client-secret="1a29ee5b4e77e188cc2e03e2e9a1af378fb96dee48f8a19520d73f261852d1cb" --silent --plain)"

infisical export --projectId="a0c8d416-3131-429d-bb55-6c29340b190d" --env="prod" > /home/ubuntu/pos-backend/.env

echo "end of file"
