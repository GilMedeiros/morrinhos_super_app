const { Pool } = require('pg');

class Database {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:b2a4e40a9b27ed14cc0b08007f346de0@76.13.82.92:5432/morrinhos_arrecadacao?sslmode=disable',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });

        // Event listeners para debug
        this.pool.on('connect', () => {
            console.log('✅ Conectado ao PostgreSQL');
        });

        this.pool.on('error', (err) => {
            console.error('❌ Erro no PostgreSQL:', err);
        });
    }

    // Executar query
    async query(text, params) {
        const start = Date.now();
        try {
            const res = await this.pool.query(text, params);
            const duration = Date.now() - start;
            console.log('📊 Query executada:', { text, duration, rows: res.rowCount });
            return res;
        } catch (error) {
            console.error('❌ Erro na query:', error);
            throw error;
        }
    }

    // Obter cliente para transações
    async getClient() {
        return await this.pool.connect();
    }

    // Fechar conexões
    async close() {
        await this.pool.end();
        console.log('🔌 Conexões PostgreSQL fechadas');
    }

    // Testar conexão
    async testConnection() {
        try {
            const result = await this.query('SELECT NOW() as current_time');
            console.log('✅ PostgreSQL conectado:', result.rows[0].current_time);
            return true;
        } catch (error) {
            console.error('❌ Erro ao conectar PostgreSQL:', error.message);
            return false;
        }
    }

    // Métodos utilitários para CRUD
    async findById(table, id) {
        const result = await this.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
        return result.rows[0];
    }

    async findAll(table, conditions = '', params = []) {
        const query = `SELECT * FROM ${table} ${conditions}`;
        const result = await this.query(query, params);
        return result.rows;
    }

    async create(table, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');

        const query = `
            INSERT INTO ${table} (${keys.join(', ')}) 
            VALUES (${placeholders}) 
            RETURNING *
        `;

        const result = await this.query(query, values);
        return result.rows[0];
    }

    async update(table, id, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');

        const query = `
            UPDATE ${table} 
            SET ${setClause} 
            WHERE id = $1 
            RETURNING *
        `;

        const result = await this.query(query, [id, ...values]);
        return result.rows[0];
    }

    async delete(table, id) {
        const result = await this.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [id]);
        return result.rows[0];
    }
}

module.exports = new Database();
