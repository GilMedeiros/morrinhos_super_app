async function test() {
    try {
        console.log('Tentando conectar em 127.0.0.1:3001...');
        const res = await fetch('http://127.0.0.1:3001/health', { timeout: 5000 });
        const data = await res.json();
        console.log('✅ Success:', data);
    } catch (err) {
        console.error('❌ Failed:', err.message);
    }
}

test();
