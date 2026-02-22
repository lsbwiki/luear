const http = require('http');
const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ================= 配置参数 =================
const mainPort = process.env.APP_PORT || 3000; // Flux 分配的对外端口
const xrayPort = 3001;                         // Xray 本地监听端口
const wsPath = '/vless';                       // WebSocket 路径
// 请在 Flux 部署环境变量中设置 UUID，否则使用默认值
const uuid = process.env.UUID || 'd3b82173-1002-4467-a7eb-5c7438186176';

// ================= 1. 启动 Xray =================
const configPath = path.join(__dirname, 'config.json');
let configRaw = fs.readFileSync(configPath, 'utf8');
let config = JSON.parse(configRaw);

// 动态注入 UUID
config.inbounds[0].settings.clients[0].id = uuid;
const runConfigPath = '/tmp/config.json';
fs.writeFileSync(runConfigPath, JSON.stringify(config, null, 2));

console.log('Starting Xray core...');
const xrayProcess = spawn(path.join(__dirname, 'xray'), ['-config', runConfigPath]);

xrayProcess.stdout.on('data', (data) => console.log(`[Xray] ${data.toString().trim()}`));
xrayProcess.stderr.on('data', (data) => console.error(`[Xray Error] ${data.toString().trim()}`));

// ================= 2. 启动 Web & Proxy 服务 =================
const server = http.createServer((req, res) => {
    // 只有访问根目录时展示网页
    if (req.url === '/') {
        // 动态获取 Flux 分配的域名
        const host = req.headers.host || 'your-domain.com';
        // Flux 外层有 TLS 终结，因此客户端连接端口为 443，开启 TLS
        const vlessLink = `vless://${uuid}@${host}:443?encryption=none&security=tls&type=ws&host=${host}&path=${wsPath}#Flux-VLESS`;

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Flux 节点控制台</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f9; color: #333; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                    .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; max-width: 600px; width: 90%; }
                    h1 { color: #2c3e50; margin-bottom: 20px; }
                    textarea { width: 100%; height: 100px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #f8f9fa; font-size: 14px; word-break: break-all; resize: none; box-sizing: border-box; }
                    button { margin-top: 20px; background-color: #007bff; color: white; border: none; padding: 12px 24px; font-size: 16px; border-radius: 8px; cursor: pointer; transition: background-color 0.3s; }
                    button:hover { background-color: #0056b3; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>✅ 节点部署成功</h1>
                    <p>您的专属 VLESS 链接已生成，请复制后导入代理软件：</p>
                    <textarea id="linkText" readonly>${vlessLink}</textarea>
                    <button onclick="copyLink()">一键复制链接</button>
                </div>
                <script>
                    function copyLink() {
                        const copyText = document.getElementById("linkText");
                        copyText.select();
                        copyText.setSelectionRange(0, 99999);
                        document.execCommand("copy");
                        alert("链接已复制到剪贴板！\\n打开 v2rayN / Shadowrocket / Quantumult X 等软件从剪贴板导入即可。");
                    }
                </script>
            </body>
            </html>
        `);
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// 处理 WebSocket 请求并代理给 Xray
server.on('upgrade', (req, socket, head) => {
    if (req.url === wsPath) {
        const proxy = net.createConnection(xrayPort, '127.0.0.1', () => {
            // 重建 HTTP 请求头发送给本地 Xray
            let headerString = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
            for (let i = 0; i < req.rawHeaders.length; i += 2) {
                headerString += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
            }
            headerString += '\r\n';
            proxy.write(headerString);
            proxy.write(head);
            proxy.pipe(socket);
            socket.pipe(proxy);
        });

        proxy.on('error', () => socket.end());
        socket.on('error', () => proxy.end());
    } else {
        socket.destroy();
    }
});

server.listen(mainPort, () => {
    console.log(`Web server and proxy listening on port ${mainPort}`);
});