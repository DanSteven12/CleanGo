const http = require('http');

http.get('http://localhost:5001/api/recorridos/activo/1', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
        const json = JSON.parse(data);
        console.log("Checkpoints length: ", json.checkpoints.length);
        console.log("First checkpoint:", json.checkpoints[0]);
    } catch (e) {
        console.log(data);
    }
  });
}).on('error', (err) => console.log(err));
