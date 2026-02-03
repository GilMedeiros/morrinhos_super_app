// Home Controller
class HomeController {
    // GET /
    static index(req, res) {
        res.render('index', {
            title: 'Morrinhos Módulo de Saúde',
            message: 'Welcome to your Express.js application!'
        });
    }

    // GET /about
    static about(req, res) {
        res.render('about', {
            title: 'About - Morrinhos App',
            message: 'About our application'
        });
    }

    // GET /upload
    static upload(req, res) {
        res.render('upload', {
            title: 'Upload PDF - Morrinhos App',
            currentPage: 'upload'
        });
    }

    // GET /disparo
    static disparo(req, res) {
        res.render('disparo', {
            title: 'Disparo - Morrinhos App'
        });
    }

    // GET /disparos
    static disparos(req, res) {
        res.render('disparos', {
            title: 'Gerenciar Disparos - Morrinhos App',
            data: {} // Garante que a variável 'data' sempre exista na view
        });
    }

    // GET /relatorios
    static relatorios(req, res) {
        res.render('relatorios', {
            title: 'Relatórios - Morrinhos App',
            currentPage: 'relatorios'
        });
    }

    // GET /configuracoes
    static configuracoes(req, res) {
        res.render('configuracoes', {
            title: 'Configurações - Morrinhos App',
            currentPage: 'configuracoes'
        });
    }

    // GET /upload-csv
    static uploadCsv(req, res) {
        res.render('upload_csv', {
            title: 'Upload CSV - Morrinhos App',
            currentPage: 'upload_csv'
        });
    }
}

module.exports = HomeController;
