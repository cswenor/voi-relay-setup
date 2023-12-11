# Setup Voi Relay Node(Docker)
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

Create the following 3 files:

```
sudo touch config.json
sudo touch logging.config
sudo touch algod.token
```

Copy into these files the contents of config.json, logging.config, and algod.token in the `voi_testnet/node` folder in this repo. 

*Make sure you change the GUID in the `logging.config` file, you can create a new GUID with [this tool](https://guidgenerator.com/).*

*Make sure you change the text in the `algod.token` file, you can create a new hash with [this tool](https://emn178.github.io/online-tools/sha256.html). You can just type in random characters into the input.*

You can use the following to edit a file

```
sudo nano FILENAME
```

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

Copy into these files the contents of docker-compose.yaml, goal.sh, and catchup.sh in the `voi_testnet` folder in this repo.

You can use the following to edit a file

```
sudo nano FILENAME
```

### Make Bash files Executable
```
chmod +x ~/catchup.sh
chmod +x ~/goal.sh
```
### Mount Node data folder
```
sudo mkdir /mnt/nodevoit
```
### Pull Docker Image
```
docker pull urtho/algod-voitest-rly
```
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
