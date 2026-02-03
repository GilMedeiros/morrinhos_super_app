async function test() {
    try {
        const res = await fetch('http://127.0.0.1:3001/health');
        const data = await res.json();
        console.log('✅ Success:', data);
    } catch (err) {
        console.error('❌ Failed:', err.message);
    }
}

test();
