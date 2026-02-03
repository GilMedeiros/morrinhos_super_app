const redis = require('redis');

class RedisClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            this.client = redis.createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379',
                retry_strategy: (options) => {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        console.error('❌ Redis server recusou conexão');
                        return new Error('Redis server recusou conexão');
                    }
                    if (options.total_retry_time > 1000 * 60 * 60) {
                        console.error('❌ Timeout na conexão Redis');
                        return new Error('Timeout na tentativa de conexão Redis');
                    }
                    if (options.attempt > 10) {
                        console.error('❌ Muitas tentativas de conexão Redis');
                        return undefined;
                    }
                    return Math.min(options.attempt * 100, 3000);
                }
            });

            this.client.on('error', (err) => {
                console.error('❌ Erro Redis:', err);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                console.log('🔗 Conectando ao Redis...');
            });

            this.client.on('ready', () => {
                console.log('✅ Redis conectado e pronto');
                this.isConnected = true;
            });

            this.client.on('end', () => {
                console.log('🔌 Conexão Redis encerrada');
                this.isConnected = false;
            });

            await this.client.connect();
            return this.client;
        } catch (error) {
            console.error('❌ Erro ao conectar Redis:', error);
            this.isConnected = false;
            throw error;
        }
    }

    async disconnect() {
        if (this.client && this.isConnected) {
            await this.client.disconnect();
            console.log('🔌 Redis desconectado');
        }
    }

    // Métodos utilitários
    async set(key, value, expireInSeconds = null) {
        if (!this.isConnected) {
            console.warn('⚠️ Redis não conectado, operação ignorada');
            return false;
        }

        try {
            const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
            
            if (expireInSeconds) {
                await this.client.setEx(key, expireInSeconds, serializedValue);
            } else {
                await this.client.set(key, serializedValue);
            }
            
            console.log(`📝 Redis SET: ${key}`);
            return true;
        } catch (error) {
            console.error('❌ Erro Redis SET:', error);
            return false;
        }
    }

    async get(key) {
        if (!this.isConnected) {
            console.warn('⚠️ Redis não conectado, retornando null');
            return null;
        }

        try {
            const value = await this.client.get(key);
            console.log(`📖 Redis GET: ${key} = ${value ? 'found' : 'not found'}`);
            
            if (!value) return null;

            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        } catch (error) {
            console.error('❌ Erro Redis GET:', error);
            return null;
        }
    }

    async del(key) {
        if (!this.isConnected) {
            console.warn('⚠️ Redis não conectado, operação ignorada');
            return false;
        }

        try {
            const result = await this.client.del(key);
            console.log(`🗑️ Redis DEL: ${key}`);
            return result;
        } catch (error) {
            console.error('❌ Erro Redis DEL:', error);
            return false;
        }
    }

    async exists(key) {
        if (!this.isConnected) return false;

        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (error) {
            console.error('❌ Erro Redis EXISTS:', error);
            return false;
        }
    }

    async expire(key, seconds) {
        if (!this.isConnected) return false;

        try {
            const result = await this.client.expire(key, seconds);
            console.log(`⏰ Redis EXPIRE: ${key} (${seconds}s)`);
            return result;
        } catch (error) {
            console.error('❌ Erro Redis EXPIRE:', error);
            return false;
        }
    }

    async flushAll() {
        if (!this.isConnected) return false;

        try {
            await this.client.flushAll();
            console.log('🧹 Redis FLUSHALL executado');
            return true;
        } catch (error) {
            console.error('❌ Erro Redis FLUSHALL:', error);
            return false;
        }
    }

    // Cache com TTL automático
    async cache(key, fetchFunction, ttlSeconds = 300) {
        const cachedValue = await this.get(key);
        
        if (cachedValue !== null) {
            console.log(`💾 Cache HIT: ${key}`);
            return cachedValue;
        }

        console.log(`🔄 Cache MISS: ${key}, buscando dados...`);
        const freshValue = await fetchFunction();
        
        if (freshValue !== null && freshValue !== undefined) {
            await this.set(key, freshValue, ttlSeconds);
        }

        return freshValue;
    }

    // Testar conexão
    async testConnection() {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            
            await this.client.ping();
            console.log('✅ Redis conectado e funcionando');
            return true;
        } catch (error) {
            console.error('❌ Erro ao testar Redis:', error.message);
            return false;
        }
    }
}

module.exports = new RedisClient();
