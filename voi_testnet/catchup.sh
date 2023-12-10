#!/bin/bash
CP=$(curl -s https://testnet-api.voi.nodly.io/v2/status|jq -r '.["last-catchpoint"]')
./goal.sh node catchup $CP