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
### Copy Node Files
Copy in config.json, logging.config, and algod.token to the ~/node folder.
Copy docker-compose.yaml, goal.sh, and catchup.sh to your home directory.

*You have to generate a new sha-256 hash for algod.token and a new guid for logging.config*

EXAMPLE
```
scp -r -P 2020 ./voit_testnet user@remote_server:~
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
