const bcrypt = require('bcrypt');
const db = require('../config/database');

class AuthController {
    // Gerar senhas hasheadas iniciais (executar uma vez)
    static async generateInitialPasswords() {
        const admin123 = await bcrypt.hash('admin123', 10);
        const user123 = await bcrypt.hash('user123', 10);
        console.log('Admin password hash:', admin123);
        console.log('User password hash:', user123);
    }

    // Buscar usuário por username
    static async findUserByUsername(username) {
        try {
            const query = 'SELECT * FROM auth_users WHERE username = $1 AND active = true';
            const result = await db.query(query, [username]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erro ao buscar usuário:', error);
            return null;
        }
    }

    // Buscar usuário por ID
    static async findUserById(id) {
        try {
            const query = 'SELECT * FROM auth_users WHERE id = $1 AND active = true';
            const result = await db.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erro ao buscar usuário por ID:', error);
            return null;
        }
    }

    // Criar novo usuário
    static async createUser(userData) {
        try {
            const { username, password, name, role = 'user' } = userData;

            // Verificar se o usuário já existe
            const existingUser = await AuthController.findUserByUsername(username);
            if (existingUser) {
                throw new Error('Nome de usuário já existe');
            }

            // Hash da senha
            const hashedPassword = await bcrypt.hash(password, 10);

            // Inserir usuário
            const query = `
                INSERT INTO auth_users (username, password, name, role, active) 
                VALUES ($1, $2, $3, $4, true) 
                RETURNING id, username, name, role, created_at
            `;
            const result = await db.query(query, [username, hashedPassword, name, role]);

            return result.rows[0];
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            throw error;
        }
    }

    // Listar todos os usuários (apenas admin)
    static async getAllUsers() {
        try {
            const query = `
                SELECT id, username, name, role, active, created_at, updated_at 
                FROM auth_users 
                ORDER BY created_at DESC
            `;
            const result = await db.query(query);
            return result.rows;
        } catch (error) {
            console.error('Erro ao listar usuários:', error);
            throw error;
        }
    }

    // Atualizar usuário
    static async updateUser(id, userData) {
        try {
            const { name, role, active } = userData;

            const query = `
                UPDATE auth_users 
                SET name = $1, role = $2, active = $3, updated_at = CURRENT_TIMESTAMP
                WHERE id = $4 
                RETURNING id, username, name, role, active, updated_at
            `;
            const result = await db.query(query, [name, role, active, id]);

            return result.rows[0];
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            throw error;
        }
    }

    // Alterar senha do usuário
    static async changePassword(id, newPassword) {
        try {
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            const query = `
                UPDATE auth_users 
                SET password = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `;
            await db.query(query, [hashedPassword, id]);

            return true;
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            throw error;
        }
    }

    // Desativar usuário (soft delete)
    static async deactivateUser(id) {
        try {
            const query = `
                UPDATE auth_users 
                SET active = false, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `;
            await db.query(query, [id]);

            return true;
        } catch (error) {
            console.error('Erro ao desativar usuário:', error);
            throw error;
        }
    }
    // Exibir tela de login
    static showLogin(req, res) {
        // Se já estiver logado, redirecionar para home
        if (req.session && req.session.user) {
            return res.redirect('/');
        }

        res.render('login', {
            error: req.query.error || null
        });
    }

    // Processar login
    static async processLogin(req, res) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.redirect('/login?error=Por favor, preencha todos os campos');
            }

            // Buscar usuário no banco de dados
            const user = await AuthController.findUserByUsername(username);

            if (!user) {
                return res.redirect('/login?error=Usuário ou senha inválidos');
            }

            // Verificar senha
            const isValidPassword = await bcrypt.compare(password, user.password);

            if (!isValidPassword) {
                return res.redirect('/login?error=Usuário ou senha inválidos');
            }

            // Criar sessão
            req.session.user = {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role
            };

            console.log('Login realizado com sucesso:', user.username);

            // Redirecionar para a página inicial
            res.redirect('/');

        } catch (error) {
            console.error('Erro no login:', error);
            res.redirect('/login?error=Erro interno do servidor');
        }
    }

    // Logout
    static logout(req, res) {
        if (req.session) {
            req.session.destroy((err) => {
                if (err) {
                    console.error('Erro ao fazer logout:', err);
                    return res.redirect('/');
                }

                res.clearCookie('connect.sid'); // Nome padrão do cookie de sessão
                res.redirect('/login');
            });
        } else {
            res.redirect('/login');
        }
    }

    // Middleware para verificar autenticação
    static requireAuth(req, res, next) {
        if (req.session && req.session.user) {
            return next();
        }

        res.redirect('/login');
    }

    // Middleware para verificar se é admin
    static requireAdmin(req, res, next) {
        if (req.session && req.session.user && req.session.user.role === 'admin') {
            return next();
        }

        res.status(403).send('Acesso negado. Apenas administradores podem acessar esta página.');
    }

    // Obter usuário atual
    static getCurrentUser(req) {
        return req.session && req.session.user ? req.session.user : null;
    }

    // Verificar se está logado
    static isAuthenticated(req) {
        return req.session && req.session.user;
    }

    // Verificar se é admin
    static isAdmin(req) {
        return req.session && req.session.user && req.session.user.role === 'admin';
    }
}

module.exports = AuthController;
