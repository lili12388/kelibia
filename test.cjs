const http = require('http');
const req = http.request({
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/properties/submit',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=boundary123'
  }
}, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => console.log('Response Status:', res.statusCode, 'Body:', data));
});
req.write('--boundary123\r\nContent-Disposition: form-data; name=\"title\"\r\n\r\ntest\r\n--boundary123--\r\n');
req.end();
