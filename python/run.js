const { exec, spawn } = require('child_process');

async function kill(port) {
    return new Promise(resolve => {
        exec(`netstat -ano | findstr 127.0.0.1:${port}`, (err, stdout, stderr) => {
            if (stdout.length > 0) {
                const split = stdout.split(" ")
                const PID = Number(split[split.length - 1])
                
                exec(`taskkill /PID ${PID} /F`, (err, stdout, stderr) => {
                    console.log(err, stdout, stderr);
                    resolve(true);
                })
            }
            else {
                resolve(false);
            }
        })
    })
}

async function run(port, command) {
    await kill(port);
    
    await spawner(command)
}

function spawner(command) {
    console.log(`spawning ${command}`);
    const process = spawn(command, [], { shell: true })

    process.stderr.on("data", data => {
        console.log(String(data));
    })

    process.stdout.on("error", data => {
        console.log(String(data));
    })

    process.stdout.on('data', (data) => {
        console.log(String(data));
    });
    
    process.on('close', (code) => {
        console.log(`Process ended: ${code}`);
    });

    return process
}

run(3000, "python -u ./debug.py")