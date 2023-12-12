

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
### Create, Install Part Keys & Register Online

#### Install software locally

Install in home directory
https://developer.algorand.org/docs/run-a-node/setup/install/#installation-with-the-updater-script

#### Configure your node for Voi

Go into your new node folder in your home directory and create a `data` directory if it doesn't exist already. 

`cd ~/node/data`

Create a config.json file with the following:

```
{
	"DNSBootstrapID": "<network>.voi.network",
	"EnableCatchupFromArchiveServers": true
}
```

Overwrite genesis file in this same data directory:

`sudo curl -s -o genesis.json https://testnet-api.voi.nodly.io/genesis `

Create logging files in same data directory

```
touch algod-err.log
touch algod-out.log
```

Go to the 'node' directory

`cd ~/node`

Start your node 

`./goal node start`

Check it's connected to Voi

`./goal node status`

You should see the following:

```
Genesis ID: voitest-v1
Genesis hash: IXnoWtviVVJW5LGivNFc0Dq14V3kqaXuK2u5OQrdVZo=
```

Stop your node 

`./goal node stop`

You may wish to not stop your node and allow it to catchup while you work through the next steps so you can submit the transaction to register the accounts online later without having to wait.

You can use the following to speed it up if you have `jq` installed.

`goal node catchup $(curl -s https://testnet-api.voi.nodly.io/v2/status|jq -r '.["last-catchpoint"]') &&\
echo OK`

#### Generate Part Key Locally

Create a new directory to store your part keys

`mkdir partkeys`

You may wish to name the partkeys based on which geography the ballast node will be located in so you can identify them easier and the corresponding account that will register with them.

`./algokey part generate --first FIRSTROUND --last LASTROUND --parent PUBLICADDRESS --keyfile KEYFILENAME`

#### Copy Part Key To Remote Server

Make sure you copy the right partkey for the right server depending on which account will be used in that servers node.

`sudo scp -P REMOTEPORTNUMBER KEYFILENAME REMOTEUSERNAME@REMOTEIPADDRESS:/home/REMOTEUSERNAME`

#### Move key to correct directory and rename

You should now be in your remote servers terminal

`sudo mv KEYFILENAME /mnt/voitest-v1/partkey`

#### Install partkey

`./goal.sh account installpartkey --delete-input --partkey /node/data/voitest-v1/partkey`

#### Confirm installed correctly

`./goal.sh account listpartkeys` 

You should see it list your account you created the partkey with against the partkey

#### Register online with the key locally

We should now swap back to our local machine to register the account as online.

##### Create Local Wallet

Create your local walled using KMD

`./goal wallet new voi`

Import your ballast and master accounts

`goal account import`

List account to see if works

`goal account list`

##### Install partkey Locally

Make sure local node is running

`./goal node start`

Install part key

`./goal account installpartkey --delete-input --partkey partkeys/KEYFILENAME`

##### Go Online

Wait for local node to be in sync.

You can use the following to speed it up if you have `jq` installed.

`goal node catchup $(curl -s https://testnet-api.voi.nodly.io/v2/status|jq -r '.["last-catchpoint"]') &&\
echo OK`

When in sync, run the following.

`./goal account changeonlinestatus -a PUBLICADDRESS -o=1`

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
