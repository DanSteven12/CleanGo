async function testPostNotif() {
  try {
    const fakeToken = 'test-token-123';
    const res = await fetch('http://localhost:5001/api/notificaciones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `XSRF-TOKEN=${fakeToken}`,
        'x-xsrf-token': fakeToken
      },
      body: JSON.stringify({
        titulo: 'Aviso de prueba script',
        mensaje: 'Publicación exitosa de prueba',
        destinatario: 'CIUDADANOS'
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', data);
  } catch (e) {
    console.error(e);
  }
}

testPostNotif();
