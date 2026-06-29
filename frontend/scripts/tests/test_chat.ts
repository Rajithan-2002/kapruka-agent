async function test() {
    const r = await fetch('http://localhost:3000/api/chat', { 
        method: 'POST', 
        body: JSON.stringify({ message: 'I have no idea what I want', history: [] }), 
        headers: { 'Content-Type': 'application/json' } 
    });
    console.log('STATUS:', r.status, 'BODY:', await r.text());
}
test();
