const { spawn } = require('child_process');

console.log('正在启动 Xray Socks5 服务...');

// 直接读取同目录下的 config.json 文件
const xray = spawn('./xray', ['-config', 'config.json']);

xray.stdout.on('data', (data) => {
  console.log(`[Xray] ${data}`);
});

xray.stderr.on('data', (data) => {
  console.error(`[Xray Error] ${data}`);
});

xray.on('error', (err) => {
  console.error(`[系统报错] 无法启动 Xray: ${err.message}`);
});

xray.on('close', (code) => {
  console.log(`Xray 进程已退出，代码: ${code}`);
});
