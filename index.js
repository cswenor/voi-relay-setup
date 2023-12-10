const { Client } = require('ssh2');
const fs = require('fs');
const { read } = require('read');

// Hardcoded values
const rootPrivateKeyPath = '/home/cswenor/.ssh/id_rsa'; // Path to your private key
const voiPublicKeyPath = '/home/cswenor/.ssh/id_rsa.pub'; // Path to voi's public key
const localSshdConfigPath = './sshd_config'; // Path to your sshd_config file

const voiPublicKeyContent = fs.readFileSync(voiPublicKeyPath, 'utf8').trim();

const conn = new Client();

async function main() {
    try {
        const serverIP = await read({ prompt: 'What is the IP of your Server: ', silent: false });
        const sshKeyPassphrase = await read({ prompt: 'Please enter your SSH key passphrase: ', silent: true, replace: '*' });
        const voiUserPassword = await read({ prompt: 'Please enter the password for the voi user: ', silent: true, replace: '*' });

        conn.on('ready', () => {
            console.log('Client :: ready');

            // Function to upload sshd_config file
            const uploadSshdConfig = () => {
                return new Promise((resolve, reject) => {
                    conn.sftp((err, sftp) => {
                        if (err) return reject(err);

                        sftp.fastPut(localSshdConfigPath, '/etc/ssh/sshd_config', {}, (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                console.log('sshd_config uploaded successfully.');
                                resolve();
                            }
                        });
                    });
                });
            };

            // Commands to execute
            const commands = [
                'sudo adduser voi --gecos "" --disabled-password',
                `echo "voi:${voiUserPassword}" | sudo chpasswd`,
                'echo "voi ALL=(ALL) NOPASSWD: /usr/bin/apt update, /usr/bin/apt install *, /bin/systemctl enable fail2ban, /usr/sbin/dpkg-reconfigure --priority=low unattended-upgrades, /bin/systemctl restart ssh, /usr/sbin/ufw allow 42069/tcp, /usr/sbin/ufw --force enable" | sudo tee /etc/sudoers.d/voi',
                'sudo mkdir -p /home/voi/.ssh',
                `echo "${voiPublicKeyContent}" | sudo tee /home/voi/.ssh/authorized_keys`,
                'sudo chown -R voi:voi /home/voi/.ssh',
                'sudo chmod 700 /home/voi/.ssh',
                'sudo chmod 600 /home/voi/.ssh/authorized_keys',
                'sudo apt update',
                'echo "unattended-upgrades unattended-upgrades/enable_auto_updates boolean true" | sudo debconf-set-selections',
                'sudo apt install unattended-upgrades -y',
                'sudo DEBIAN_FRONTEND=noninteractive dpkg-reconfigure -f noninteractive unattended-upgrades',
                'sudo apt install ufw fail2ban -y',
                'sudo systemctl enable fail2ban'
            ];

            // Execute commands in series
            const executeCommands = (cmds) => {
                return cmds.reduce((promise, command) => {
                    return promise.then(() => new Promise((resolve, reject) => {
                        conn.exec(command, (err, stream) => {
                            if (err) return reject(err);
                            stream.on('close', (code, signal) => {
                                console.log(`Finished executing: ${command}`);
                                resolve();
                            }).on('data', (data) => {
                                console.log('STDOUT: ' + data);
                            }).stderr.on('data', (data) => {
                                console.log('STDERR: ' + data);
                            });
                        });
                    }));
                }, Promise.resolve());
            };

            const revertCommands = [
                'echo "voi ALL=(ALL) ALL" | sudo tee /etc/sudoers.d/voi', // Revert sudo permissions for voi
            ];

            // Upload sshd_config and then execute remaining commands
            executeCommands(commands)
                .then(uploadSshdConfig)
                .then(() => executeCommands([
                    'sudo systemctl restart ssh',
                    'sudo ufw allow 42069/tcp',
                    'sudo ufw --force enable'
                ]))
                .then(() => executeCommands(revertCommands))
                .then(() => {
                    console.log("All commands executed. Please manually verify SSH access on the new port in a new terminal window. Don't close the existing session until verification.");
                    conn.end();
                })
                .catch((err) => {
                    console.error('Error:', err);
                    conn.end();
                });

        }).on('error', (err) => {
            console.error('Connection Error:', err);
            conn.end();
        }).connect({
            host: serverIP,
            port: 22,
            username: 'root',
            privateKey: fs.readFileSync(rootPrivateKeyPath),
            passphrase: sshKeyPassphrase
        });
    } catch (err) {
        console.error('Error:', err);
    }
}

main();