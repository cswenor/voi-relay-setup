

# Setup Voi Ballast Node(Docker)

### Secure your server
 Follow [this guide](https://help.ovhcloud.com/csm/en-gb-dedicated-servers-securing-server?id=kb_article_view&sysparm_article=KB0043969).

Remember to open up the port you change ssh service to via:
`sudo ufw allow PORTNUMBER/tcp`

### Add Docker's official GPG key:
```
sudo apt-get update
sudo apt-get install ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```
### Add the repository to Apt sources:
```
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
```
### Install Docker
```
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```
### Install Docker Compose
```
sudo apt-get update
sudo apt-get install docker-compose-plugin
```
### Install jq
```
Install jq
sudo apt install jq
```
### Setup permissions
```
sudo usermod -aG docker ${USER}
newgrp docker
```
### Create Node Folder
```
mkdir ~/node
```
### Create Node Files
Enter your newly created `node` folder.
```
cd node
```
#### Participation Node Config Files
Create the following 3 files:

```
sudo touch config.json
```
User nano to edit these files:
```
sudo nano FILENAME
```

##### config.json content

```
{
	"DNSBootstrapID": "<network>.voi.network",
	"EnableCatchupFromArchiveServers": true
}
```

#### Server Files
Go back to your home directory
```
cd
```
Create the following 3 files:
```
sudo touch catchup.sh
sudo touch goal.sh
sudo touch docker-compose.yaml
```
User nano to edit these files:
```
sudo nano FILENAME
```
##### catchup.sh content
```
#!/bin/bash
CP=$(curl -s https://testnet-api.voi.nodly.io/v2/status|jq -r '.["last-catchpoint"]')
./goal.sh node catchup $CP
```
##### goal.sh content
```
#!/bin/bash
docker exec -t node-voitnet-catchup /node/goal -d /node/data $@
```
##### docker-compose.yaml content

If you are setting up a node to run the ballast bot you need the first .yaml file, otherwise the second.

###### Ballast Node + Ballast Bot
```
version: "3.4"
services:
  voibot:
    container_name: voibota
    image: urtho/voibot:latest
    restart: always
    volumes:
      - type: bind
        source: ./config.jsonc
        target: /config.jsonc
  nodevoit:
    container_name: node-voitnet-catchup
    image: urtho/algod-voitest-rly:latest
    volumes:
      - type: bind
        source: /mnt/voitest-v1
        target: /node/data/voitest-v1
      - type: bind
        source: ./node/config.json
        target: /node/data/config.json
      - type: bind
        source: ./partkey
        target: /partkey
    restart: always
    entrypoint:
      - "/node/algod"
      - "-d"
      - "/node/data"
    network_mode: host
```

###### Ballast Node Only
```
version: "3.4"
services:
  nodevoit:
    container_name: node-voitnet-catchup
    image: urtho/algod-voitest-rly:latest
    volumes:
      - type: bind
        source: /mnt/voitest-v1
        target: /node/data/voitest-v1
      - type: bind
        source: ./node/config.json
        target: /node/data/config.json
    restart: always
    entrypoint:
      - "/node/algod"
      - "-d"
      - "/node/data"
    network_mode: host
```

### Make Bash files Executable
```
chmod +x ~/catchup.sh
chmod +x ~/goal.sh
```
### Mount Node data folder
```
sudo mkdir /mnt/voitest-v1
```
### Pull Docker Image
You only need to run the first command if you are configuring just the ballast node and not the bot too.
```
docker pull urtho/algod-voitest-rly
docker pull urtho/voibot
```
### Account Setup
#### Create Ballast Accounts
Create 3 ballast accounts each with a public address ending in "2VOI".
#### Create Master Account
Create an account to manage the ballast accounts. 
#### Rekey  Ballast accounts to Master Account
Rekey the 3 ballast accounts to the manager account. This can be done with A-Wallet.
#### Send Urtho Information
Send the public addresses to Urtho (urtho@algonode.io)

### Configure Ballast Bot
In your home directory (same as yaml file) create the following file and paste the content:

`sudo nano config.jsonc`

```
{
  "algod-api": {
    "address": "https://testnet-api.voi.nodly.io",
    "token": ""
  },
  "av-api": {
    "address": "https://analytics.testnet.voi.nodly.io",
    "token": ""
  },
  "pkeys": {
    "EQBOT": "Mnemonic of the Master Account"
  }
  "equalizer": {
    "interval": 10,
    "target": 60,
    "upfactor": 1.0,
    "downfactor": 0.2,
  },
  "singletons": {
    "equalizer": true,
  }
}
```
### Create Part Keys

#### Install software locally

Install in home directory
https://developer.algorand.org/docs/run-a-node/setup/install/#installation-with-the-updater-script

#### Generate Part Key

`./algokey part generate --first FIRSTROUND --last LASTROUND --parent PUBLICADDRESS --keyfile KEYFILENAME`

#### Copy Part Key To Remote Server

`sudo scp -P REMOTEPORTNUMBER KEYFILENAME REMOTEUSERNAME@REMOTEIPADDRESS:/home/REMOTEUSERNAME`

### Standup Server
```
docker compose up -d
```
### Catchup Server
```
~/catchup.sh
```
### Check to see if you are synced
```
~/goal.sh node status
```
