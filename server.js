const { spawn } = require('child_process');
const express = require('express');
const app = express();

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
        user: "admin",     
        pass: "flux123" 
      }],
      udp: true
    }
  }],
  outbounds: [{ protocol: "freedom" }]
};

const xray = spawn('./xray', ['-c', JSON.stringify(xrayConfig)]);

