const fs = require('fs');
const os = require('os');
const path = require('path');
const { Client } = require('ssh2');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { read } = require('read');

// Local path to voi_testnet folder
const folderPath = path.join(__dirname, 'voi_testnet');

const conn = new Client();

// Function to generate a random hash
function generateRandomHash() {
    return crypto.randomBytes(32).toString('hex'); // 32 bytes for 256 bits
}

// Function to modify files locally and return the new values
async function modifyFiles() {
    const randomHash = generateRandomHash();
    fs.writeFileSync(path.join(folderPath, 'node/algod.token'), randomHash);

    const loggingConfigPath = path.join(folderPath, 'node/logging.config');
    const loggingConfig = JSON.parse(fs.readFileSync(loggingConfigPath, 'utf8'));
    const newGUID = uuidv4();
    loggingConfig.GUID = newGUID;
    fs.writeFileSync(loggingConfigPath, JSON.stringify(loggingConfig, null, 2));

    return { randomHash, newGUID };
}

// Function to store the new GUID and hash in a local JSON file
function storeInJsonFile(serverIP, guid, hash) {
    const fileName = 'serverDetails.json';
    let data = {};

    if (fs.existsSync(fileName)) {
        data = JSON.parse(fs.readFileSync(fileName, 'utf8'));
    }

    data[serverIP] = { guid, hash };

    fs.writeFileSync(fileName, JSON.stringify(data, null, 2));
}

// Function to ensure remote directory exists
async function ensureRemoteDirectoryExists(sftp, dir) {
    return new Promise((resolve, reject) => {
        sftp.mkdir(dir, (err) => {
            if (err && err.code !== 4) { // Ignore 'failure' error if directory already exists (code: 4)
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// Modified function to upload a folder
async function uploadFolder(sftp, localFolderPath, remoteFolderPath) {
    console.log('Local Path:', localFolderPath);
    console.log('Remote Path:', remoteFolderPath);

    // Ensure the remote directory exists
    await ensureRemoteDirectoryExists(sftp, remoteFolderPath);

    const files = fs.readdirSync(localFolderPath);
    for (const file of files) {
        const localFilePath = path.join(localFolderPath, file);
        const remoteFilePath = path.join(remoteFolderPath, file);

        if (fs.lstatSync(localFilePath).isDirectory()) {
            // Recursive call for directories
            await uploadFolder(sftp, localFilePath, remoteFilePath);
        } else {
            await new Promise((resolve, reject) => {
                sftp.fastPut(localFilePath, remoteFilePath, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
    }
}

async function executeSudoCommands(conn, commands, sudoPassword) {
    for (const command of commands) {
        const sudoCommand = `echo ${sudoPassword} | sudo -S bash -c "${command.replace(/"/g, '\\"')}"`;
        await new Promise((resolve, reject) => {
            conn.exec(sudoCommand, (err, stream) => {
                if (err) return reject(err);
                stream.on('close', () => {
                    console.log(`Executed: ${command}`);
                    resolve();
                }).on('data', (data) => {
                    console.log('STDOUT: ' + data);
                }).stderr.on('data', (data) => {
                    console.log('STDERR: ' + data);
                });
            });
        });
    }
}


// Function to execute a series of commands
async function executeCommands(conn, commands) {
    for (const command of commands) {
        console.log(`Executing command: ${command}`);
        await new Promise((resolve, reject) => {
            conn.exec(command, (err, stream) => {
                if (err) {
                    console.log(`Error executing command: ${command}`);
                    return reject(err);
                }
                stream.on('close', () => {
                    console.log(`Completed command: ${command}`);
                    resolve();
                }).on('data', (data) => {
                    console.log(`STDOUT for ${command}: ${data}`);
                }).stderr.on('data', (data) => {
                    console.log(`STDERR for ${command}: ${data}`);
                });
            });
        });
    }
}

async function main() {
    try {
        const { randomHash, newGUID } = await modifyFiles();
        const serverIP = await read({ prompt: 'What is the IP of your Server: ', silent: false });
        const sshPort = await read({ prompt: 'What is the SSH port of your Server: ', silent: false });
        const sshKeyPassphrase = await read({ prompt: 'Please enter your SSH key passphrase: ', silent: true, replace: '*' });
        const sudoPassword = await read({ prompt: 'Please enter the sudo password: ', silent: true, replace: '*' });
        const username = 'voi'; // Replace with the actual username

        // Store the new GUID and hash with the server IP as the key
        storeInJsonFile(serverIP, newGUID, randomHash);

        conn.on('ready', () => {
            console.log('Client :: ready');
            conn.sftp(async (err, sftp) => {
                if (err) throw err;
                await uploadFolder(sftp, folderPath, `/home/${username}/`);
                console.log('Folder uploaded successfully.');

                // Commands to temporarily disable sudo password requirement
                let sudoersCommands = [
                    `echo '${username} ALL=(ALL) NOPASSWD: ALL' | sudo EDITOR='tee -a' visudo`
                ];

                // Your original commands
                let originalCommands = [
                    // Docker installation commands
                    'sudo ufw allow from 170.205.24.129 to any port 9100',
                    'sudo ufw allow 5011',
                    'sudo apt-get update',
                    'sudo apt-get install -y ca-certificates curl gnupg',
                    'sudo install -m 0755 -d /etc/apt/keyrings',
                    'curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg',
                    'sudo chmod a+r /etc/apt/keyrings/docker.gpg',
                    `echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null`,
                    'sudo apt-get update',
                    'sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin',
                    'sudo apt-get install -y docker-compose-plugin',
                    'sudo apt install -y jq',
                    'sudo usermod -aG docker voi',
                    'sg docker -c "docker pull urtho/algod-voitest-rly"',
                    'sg docker -c "sudo mkdir /mnt/nodevoit"',
                    'sg docker -c "cd ~ && docker compose up -d"',
                    'sg docker -c "chmod +x ~/catchup.sh"',
                    'sg docker -c "chmod +x ~/goal.sh"',
                    'sg docker -c "~/catchup.sh"'
                ];

                // Commands to re-enable sudo password requirement
                let cleanupCommands = [
                    `sudo sed -i '/${username} ALL=(ALL) NOPASSWD: ALL/d' /etc/sudoers`
                ];

                // Execute commands
                await executeSudoCommands(conn, sudoersCommands, sudoPassword);
                await executeCommands(conn, originalCommands);
                await executeCommands(conn, cleanupCommands);

                console.log('All commands executed successfully.');
                conn.end();
            });
        }).connect({
            host: serverIP,
            port: parseInt(sshPort, 10),
            username: username,
            privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh/id_rsa')),
            passphrase: sshKeyPassphrase
        });
    } catch (err) {
        console.error('Error:', err);
    }
}

main();
