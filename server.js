const { spawn } = require('child_process');
const express = require('express');
const app = express();

// 必须监听 3000，虽然 Xray 也会占这个端口，但 Node 必须先起来
const port = process.env.APP_PORT || 3001; 
app.get('/', (req, res) => res.send('Socks5 Relay Node is Running'));
app.listen(port);

// 重点：这里直接启动并读取同目录下的 config.json
const xray = spawn('./xray', ['-config', 'config.json']);

xray.stdout.on('data', (data) => console.log(`[Xray] ${data}`));
xray.stderr.on('data', (data) => console.error(`[Xray Error] ${data}`));
