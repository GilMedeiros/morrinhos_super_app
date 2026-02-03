// User Model
const db = require('../config/database');

class User {
    constructor(id, name, email, createdAt = new Date(), updatedAt = new Date()) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    
    // Buscar todos os usuários
    static async findAll() {
        try {
            const users = await db.findAll('users', 'ORDER BY created_at DESC');
            return users.map(user => new User(
                user.id, 
                user.name, 
                user.email, 
                user.created_at, 
                user.updated_at
            ));
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            throw error;
        }
    }

    // Buscar usuário por ID
    static async findById(id) {
        try {
            const user = await db.findById('users', id);
            if (!user) return null;
            
            return new User(
                user.id, 
                user.name, 
                user.email, 
                user.created_at, 
                user.updated_at
            );
        } catch (error) {
            console.error('Erro ao buscar usuário por ID:', error);
            throw error;
        }
    }

    // Buscar usuário por email
    static async findByEmail(email) {
        try {
            const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
            if (result.rows.length === 0) return null;
            
            const user = result.rows[0];
            return new User(
                user.id, 
                user.name, 
                user.email, 
                user.created_at, 
                user.updated_at
            );
        } catch (error) {
            console.error('Erro ao buscar usuário por email:', error);
            throw error;
        }
    }
    
    // Criar novo usuário
    static async create(userData) {
        try {
            const validation = this.validate(userData);
            if (!validation.isValid) {
                throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
            }

            // Verificar se email já existe
            const existingUser = await this.findByEmail(userData.email);
            if (existingUser) {
                throw new Error('Email já está em uso');
            }

            const newUser = await db.create('users', {
                name: userData.name,
                email: userData.email
            });

            return new User(
                newUser.id,
                newUser.name,
                newUser.email,
                newUser.created_at,
                newUser.updated_at
            );
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            throw error;
        }
    }

    // Atualizar usuário
    static async update(id, userData) {
        try {
            const validation = this.validate(userData);
            if (!validation.isValid) {
                throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
            }

            const updatedUser = await db.update('users', id, {
                name: userData.name,
                email: userData.email
            });

            if (!updatedUser) {
                throw new Error('Usuário não encontrado');
            }

            return new User(
                updatedUser.id,
                updatedUser.name,
                updatedUser.email,
                updatedUser.created_at,
                updatedUser.updated_at
            );
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            throw error;
        }
    }

    // Deletar usuário
    static async delete(id) {
        try {
            const deletedUser = await db.delete('users', id);
            if (!deletedUser) {
                throw new Error('Usuário não encontrado');
            }

            return new User(
                deletedUser.id,
                deletedUser.name,
                deletedUser.email,
                deletedUser.created_at,
                deletedUser.updated_at
            );
        } catch (error) {
            console.error('Erro ao deletar usuário:', error);
            throw error;
        }
    }
    
    // Validar dados do usuário
    static validate(userData) {
        const errors = [];
        
        if (!userData.name || userData.name.trim().length < 2) {
            errors.push('Nome deve ter pelo menos 2 caracteres');
        }
        
        if (!userData.email || !this.isValidEmail(userData.email)) {
            errors.push('Email válido é obrigatório');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    // Validar formato do email
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Converter para JSON
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = User;
