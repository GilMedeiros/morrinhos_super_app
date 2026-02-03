const express = require('express');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
require('dotenv').config();

// Import controllers
const HomeController = require('./controllers/homeController');
const ApiController = require('./controllers/apiController');
const AuthController = require('./controllers/authController');

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

// Configurar multer para upload de arquivos CSV
const uploadCsv = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos CSV são permitidos'), false);
        }
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configurar sessões
app.use(session({
    secret: process.env.SESSION_SECRET || 'morrinhos-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Para desenvolvimento, em produção usar HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Middleware para disponibilizar dados do usuário nas views
app.use((req, res, next) => {
    res.locals.user = AuthController.getCurrentUser(req);
    res.locals.isAuthenticated = AuthController.isAuthenticated(req);
    res.locals.isAdmin = AuthController.isAdmin(req);
    next();
});

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));

// Rotas de autenticação (não protegidas)
app.get('/login', AuthController.showLogin);
app.post('/login', AuthController.processLogin);
app.get('/logout', AuthController.logout);

// Routes (protegidas por autenticação)
app.get('/', AuthController.requireAuth, HomeController.disparo);
app.get('/inicio', AuthController.requireAuth, HomeController.index);
app.get('/about', AuthController.requireAuth, HomeController.about);
app.get('/upload', AuthController.requireAuth, HomeController.upload);
app.get('/disparo', AuthController.requireAuth, HomeController.disparo);
app.get('/disparos', AuthController.requireAuth, HomeController.disparos);
app.get('/relatorios', AuthController.requireAuth, HomeController.relatorios);
app.get('/configuracoes', AuthController.requireAuth, HomeController.configuracoes);
app.get('/usuarios', AuthController.requireAuth, AuthController.requireAdmin, (req, res) => {
    res.render('usuarios', {
        title: 'Gerenciamento de Usuários',
        currentPage: 'usuarios'
    });
});
app.get('/upload-csv', AuthController.requireAuth, HomeController.uploadCsv);

// API routes (protegidas por autenticação)
app.get('/api', AuthController.requireAuth, ApiController.getStatus);
app.get('/api/health', AuthController.requireAuth, ApiController.healthCheck);
app.get('/api/sources/:id/solicitacoes', AuthController.requireAuth, ApiController.getSolicitacoesBySource);
app.get('/api/sources', AuthController.requireAuth, ApiController.getSources);
app.delete('/api/sources/:id', AuthController.requireAuth, ApiController.deleteSource);
app.get('/api/users', AuthController.requireAuth, ApiController.getUsers);
app.get('/api/users/:id', AuthController.requireAuth, ApiController.getUserById);
app.post('/api/users', AuthController.requireAuth, ApiController.createUser);
app.put('/api/users/:id', AuthController.requireAuth, ApiController.updateUser);
app.delete('/api/users/:id', AuthController.requireAuth, ApiController.deleteUser);

// Rotas para disparos
app.get('/api/disparos', AuthController.requireAuth, ApiController.getDisparos);
app.get('/api/disparos/:id', AuthController.requireAuth, ApiController.getDisparoById);
app.post('/api/disparos', AuthController.requireAuth, ApiController.createDisparo);
app.put('/api/disparos/:id', AuthController.requireAuth, ApiController.updateDisparo);
app.put('/api/disparos/:id/status', AuthController.requireAuth, ApiController.updateDisparoStatus);
app.put('/api/disparos/:id/tipo-mensagem', AuthController.requireAuth, ApiController.updateTipoMensagem);
app.post('/api/disparos/:id/execute', AuthController.requireAuth, ApiController.executeDisparo);
app.delete('/api/disparos/:id', AuthController.requireAuth, ApiController.deleteDisparo);

// Rotas para fila de disparos
app.get('/api/disparos/queue/status', AuthController.requireAuth, ApiController.getQueueStatus);
app.post('/api/disparos/queue/start', AuthController.requireAuth, ApiController.startQueue);
app.post('/api/disparos/queue/stop', AuthController.requireAuth, ApiController.stopQueue);
app.get('/api/disparos/queue/config', AuthController.requireAuth, ApiController.getQueueConfig);
app.post('/api/disparos/queue/config', AuthController.requireAuth, ApiController.saveQueueConfig);

// Rotas para Typebot
app.get('/api/typebot/test', AuthController.requireAuth, ApiController.testTypebotConnection);
app.post('/api/typebot/test-message', AuthController.requireAuth, ApiController.testTypebotMessageCustom);
app.post('/api/typebot/test-connection', AuthController.requireAuth, ApiController.testTypebotConnectionCustom);
app.get('/api/typebot/config', AuthController.requireAuth, ApiController.getTypebotConfig);
app.post('/api/typebot/config', AuthController.requireAuth, ApiController.saveTypebotConfig);
app.delete('/api/typebot/config', AuthController.requireAuth, ApiController.resetTypebotConfig);

// Rotas para solicitações
app.get('/api/solicitacoes', AuthController.requireAuth, ApiController.getAllSolicitacoes);
app.get('/api/solicitacoes/filters', AuthController.requireAuth, ApiController.getSolicitacoesFilters);
app.put('/api/solicitacoes/:id/schedule', AuthController.requireAuth, ApiController.updateSolicitacaoSchedule);
app.put('/api/solicitacoes/:id/observacao', AuthController.requireAuth, ApiController.updateObservacao);
app.put('/api/solicitacoes/:id/unidade', AuthController.requireAuth, ApiController.updateUnidade);

// Rotas proxy para o serviço PDF
app.get('/api/pdf-extractor', AuthController.requireAuth, ApiController.getPdfExtractorStatus);
app.post('/api/pdf-extractor/upload', AuthController.requireAuth, upload.single('file'), ApiController.uploadPdf);

// Rota para upload de CSV
app.post('/api/csv/upload', AuthController.requireAuth, uploadCsv.single('file'), ApiController.uploadCsv);
app.get('/api/csv/files', AuthController.requireAuth, ApiController.getCsvFiles);


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