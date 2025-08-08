const express = require('express');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

// Import controllers
const HomeController = require('./controllers/homeController');
const ApiController = require('./controllers/apiController');

// Import database and redis
const db = require('./config/database');
const redis = require('./config/redis');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar multer para upload de arquivos
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos PDF são permitidos'), false);
        }
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));

// Routes
app.get('/', HomeController.disparo);
app.get('/inicio', HomeController.index);
app.get('/about', HomeController.about);
app.get('/upload', HomeController.upload);
app.get('/disparo', HomeController.disparo);
app.get('/disparos', HomeController.disparos);
app.get('/relatorios', HomeController.relatorios);
app.get('/configuracoes', HomeController.configuracoes);

// API routes
app.get('/api', ApiController.getStatus);
app.get('/api/health', ApiController.healthCheck);
app.get('/api/sources/:id/solicitacoes', ApiController.getSolicitacoesBySource);
app.get('/api/sources', ApiController.getSources);
app.get('/api/users', ApiController.getUsers);
app.get('/api/users/:id', ApiController.getUserById);
app.post('/api/users', ApiController.createUser);
app.put('/api/users/:id', ApiController.updateUser);
app.delete('/api/users/:id', ApiController.deleteUser);

// Rotas para disparos
app.get('/api/disparos', ApiController.getDisparos);
app.get('/api/disparos/:id', ApiController.getDisparoById);
app.post('/api/disparos', ApiController.createDisparo);
app.put('/api/disparos/:id', ApiController.updateDisparo);
app.put('/api/disparos/:id/status', ApiController.updateDisparoStatus);
app.post('/api/disparos/:id/execute', ApiController.executeDisparo);
app.delete('/api/disparos/:id', ApiController.deleteDisparo);

// Rotas para fila de disparos
app.get('/api/disparos/queue/status', ApiController.getQueueStatus);
app.post('/api/disparos/queue/start', ApiController.startQueue);
app.post('/api/disparos/queue/stop', ApiController.stopQueue);
app.get('/api/disparos/queue/config', ApiController.getQueueConfig);
app.post('/api/disparos/queue/config', ApiController.saveQueueConfig);

// Rotas para Typebot
app.get('/api/typebot/test', ApiController.testTypebotConnection);
app.post('/api/typebot/test-message', ApiController.testTypebotMessageCustom);
app.post('/api/typebot/test-connection', ApiController.testTypebotConnectionCustom);
app.get('/api/typebot/config', ApiController.getTypebotConfig);
app.post('/api/typebot/config', ApiController.saveTypebotConfig);
app.delete('/api/typebot/config', ApiController.resetTypebotConfig);

// Rotas para solicitações
app.get('/api/solicitacoes', ApiController.getAllSolicitacoes);
app.get('/api/solicitacoes/filters', ApiController.getSolicitacoesFilters);
app.put('/api/solicitacoes/:id/schedule', ApiController.updateSolicitacaoSchedule);
app.put('/api/solicitacoes/:id/observacao', ApiController.updateObservacao);

// Rotas proxy para o serviço PDF
app.get('/api/pdf-extractor', ApiController.getPdfExtractorStatus);
app.post('/api/pdf-extractor/upload', upload.single('file'), ApiController.uploadPdf);

// 404 handler
app.use((req, res) => {
    res.status(404).render('404', {
        title: '404 - Page Not Found',
        message: 'The page you are looking for does not exist.'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Something went wrong!'
    });
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);

    // Testar conexões
    console.log('🔍 Testing database connections...');

    try {
        await db.testConnection();
    } catch (error) {
        console.error('❌ Failed to connect to PostgreSQL:', error.message);
    }

    try {
        await redis.connect();
    } catch (error) {
        console.error('❌ Failed to connect to Redis:', error.message);
    }

    console.log('✅ Server startup complete!');
});

module.exports = app;