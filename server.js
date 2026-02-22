const { spawn } = require('child_process');
const express = require('express');
const app = express();

// 必须监听 APP_PORT，否则 Flux 部署会挂掉
const port = process.env.APP_PORT || 3000;
app.get('/', (req, res) => res.send('Relay Exit Node Ready'));
app.listen(port);

const xrayConfig = {
  inbounds: [{
    port: 3000,
    protocol: "socks",
    settings: {
      auth: "password",
      accounts: [{
        user: "admin",      // 你的落地账号
        pass: "flux123"     // 你的落地密码
      }],
      udp: true
    }
  }],
  outbounds: [{ protocol: "freedom" }]
};

const xray = spawn('./xray', ['-c', JSON.stringify(xrayConfig)]);
