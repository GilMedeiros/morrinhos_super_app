const express = require('express');

const app = express();
const PORT = 3001;

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});
