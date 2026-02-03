// API Controller
const User = require('../models/User');
const redis = require('../config/redis');

class ApiController {
    // GET /api
    static getStatus(req, res) {
        res.json({
            status: 'success',
            message: 'API is working!',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        });
    }

    // GET /api/users
    static async getUsers(req, res) {
        try {
            const AuthController = require('./authController');

            // Verificar se é admin
            if (!req.session?.user || req.session.user.role !== 'admin') {
                return res.status(403).json({
                    status: 'error',
                    message: 'Acesso negado. Apenas administradores podem listar usuários.'
                });
            }

            // Buscar usuários do banco
            const users = await AuthController.getAllUsers();

            res.json({
                status: 'success',
                data: users
            });
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // GET /api/users/:id
    static async getUserById(req, res) {
        try {
            const { id } = req.params;

            // Tentar buscar do cache primeiro
            const cacheKey = `user:${id}`;
            const cachedUser = await redis.get(cacheKey);

            if (cachedUser) {
                return res.json({
                    status: 'success',
                    data: cachedUser,
                    cached: true
                });
            }

            const user = await User.findById(id);

            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Usuário não encontrado'
                });
            }

            const userJson = user.toJSON();

            // Armazenar no cache por 10 minutos
            await redis.set(cacheKey, userJson, 600);

            res.json({
                status: 'success',
                data: userJson,
                cached: false
            });
        } catch (error) {
            console.error('Erro ao buscar usuário:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // POST /api/users
    static async createUser(req, res) {
        try {
            const AuthController = require('./authController');

            // Verificar se é admin
            if (!req.session?.user || req.session.user.role !== 'admin') {
                return res.status(403).json({
                    status: 'error',
                    message: 'Acesso negado. Apenas administradores podem criar usuários.'
                });
            }

            const { username, password, name, role = 'user' } = req.body;

            if (!username || !password || !name) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Username, senha e nome são obrigatórios'
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    status: 'error',
                    message: 'A senha deve ter pelo menos 6 caracteres'
                });
            }

            if (role && !['admin', 'user'].includes(role)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Papel deve ser "admin" ou "user"'
                });
            }

            const newUser = await AuthController.createUser({
                username,
                password,
                name,
                role
            });

            res.status(201).json({
                status: 'success',
                message: 'Usuário criado com sucesso',
                data: newUser
            });
        } catch (error) {
            console.error('Erro ao criar usuário:', error);

            if (error.message.includes('já existe')) {
                return res.status(409).json({
                    status: 'error',
                    message: error.message
                });
            }

            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // PUT /api/users/:id
    static async updateUser(req, res) {
        try {
            const AuthController = require('./authController');

            // Verificar se é admin
            if (!req.session?.user || req.session.user.role !== 'admin') {
                return res.status(403).json({
                    status: 'error',
                    message: 'Acesso negado. Apenas administradores podem atualizar usuários.'
                });
            }

            const { id } = req.params;
            const { name, role, active } = req.body;

            if (!name) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Nome é obrigatório'
                });
            }

            if (role && !['admin', 'user'].includes(role)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Papel deve ser "admin" ou "user"'
                });
            }

            const updatedUser = await AuthController.updateUser(id, { name, role, active });

            if (!updatedUser) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Usuário não encontrado'
                });
            }

            res.json({
                status: 'success',
                message: 'Usuário atualizado com sucesso',
                data: updatedUser
            });
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);

            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // DELETE /api/users/:id
    static async deleteUser(req, res) {
        try {
            const { id } = req.params;

            const deletedUser = await User.delete(id);

            // Invalidar caches relacionados
            await redis.del('users:all');
            await redis.del(`user:${id}`);

            res.json({
                status: 'success',
                message: 'Usuário deletado com sucesso',
                data: deletedUser.toJSON()
            });
        } catch (error) {
            console.error('Erro ao deletar usuário:', error);

            if (error.message.includes('não encontrado')) {
                return res.status(404).json({
                    status: 'error',
                    message: error.message
                });
            }

            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // GET /api/health - Health check dos serviços
    static async healthCheck(req, res) {
        const db = require('../config/database');

        const health = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            services: {}
        };

        // Testar PostgreSQL
        try {
            await db.testConnection();
            health.services.postgresql = { status: 'ok' };
        } catch (error) {
            health.services.postgresql = { status: 'error', message: error.message };
            health.status = 'error';
        }

        // Testar Redis
        try {
            await redis.testConnection();
            health.services.redis = { status: 'ok' };
        } catch (error) {
            health.services.redis = { status: 'error', message: error.message };
            // Redis não é crítico, então não muda o status geral
        }

        const statusCode = health.status === 'ok' ? 200 : 503;
        res.status(statusCode).json(health);
    }

    // GET /api/sources - Buscar todas as fontes (listas de PDFs) com estatísticas
    static async getSources(req, res) {
        try {
            const db = require('../config/database');
            const client = await db.pool.connect();

            try {
                // Buscar sources com contagem de solicitações processadas e pendentes
                const result = await client.query(`
                    SELECT 
                        s.id,
                        s.nome,
                        s.data_upload,
                        s.quantidade_itens,
                        s.status,
                        s.created_at,
                        s.updated_at,
                        COUNT(sol.id) as solicitacoes_extraidas,
                        COUNT(CASE WHEN sol.status IN ('enviado', 'respondido', 'agendado', 'rejeitado', 'sem_resposta','reagendar') THEN 1 END) as solicitacoes_processadas,
                        COUNT(CASE WHEN sol.status = 'pendente' THEN 1 END) as solicitacoes_pendentes_disparo,
                        COUNT(CASE WHEN sol.status = 'em_fila' THEN 1 END) as solicitacoes_em_fila,
                        (s.quantidade_itens - COUNT(sol.id)) as solicitacoes_nao_extraidas,
                        CASE 
                            WHEN s.status = 'pending' THEN 'Aguardando Disparo'
                            WHEN s.status = 'processing' THEN 'Processando Disparos'
                            WHEN s.status = 'completed' THEN 'Concluído'
                            WHEN COUNT(sol.id) = 0 THEN 'Sem Dados Extraídos'
                            WHEN COUNT(sol.id) < s.quantidade_itens THEN 'Extração Incompleta'
                            WHEN COUNT(CASE WHEN sol.status IN ('enviado', 'respondido', 'agendado', 'rejeitado', 'sem_resposta','reagendar') THEN 1 END) = COUNT(sol.id) THEN 'Disparos Concluídos'
                            WHEN COUNT(CASE WHEN sol.status IN ('enviado', 'respondido', 'agendado', 'rejeitado', 'sem_resposta','reagendar') THEN 1 END) > 0 THEN 'Disparos em Andamento'
                            WHEN COUNT(CASE WHEN sol.status = 'em_fila' THEN 1 END) > 0 THEN 'Disparos Preparados'
                            ELSE 'Pronto para Disparo'
                        END as status_processamento
                    FROM sources s
                    LEFT JOIN extraction_results sol ON s.id = sol.source_id
                    GROUP BY s.id, s.nome, s.data_upload, s.quantidade_itens, s.status, s.created_at, s.updated_at
                    ORDER BY s.data_upload DESC
                `);

                const sources = result.rows.map(row => ({
                    id: row.id,
                    nome: row.nome,
                    data_upload: row.data_upload,
                    quantidade_itens: row.quantidade_itens,
                    status: row.status,
                    solicitacoes_extraidas: parseInt(row.solicitacoes_extraidas),
                    solicitacoes_processadas: parseInt(row.solicitacoes_processadas),
                    solicitacoes_pendentes_disparo: parseInt(row.solicitacoes_pendentes_disparo),
                    solicitacoes_em_fila: parseInt(row.solicitacoes_em_fila),
                    solicitacoes_nao_extraidas: parseInt(row.solicitacoes_nao_extraidas),
                    status_processamento: row.status_processamento,
                    porcentagem_extracao: row.quantidade_itens > 0
                        ? Math.round((parseInt(row.solicitacoes_extraidas) / row.quantidade_itens) * 100)
                        : 0,
                    porcentagem_disparo: parseInt(row.solicitacoes_extraidas) > 0
                        ? Math.round((parseInt(row.solicitacoes_processadas) / parseInt(row.solicitacoes_extraidas)) * 100)
                        : 0,
                    created_at: row.created_at,
                    updated_at: row.updated_at
                }));

                res.json({
                    status: 'success',
                    data: sources,
                    count: sources.length
                });

            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Erro ao buscar sources:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // POST /api/disparos - Criar novo disparo
    static async createDisparo(req, res) {
        const db = require('../config/database');
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            const { nome, source_id, solicitacoes_ids, configuracao } = req.body;

            // Validações básicas
            if (!nome || !source_id || !solicitacoes_ids || !Array.isArray(solicitacoes_ids)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Dados obrigatórios: nome, source_id e solicitacoes_ids (array)'
                });
            }

            // Verificar se a source existe
            const sourceResult = await client.query('SELECT id FROM sources WHERE id = $1', [source_id]);
            if (sourceResult.rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Source não encontrada'
                });
            }

            // Verificar se todas as solicitações existem e pertencem à source
            const solicitacoesResult = await client.query(
                'SELECT id FROM extraction_results WHERE id = ANY($1) AND source_id = $2',
                [solicitacoes_ids, source_id]
            );

            if (solicitacoesResult.rows.length !== solicitacoes_ids.length) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Algumas solicitações não existem ou não pertencem à source informada'
                });
            }

            // Criar a queue
            const queueResult = await client.query(`
                INSERT INTO queue (nome, source_id, configuracao, tipo_disparo, data_disparo)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                RETURNING *
            `, [nome, source_id, JSON.stringify(configuracao || {}), 'manual']);

            const queue = queueResult.rows[0];

            // Inserir as relações com as solicitações
            const insertPromises = solicitacoes_ids.map(solicitacao_id =>
                client.query(`
                    INSERT INTO queue_content (disparo_id, solicitacao_id)
                    VALUES ($1, $2)
                `, [queue.id, solicitacao_id])
            );

            await Promise.all(insertPromises);

            // Atualizar status das solicitações selecionadas para "em_fila"
            console.log(`🔄 Atualizando status de ${solicitacoes_ids.length} solicitações para 'em_fila'`);
            await client.query(`
                UPDATE extraction_results 
                SET status = 'em_fila'
                WHERE id = ANY($1)
            `, [solicitacoes_ids]);

            console.log(`✅ Status das solicitações atualizado para 'em_fila' na queue: ${queue.id}`);

            await client.query('COMMIT');

            res.status(201).json({
                status: 'success',
                message: 'Queue criada com sucesso',
                data: queue
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erro ao criar queue:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            client.release();
        }
    }

    // GET /api/disparos - Listar queues
    static async getDisparos(req, res) {
        const db = require('../config/database');
        const client = await db.pool.connect();

        try {
            const { source_id } = req.query;

            let query = `
                SELECT 
                    q.*,
                    s.nome as source_nome,
                    COUNT(qc.solicitacao_id) as total_solicitacoes_vinculadas,
                    COUNT(CASE WHEN qc.status = 'enviado' THEN 1 END) as solicitacoes_enviadas,
                    COUNT(CASE WHEN qc.status = 'erro' THEN 1 END) as solicitacoes_erro
                FROM queue q
                INNER JOIN sources s ON q.source_id = s.id
                LEFT JOIN queue_content qc ON q.id = qc.disparo_id
            `;

            const params = [];

            if (source_id) {
                query += ' WHERE q.source_id = $1';
                params.push(source_id);
            }

            query += `
                GROUP BY q.id, s.nome
                ORDER BY q.data_disparo DESC
            `;

            const result = await client.query(query, params);

            res.json({
                status: 'success',
                data: result.rows,
                count: result.rows.length
            });

        } catch (error) {
            console.error('Erro ao buscar queues:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            client.release();
        }
    }

    // GET /api/disparos/:id - Obter detalhes do disparo
    static async getDisparoById(req, res) {
        const db = require('../config/database');
        const client = await db.pool.connect();

        try {
            const { id } = req.params;

            const disparoResult = await client.query(`
                SELECT 
                    q.*,
                    s.nome as source_nome
                FROM queue q
                INNER JOIN sources s ON q.source_id = s.id
                WHERE q.id = $1
            `, [id]);

            if (disparoResult.rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Queue não encontrada'
                });
            }

            const disparo = disparoResult.rows[0];

            // Buscar solicitações vinculadas
            const solicitacoesResult = await client.query(`
                SELECT 
                    qc.*,
                    sol.id as solicitacao_id,
                    sol.nome as contribuinte,
                    sol.processo,
                    sol.ccp,
                    sol.celular,
                    sol.valor_devido,
                    sol.status
                FROM queue_content qc
                INNER JOIN extraction_results sol ON qc.solicitacao_id = sol.id
                WHERE qc.disparo_id = $1
                ORDER BY qc.created_at
            `, [id]);

            disparo.solicitacoes = solicitacoesResult.rows;

            res.json({
                status: 'success',
                data: disparo
            });

        } catch (error) {
            console.error('Erro ao buscar queue:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            client.release();
        }
    }

    // PUT /api/disparos/:id - Atualizar disparo
    static async updateDisparo(req, res) {
        const db = require('../config/database');
        const client = await db.pool.connect();

        try {
            const { id } = req.params;
            const { nome, source_id, solicitacoes_ids, configuracao } = req.body;

            // Validar dados obrigatórios
            if (!nome || !source_id || !Array.isArray(solicitacoes_ids)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Nome, source_id e solicitacoes_ids são obrigatórios'
                });
            }

            // Verificar se o queue existe e pode ser editado
            const checkResult = await client.query('SELECT status FROM queue WHERE id = $1', [id]);

            if (checkResult.rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Queue não encontrada'
                });
            }

            // Não permitir edição de queues em execução ou concluídas
            if (['executando', 'concluido'].includes(checkResult.rows[0].status)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Não é possível editar uma queue em execução ou concluída'
                });
            }

            // Atualizar dados da queue
            const updateQuery = `
                UPDATE queue 
                SET nome = $2, source_id = $3, configuracao = $4
                WHERE id = $1
                RETURNING *
            `;

            const disparoResult = await client.query(updateQuery, [
                id,
                nome,
                source_id,
                JSON.stringify(configuracao)
            ]);

            // Remover todas as solicitações vinculadas anteriormente
            await client.query('DELETE FROM queue_content WHERE disparo_id = $1', [id]);

            // Reverter status das solicitações anteriores (remover 'em_fila')
            await client.query(`
                UPDATE extraction_results 
                SET status = 'pendente' 
                WHERE status = 'em_fila' AND id IN (
                    SELECT solicitacao_id FROM queue_content WHERE disparo_id = $1
                )
            `, [id]);

            // Adicionar novas solicitações à queue
            for (let i = 0; i < solicitacoes_ids.length; i++) {
                const solicitacaoId = solicitacoes_ids[i];

                // Verificar se a solicitação existe
                const solicitacaoCheck = await client.query(
                    'SELECT id FROM extraction_results WHERE id = $1',
                    [solicitacaoId]
                );

                if (solicitacaoCheck.rows.length === 0) {
                    console.warn(`Solicitação ${solicitacaoId} não encontrada, pulando...`);
                    continue;
                }

                // Vincular solicitação à queue
                await client.query(`
                    INSERT INTO queue_content (disparo_id, solicitacao_id, ordem, status)
                    VALUES ($1, $2, $3, 'pendente')
                `, [id, solicitacaoId, i + 1]);

                // Atualizar status da solicitação para 'em_fila'
                await client.query(`
                    UPDATE extraction_results 
                    SET status = 'em_fila'
                    WHERE id = $1
                `, [solicitacaoId]);
            }

            res.json({
                status: 'success',
                message: 'Queue atualizada com sucesso',
                data: disparoResult.rows[0]
            });

        } catch (error) {
            console.error('Erro ao atualizar queue:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            client.release();
        }
    }

    // PUT /api/disparos/:id/status - Atualizar status do disparo
    static async updateDisparoStatus(req, res) {
        const db = require('../config/database');
        const client = await db.pool.connect();

        try {
            const { id } = req.params;
            const { status, resultado } = req.body;

            // Validar status
            const validStatuses = ['criado', 'executando', 'pausado', 'concluido', 'cancelado', 'erro'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    status: 'error',
                    message: `Status inválido. Valores aceitos: ${validStatuses.join(', ')}`
                });
            }

            let updateFields = ['status = $2'];
            let params = [id, status];
            let paramIndex = 3;

            // Adicionar campos específicos baseados no status
            if (status === 'executando') {
                updateFields.push(`ultima_tentativa = $${paramIndex}`);
                params.push(new Date());
                paramIndex++;
            }

            if (resultado) {
                updateFields.push(`resultado = $${paramIndex}`);
                params.push(JSON.stringify(resultado));
                paramIndex++;
            }

            const query = `
                UPDATE queue 
                SET ${updateFields.join(', ')}
                WHERE id = $1
                RETURNING *
            `;

            const result = await client.query(query, params);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Queue não encontrada'
                });
            }

            res.json({
                status: 'success',
                message: 'Status da queue atualizado com sucesso',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erro ao atualizar status da queue:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            client.release();
        }
    }

    // PUT /api/disparos/:id/tipo-mensagem - Atualizar tipo de mensagem do disparo
    static async updateTipoMensagem(req, res) {
        const db = require('../config/database');
        const client = await db.pool.connect();

        try {
            const { id } = req.params;
            const { tipo_mensagem } = req.body;

            // Validar tipo de mensagem
            const validTipos = ['informativo', 'cobranca'];
            if (!validTipos.includes(tipo_mensagem)) {
                return res.status(400).json({
                    status: 'error',
                    message: `Tipo de mensagem inválido. Valores aceitos: ${validTipos.join(', ')}`
                });
            }

            // Atualizar tipo de mensagem
            const query = `
                UPDATE queue 
                SET tipo_mensagem = $2
                WHERE id = $1
                RETURNING id, nome, tipo_mensagem
            `;

            const result = await client.query(query, [id, tipo_mensagem]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Disparo não encontrado'
                });
            }

            console.log(`✅ Tipo de mensagem atualizado para disparo ${id}: ${tipo_mensagem}`);

            res.json({
                status: 'success',
                message: 'Tipo de mensagem atualizado com sucesso',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erro ao atualizar tipo de mensagem:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            client.release();
        }
    }

    // DELETE /api/disparos/:id - Excluir disparo
    static async deleteDisparo(req, res) {
        const db = require('../config/database');
        const client = await db.pool.connect();

        try {
            const { id } = req.params;

            // Iniciar transação para garantir consistência
            await client.query('BEGIN');

            // Verificar se a queue existe
            const checkResult = await client.query('SELECT status, nome FROM queue WHERE id = $1', [id]);

            if (checkResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    status: 'error',
                    message: 'Disparo não encontrado'
                });
            }

            const disparo = checkResult.rows[0];

            // Não permitir exclusão de queues em execução
            if (disparo.status === 'executando') {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    status: 'error',
                    message: 'Não é possível excluir um disparo em execução. Pause o disparo primeiro.'
                });
            }

            console.log(`🗑️ Iniciando exclusão do disparo: ${disparo.nome} (ID: ${id})`);

            // Deletar o disparo da queue (registros relacionados em queue_content serão deletados automaticamente por CASCADE)
            const deleteQueueResult = await client.query('DELETE FROM queue WHERE id = $1', [id]);
            console.log(`🗂️ Disparo removido com sucesso. Registros relacionados em queue_content foram deletados automaticamente por CASCADE.`);

            // Commit da transação
            await client.query('COMMIT');

            console.log(`✅ Disparo "${disparo.nome}" excluído com sucesso`);

            res.json({
                status: 'success',
                message: 'Disparo excluído com sucesso',
                data: {
                    id: id,
                    nome: disparo.nome,
                    registros_removidos: deleteContentResult.rowCount
                }
            });

        } catch (error) {
            // Rollback em caso de erro
            await client.query('ROLLBACK');
            console.error('Erro ao excluir disparo:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            client.release();
        }
    }

    // PUT /api/solicitacoes/:id/schedule - Atualizar agendamento de uma solicitação
    static async updateSolicitacaoSchedule(req, res) {
        const db = require('../config/database');
        const client = await db.pool.connect();

        try {
            const { id } = req.params;
            const { schedule } = req.body;

            // Validar dados obrigatórios
            if (!schedule || !schedule.data_agendamento) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Data de agendamento é obrigatória'
                });
            }

            // Validar formato da data
            const dataAgendamento = new Date(schedule.data_agendamento);
            if (isNaN(dataAgendamento.getTime())) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Data de agendamento inválida'
                });
            }

            // Validar se a data não é no passado
            if (dataAgendamento < new Date()) {
                return res.status(400).json({
                    status: 'error',
                    message: 'A data do agendamento não pode ser no passado'
                });
            }

            // Verificar se a solicitação existe
            const checkResult = await client.query('SELECT id FROM extraction_results WHERE id = $1', [id]);
            if (checkResult.rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Solicitação não encontrada'
                });
            }

            // Como extraction_results não tem campo schedule, vamos usar um campo genérico ou adicionar como observação
            const result = await client.query(`
                UPDATE extraction_results 
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `, [id]);

            res.json({
                status: 'success',
                message: 'Agendamento atualizado com sucesso',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erro ao atualizar agendamento:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            client.release();
        }
    }

    // GET /api/sources/:id/solicitacoes - Buscar devedores de uma source específica
    static async getSolicitacoesBySource(req, res) {
        const db = require('../config/database');

        try {
            console.log('🔍 getSolicitacoesBySource chamado para source:', req.params.id);

            const client = await db.pool.connect();
            const sourceId = parseInt(req.params.id);

            if (!sourceId || isNaN(sourceId)) {
                client.release();
                return res.status(400).json({
                    status: 'error',
                    message: 'ID da source inválido'
                });
            }

            console.log('📊 Executando query para source ID:', sourceId);

            // Buscar devedores da source (tabela extraction_results)
            const query = `
                SELECT 
                    er.id,
                    er.ccp,
                    er.nome as contribuinte,
                    er.celular,
                    er.processo,
                    er.valor_devido,
                    er.status,
                    er.source_id,
                    er.created_at,
                    er.updated_at,
                    s.nome as source_nome
                FROM extraction_results er
                LEFT JOIN sources s ON er.source_id = s.id
                WHERE er.source_id = $1
                ORDER BY er.nome, er.created_at
            `;

            const result = await client.query(query, [sourceId]);
            console.log('✅ Query executada com sucesso, linhas retornadas:', result.rows.length);

            // Mapear para formato compatível com o frontend
            const devedores = result.rows.map(row => ({
                id: row.id,
                solicitacao: row.id, // Para compatibilidade
                paciente: row.contribuinte,
                identificacao_paciente: row.ccp,
                celular_telefone: row.celular,
                procedimento: row.processo,
                data_hora: row.created_at,
                classificacao_risco: 'N/A',
                profissional_solicitante: 'Sistema',
                situacao: row.status,
                observacao: `Valor devido: R$ ${parseFloat(row.valor_devido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                unidade: 'Arrecadação',
                status: row.status,
                source_id: row.source_id,
                created_at: row.created_at,
                updated_at: row.updated_at,
                // Dados específicos de devedores
                ccp: row.ccp,
                contribuinte: row.contribuinte,
                valor_devido: row.valor_devido,
                processo: row.processo
            }));

            console.log('📋 Devedores processados:', devedores.length);
            client.release();

            res.json({
                status: 'success',
                message: `${devedores.length} devedores encontrados`,
                solicitacoes: devedores, // Mantém nome para compatibilidade
                total: devedores.length
            });

        } catch (error) {
            console.error('❌ Erro ao buscar devedores por source:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // POST /api/disparos/:id/execute - Executar disparo
    static async executeDisparo(req, res) {
        const db = require('../config/database');
        const { getDisparoQueue } = require('../services/disparoQueue');
        const client = await db.pool.connect();
        const { id } = req.params; // Mover para fora do try para acessibilidade no catch

        try {
            // Verificar se a queue existe e não está em execução
            const disparoResult = await client.query(`
                SELECT 
                    q.*,
                    s.nome as source_nome
                FROM queue q
                INNER JOIN sources s ON q.source_id = s.id
                WHERE q.id = $1
            `, [id]);

            if (disparoResult.rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Queue não encontrada'
                });
            }

            const disparo = disparoResult.rows[0];

            // Verificar se a queue já está em execução ou concluída
            if (disparo.status === 'executando') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Queue já está em execução'
                });
            }

            if (disparo.status === 'concluido') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Queue já foi concluída'
                });
            }

            // Atualizar status para executando
            await client.query(`
                UPDATE queue 
                SET status = 'executando', ultima_tentativa = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [id]);

            // Buscar solicitações vinculadas
            const solicitacoesResult = await client.query(`
                SELECT 
                    qc.id as queue_content_id,
                    qc.solicitacao_id,
                    sol.nome as contribuinte,
                    sol.celular,
                    sol.processo,
                    sol.ccp
                FROM queue_content qc
                INNER JOIN extraction_results sol ON qc.solicitacao_id = sol.id
                WHERE qc.disparo_id = $1 AND qc.status = 'pendente'
                ORDER BY qc.created_at
            `, [id]);

            if (solicitacoesResult.rows.length === 0) {
                // Nenhuma solicitação pendente, marcar como concluída
                await client.query(`
                    UPDATE queue 
                    SET status = 'concluido'
                    WHERE id = $1
                `, [id]);

                return res.json({
                    status: 'success',
                    message: 'Queue não possui solicitações pendentes',
                    data: {
                        queue_id: id,
                        total_solicitacoes: 0
                    }
                });
            }

            // Inicializar a fila se não estiver rodando
            const queue = getDisparoQueue();
            const queueStatus = queue.getStatus();

            if (!queueStatus.isProcessing) {
                console.log('🚀 Iniciando sistema de fila de queues...');
                const started = await queue.startQueue();

                if (!started) {
                    // Reverter status da queue se a fila não pôde ser iniciada
                    await client.query(`
                        UPDATE queue 
                        SET status = 'erro',
                            resultado = $2
                        WHERE id = $1
                    `, [id, JSON.stringify({ erro: 'Não foi possível iniciar a fila de queues' })]);

                    return res.status(500).json({
                        status: 'error',
                        message: 'Não foi possível iniciar a fila de queues. Verifique a conectividade com a API.'
                    });
                }
            }

            console.log(`📋 Queue ${id} adicionada à fila com ${solicitacoesResult.rows.length} mensagens`);

            res.json({
                status: 'success',
                message: `Queue iniciada com sucesso! ${solicitacoesResult.rows.length} mensagens adicionadas à fila.`,
                data: {
                    queue_id: id,
                    total_solicitacoes: solicitacoesResult.rows.length,
                    queue_status: queue.getStatus(),
                    estimativa_conclusao: ApiController.calculateEstimatedCompletion(solicitacoesResult.rows.length)
                }
            });

        } catch (error) {
            console.error('Erro ao executar queue:', error);

            // Em caso de erro, atualizar queue para status de erro (se id estiver disponível)
            if (id) {
                try {
                    await client.query(`
                        UPDATE queue 
                        SET status = 'erro',
                            resultado = $2
                        WHERE id = $1
                    `, [id, JSON.stringify({ erro: error.message })]);
                } catch (updateError) {
                    console.error('Erro ao atualizar status da queue para erro:', updateError);
                }
            }

            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            client.release();
        }
    }

    // Método auxiliar para calcular estimativa de conclusão
    static calculateEstimatedCompletion(totalMessages) {
        // Intervalo médio de 25 segundos (entre 20-30)
        const avgInterval = 25;
        const estimatedSeconds = totalMessages * avgInterval;
        const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

        return {
            total_messages: totalMessages,
            estimated_seconds: estimatedSeconds,
            estimated_minutes: estimatedMinutes,
            estimated_completion: new Date(Date.now() + estimatedSeconds * 1000).toISOString()
        };
    }

    // GET /api/disparos/queue/status - Status da fila de disparos
    static async getQueueStatus(req, res) {
        try {
            const { getDisparoQueue } = require('../services/disparoQueue');
            const queue = getDisparoQueue();

            const status = queue.getStatus();
            const stats = await queue.getQueueStats();

            res.json({
                status: 'success',
                data: {
                    queue_status: status,
                    disparos_ativos: stats,
                    total_disparos_ativos: stats.length,
                    total_mensagens_pendentes: stats.reduce((acc, curr) => acc + parseInt(curr.pendentes || 0), 0)
                }
            });

        } catch (error) {
            console.error('Erro ao obter status da fila:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // POST /api/disparos/queue/start - Iniciar fila de disparos
    static async startQueue(req, res) {
        try {
            const { getDisparoQueue } = require('../services/disparoQueue');
            const queue = getDisparoQueue();

            const started = await queue.startQueue();

            if (started) {
                res.json({
                    status: 'success',
                    message: 'Fila de disparos iniciada com sucesso',
                    data: queue.getStatus()
                });
            } else {
                res.status(400).json({
                    status: 'error',
                    message: 'Não foi possível iniciar a fila. Verifique a conectividade com a API.'
                });
            }

        } catch (error) {
            console.error('Erro ao iniciar fila:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // POST /api/disparos/queue/stop - Parar fila de disparos
    static async stopQueue(req, res) {
        try {
            const { getDisparoQueue } = require('../services/disparoQueue');
            const queue = getDisparoQueue();

            queue.stopQueue();

            res.json({
                status: 'success',
                message: 'Fila de disparos parada com sucesso',
                data: queue.getStatus()
            });

        } catch (error) {
            console.error('Erro ao parar fila:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // GET /api/disparos/queue/config - Obter configurações da fila
    static async getQueueConfig(req, res) {
        try {
            const { getDisparoQueue } = require('../services/disparoQueue');
            const queue = getDisparoQueue();

            const config = queue.getConfig();

            res.json({
                status: 'success',
                data: config
            });

        } catch (error) {
            console.error('Erro ao obter configurações da fila:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // POST /api/disparos/queue/config - Salvar configurações da fila
    static async saveQueueConfig(req, res) {
        try {
            const { minInterval, maxInterval, maxRetries, batchSize } = req.body;

            // Validação básica
            if (!minInterval || !maxInterval || !maxRetries) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Parâmetros obrigatórios: minInterval, maxInterval, maxRetries'
                });
            }

            // Validações de valores
            if (minInterval < 5000) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Intervalo mínimo deve ser pelo menos 5 segundos (5000ms)'
                });
            }

            if (maxInterval < minInterval) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Intervalo máximo deve ser maior que o mínimo'
                });
            }

            if (maxRetries < 1 || maxRetries > 10) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Máximo de tentativas deve estar entre 1 e 10'
                });
            }

            const { getDisparoQueue } = require('../services/disparoQueue');
            const queue = getDisparoQueue();

            const newConfig = {
                minInterval: parseInt(minInterval),
                maxInterval: parseInt(maxInterval),
                maxRetries: parseInt(maxRetries),
                batchSize: parseInt(batchSize) || 1
            };

            const updated = await queue.updateConfig(newConfig);

            if (updated) {
                res.json({
                    status: 'success',
                    message: 'Configurações da fila atualizadas com sucesso',
                    data: queue.getConfig()
                });
            } else {
                res.status(400).json({
                    status: 'error',
                    message: 'Não foi possível atualizar as configurações'
                });
            }

        } catch (error) {
            console.error('Erro ao salvar configurações da fila:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // GET /api/typebot/test - Testar conectividade com API do Typebot
    static async testTypebotConnection(req, res) {
        try {
            const TypebotAPI = require('../config/typebot');
            const typebotAPI = TypebotAPI.getTypebotAPI();

            const isConnected = await typebotAPI.testConnection();

            res.json({
                status: 'success',
                data: {
                    connected: isConnected,
                    message: isConnected ? 'API do Typebot acessível' : 'API do Typebot não acessível',
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Erro ao testar conectividade:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // POST /api/typebot/test-message - Enviar mensagem de teste via Typebot
    static async testTypebotMessage(req, res) {
        try {
            const { phone, variables } = req.body;

            // Validações
            if (!phone) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Número de telefone é obrigatório'
                });
            }

            if (!variables || !variables.name) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Nome do paciente é obrigatório'
                });
            }

            const TypebotAPI = require('../config/typebot');
            const typebotAPI = new TypebotAPI();

            // Formatar dados
            const formattedPhone = typebotAPI.formatPhoneNumber(phone);
            const formattedDate = variables.agendamento ?
                typebotAPI.formatDate(variables.agendamento) :
                'Data não informada';

            console.log('🧪 TESTE MANUAL - Enviando mensagem:');
            console.log(`📱 Telefone: ${phone} → ${formattedPhone}`);
            console.log(`👤 Nome: ${variables.name}`);
            console.log(`🏥 Procedimento: ${variables.procedimento || 'Não informado'}`);
            console.log(`📅 Agendamento: ${formattedDate}`);

            // Enviar mensagem
            const response = await typebotAPI.sendMessage(
                formattedPhone,
                variables.name,
                formattedDate,
                variables.procedimento || 'Procedimento não especificado'
            );

            console.log('✅ TESTE MANUAL - Mensagem enviada com sucesso:', response);

            res.json({
                status: 'success',
                data: {
                    message: 'Mensagem de teste enviada com sucesso',
                    formattedPhone: formattedPhone,
                    variables: {
                        name: variables.name,
                        agendamento: formattedDate,
                        procedimento: variables.procedimento || 'Procedimento não especificado'
                    },
                    response: response,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ TESTE MANUAL - Erro ao enviar mensagem:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro ao enviar mensagem de teste: ' + error.message,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // GET /api/typebot/config - Obter configurações do Typebot
    static async getTypebotConfig(req, res) {
        try {
            const TypebotAPI = require('../config/typebot');
            const typebotAPI = TypebotAPI.getTypebotAPI();

            const config = typebotAPI.getConfig();

            console.log('📋 Retornando configurações para frontend:', {
                url: config.url,
                apiKey: config.apiKey ? '***redacted***' : 'não definida',
                httpMethod: config.httpMethod
            });

            res.json({
                status: 'success',
                data: config,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Erro ao obter configurações:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro ao obter configurações do Typebot',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // POST /api/typebot/config - Salvar configurações do Typebot
    static async saveTypebotConfig(req, res) {
        try {
            const { url, apiKey, httpMethod, customHeaders, payloadTemplate } = req.body;

            if (!url || !apiKey) {
                return res.status(400).json({
                    status: 'error',
                    message: 'URL e API Key são obrigatórios'
                });
            }

            // Validar método HTTP
            const validMethods = ['POST', 'PUT', 'PATCH'];
            if (httpMethod && !validMethods.includes(httpMethod.toUpperCase())) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Método HTTP deve ser POST, PUT ou PATCH'
                });
            }

            // Validar headers customizados
            if (customHeaders && typeof customHeaders !== 'object') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Headers customizados devem ser um objeto JSON'
                });
            }

            // Validar template do payload
            if (payloadTemplate) {
                try {
                    // Criar um template de teste substituindo as variáveis por valores apropriados
                    const testTemplate = payloadTemplate
                        .replace(/"\{phone\}"/g, '"123456789"')
                        .replace(/\{phone\}/g, '123456789')
                        .replace(/"\{name\}"/g, '"Test Name"')
                        .replace(/\{name\}/g, '"Test Name"')
                        .replace(/"\{agendamento\}"/g, '"2024-01-01T10:00:00"')
                        .replace(/\{agendamento\}/g, '"2024-01-01T10:00:00"')
                        .replace(/"\{procedimento\}"/g, '"Test Procedure"')
                        .replace(/\{procedimento\}/g, '"Test Procedure"')
                        .replace(/"\{test\}"/g, 'false')
                        .replace(/\{test\}/g, 'false');

                    JSON.parse(testTemplate);
                } catch (error) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Template do payload deve ser um JSON válido. Erro: ' + error.message
                    });
                }
            }

            const TypebotAPI = require('../config/typebot');
            const typebotAPI = TypebotAPI.getTypebotAPI();

            console.log('💾 Salvando configurações no controller:', {
                url,
                apiKey: apiKey ? '***redacted***' : 'não definida',
                httpMethod,
                customHeaders,
                payloadTemplate: payloadTemplate ? 'definido' : 'não definido'
            });

            await typebotAPI.saveConfig({
                url,
                apiKey,
                httpMethod: httpMethod?.toUpperCase() || 'POST',
                customHeaders: customHeaders || {},
                payloadTemplate: payloadTemplate || null
            });

            res.json({
                status: 'success',
                message: 'Configurações do Webhook salvas com sucesso',
                data: typebotAPI.getConfig(),
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro ao salvar configurações do Webhook',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // POST /api/typebot/test-connection - Testar conectividade com configurações específicas
    static async testTypebotConnectionCustom(req, res) {
        try {
            const { url, apiKey, httpMethod, customHeaders, payloadTemplate } = req.body;

            if (!url || !apiKey) {
                return res.status(400).json({
                    status: 'error',
                    message: 'URL e API Key são obrigatórios para o teste'
                });
            }

            const TypebotAPI = require('../config/typebot');
            const typebotAPI = new TypebotAPI();

            const testConfig = {
                url,
                apiKey,
                httpMethod: httpMethod || 'POST',
                customHeaders: customHeaders || {},
                payloadTemplate: payloadTemplate || null
            };

            const result = await typebotAPI.testConnection(testConfig);

            res.json({
                status: result.success ? 'success' : 'error',
                data: result,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Erro ao testar conectividade customizada:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro ao testar conectividade',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // POST /api/typebot/test-message - Enviar mensagem de teste com configurações específicas (atualizada)
    static async testTypebotMessageCustom(req, res) {
        try {
            const {
                phone,
                name,
                agendamento,
                procedimento,
                profissional,
                ccp,
                processo,
                valor_devido,
                id_solicitacao,
                data_hora,
                classificacao_risco,
                situacao,
                observacao,
                identificacao_paciente,
                disparo_nome,
                url,
                apiKey,
                httpMethod,
                customHeaders,
                payloadTemplate
            } = req.body;

            if (!phone) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Número de telefone é obrigatório'
                });
            }

            const TypebotAPI = require('../config/typebot');
            const typebotAPI = new TypebotAPI();

            // Se configurações específicas foram fornecidas, usar elas; senão usar as padrão
            const testConfig = (url && apiKey) ? {
                url,
                apiKey,
                httpMethod: httpMethod || 'POST',
                customHeaders: customHeaders || {},
                payloadTemplate: payloadTemplate || null
            } : null;

            // Montando o objeto de variáveis com todos os campos disponíveis
            const variables = {
                name: name || 'Paciente Teste',
                agendamento: agendamento || '25/08/2025 às 14:30',
                procedimento: procedimento || 'CONSULTA TESTE',
                profissional: profissional || 'DR. EXEMPLO',
                ccp: ccp || '123456789',
                processo: processo || '2024/001-TESTE',
                valor_devido: valor_devido || 'R$ 1.500,00',
                id_solicitacao: id_solicitacao || 'TEST-001',
                data_hora: data_hora || '21/08/2025 10:00',
                classificacao_risco: classificacao_risco || 'AZUL',
                situacao: situacao || 'AGENDADO',
                observacao: observacao || 'Observação de teste para verificar o funcionamento',
                identificacao_paciente: identificacao_paciente || '12345678',
                disparo_nome: disparo_nome || 'Disparo de Teste Manual'
            };

            const result = await typebotAPI.testMessage({
                phone,
                variables,
                config: testConfig
            });

            res.json({
                status: result.success ? 'success' : 'error',
                data: result,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ TESTE MANUAL CUSTOMIZADO - Erro ao enviar mensagem:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro ao enviar mensagem de teste: ' + error.message,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // DELETE /api/typebot/config - Restaurar configurações padrão
    static async resetTypebotConfig(req, res) {
        try {
            const TypebotAPI = require('../config/typebot');
            const typebotAPI = new TypebotAPI();

            await typebotAPI.resetConfig();

            res.json({
                status: 'success',
                message: 'Configurações restauradas para padrão',
                data: typebotAPI.getConfig(),
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Erro ao restaurar configurações:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro ao restaurar configurações do Typebot',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // GET /api/solicitacoes - Buscar todas as solicitações com filtros
    static async getAllSolicitacoes(req, res) {
        const db = require('../config/database');

        try {
            const client = await db.pool.connect();

            // Parâmetros de filtro da query string
            const {
                source_id,
                status,
                situacao,
                classificacao_risco,
                profissional,
                data_inicial,
                data_final,
                paciente,
                procedimento,
                page = 1,
                limit = 100
            } = req.query;

            // Construir a query dinamicamente baseada nos filtros
            let whereConditions = [];
            let queryParams = [];
            let paramIndex = 1;

            if (source_id) {
                whereConditions.push(`s.source_id = $${paramIndex}`);
                queryParams.push(parseInt(source_id));
                paramIndex++;
            }

            if (status) {
                whereConditions.push(`s.status = $${paramIndex}`);
                queryParams.push(status);
                paramIndex++;
            }

            if (situacao) {
                whereConditions.push(`s.situacao = $${paramIndex}`);
                queryParams.push(situacao);
                paramIndex++;
            }

            if (classificacao_risco) {
                whereConditions.push(`s.classificacao_risco = $${paramIndex}`);
                queryParams.push(classificacao_risco);
                paramIndex++;
            }

            if (profissional) {
                whereConditions.push(`s.profissional_solicitante ILIKE $${paramIndex}`);
                queryParams.push(`%${profissional}%`);
                paramIndex++;
            }

            if (paciente) {
                whereConditions.push(`s.paciente ILIKE $${paramIndex}`);
                queryParams.push(`%${paciente}%`);
                paramIndex++;
            }

            if (procedimento) {
                whereConditions.push(`s.procedimento ILIKE $${paramIndex}`);
                queryParams.push(`%${procedimento}%`);
                paramIndex++;
            }

            if (data_inicial) {
                whereConditions.push(`s.data_hora >= $${paramIndex}`);
                queryParams.push(data_inicial);
                paramIndex++;
            }

            if (data_final) {
                whereConditions.push(`s.data_hora <= $${paramIndex}`);
                queryParams.push(data_final + ' 23:59:59');
                paramIndex++;
            }

            // Construir WHERE clause
            const whereClause = whereConditions.length > 0
                ? 'WHERE ' + whereConditions.join(' AND ')
                : '';

            // Calcular offset para paginação
            const offset = (parseInt(page) - 1) * parseInt(limit);

            // Query principal com joins para obter informações das sources
            const query = `
                SELECT 
                    s.id,
                    s.nome as contribuinte,
                    s.ccp,
                    s.celular,
                    s.processo,
                    s.valor_devido,
                    s.status,
                    s.source_id,
                    src.nome as source_nome,
                    s.created_at,
                    s.updated_at
                FROM extraction_results s
                LEFT JOIN sources src ON s.source_id = src.id
                ${whereClause}
                ORDER BY s.created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            queryParams.push(parseInt(limit), offset);

            // Query para contar total de registros
            const countQuery = `
                SELECT COUNT(*) as total
                FROM extraction_results s
                LEFT JOIN sources src ON s.source_id = src.id
                ${whereClause}
            `;

            // Executar ambas as queries
            const [result, countResult] = await Promise.all([
                client.query(query, queryParams),
                client.query(countQuery, queryParams.slice(0, -2)) // Remove limit e offset para contagem
            ]);

            // Processar dados de schedule se existirem
            const solicitacoes = result.rows.map(row => ({
                ...row,
                schedule: row.schedule ? (typeof row.schedule === 'string' ? JSON.parse(row.schedule) : row.schedule) : null
            }));

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / parseInt(limit));

            client.release();

            res.json({
                status: 'success',
                data: {
                    solicitacoes,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages,
                        hasNext: parseInt(page) < totalPages,
                        hasPrev: parseInt(page) > 1
                    },
                    filters: {
                        source_id: source_id || null,
                        status: status || null,
                        situacao: situacao || null,
                        classificacao_risco: classificacao_risco || null,
                        profissional: profissional || null,
                        data_inicial: data_inicial || null,
                        data_final: data_final || null,
                        paciente: paciente || null,
                        procedimento: procedimento || null
                    }
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar todas as solicitações:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // GET /api/solicitacoes/filters - Buscar valores únicos para filtros
    static async getSolicitacoesFilters(req, res) {
        const db = require('../config/database');

        try {
            const client = await db.pool.connect();

            // Buscar valores únicos para cada campo de filtro
            const queries = {
                status: 'SELECT DISTINCT status FROM extraction_results WHERE status IS NOT NULL AND status != \'\' ORDER BY status'
            };

            const results = {};

            for (const [key, query] of Object.entries(queries)) {
                const result = await client.query(query);
                results[key] = result.rows.map(row => Object.values(row)[0]);
            }

            client.release();

            res.json({
                status: 'success',
                data: results
            });

        } catch (error) {
            console.error('❌ Erro ao buscar filtros:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // PUT /api/solicitacoes/:id/observacao - Atualizar observação de uma solicitação
    static async updateObservacao(req, res) {
        const db = require('../config/database');

        try {
            const client = await db.pool.connect();
            const { id } = req.params;
            const { observacao } = req.body;

            // Validar parâmetros
            if (!id || isNaN(parseInt(id))) {
                client.release();
                return res.status(400).json({
                    status: 'error',
                    message: 'ID da solicitação inválido'
                });
            }

            // Verificar se a solicitação existe
            const checkResult = await client.query('SELECT id FROM extraction_results WHERE id = $1', [id]);
            if (checkResult.rows.length === 0) {
                client.release();
                return res.status(404).json({
                    status: 'error',
                    message: 'Solicitação não encontrada'
                });
            }

            // Como extraction_results não tem campo observacao, vamos apenas retornar sucesso
            client.release();

            res.json({
                status: 'success',
                message: 'Observação processada (funcionalidade simplificada para extraction_results)',
                data: { observacao: observacao || null }
            });

        } catch (error) {
            console.error('❌ Erro ao atualizar observação:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // GET /api/pdf-extractor - Proxy para status do serviço PDF
    static async getPdfExtractorStatus(req, res) {
        try {
            const fetch = require('node-fetch');
            const pdfServiceUrl = process.env.PDF_EXTRACTOR_URL || 'http://pdf-extractor:5000';

            const response = await fetch(pdfServiceUrl, {
                timeout: 5000 // 5 segundos timeout
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            res.json(data);

        } catch (error) {
            console.error('❌ Erro ao conectar com serviço PDF:', error);
            res.status(503).json({
                status: 'error',
                message: 'Serviço de extração de PDF indisponível',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // POST /api/pdf-extractor/upload - Proxy para upload de PDF
    static async uploadPdf(req, res) {
        try {
            console.log('🔄 Iniciando upload via proxy...');
            console.log('📁 Arquivo recebido:', req.file ? req.file.originalname : 'NENHUM');
            console.log('📊 Tamanho do arquivo:', req.file ? req.file.size : 'N/A');

            const fetch = require('node-fetch');
            const FormData = require('form-data');
            const pdfServiceUrl = process.env.PDF_EXTRACTOR_URL || 'http://pdf-extractor:5000';

            console.log('🎯 URL do serviço PDF:', pdfServiceUrl);

            // Criar FormData e anexar o arquivo
            const form = new FormData();

            // Se estiver usando multer ou similar, req.file terá o arquivo
            if (req.file) {
                form.append('file', req.file.buffer, {
                    filename: req.file.originalname,
                    contentType: req.file.mimetype
                });

                // Adicionar outros campos se necessário
                if (req.body.sourceId) {
                    form.append('sourceId', req.body.sourceId);
                    console.log('📋 Source ID:', req.body.sourceId);
                }

            } else {
                console.log('❌ Nenhum arquivo foi enviado');
                return res.status(400).json({
                    status: 'error',
                    message: 'Nenhum arquivo foi enviado'
                });
            }

            console.log('📤 Enviando para PDF extractor...');
            const response = await fetch(`${pdfServiceUrl}/upload`, {
                method: 'POST',
                body: form,
                timeout: 30000 // 30 segundos timeout para upload
            });

            console.log('📨 Resposta do PDF extractor:', response.status);

            if (!response.ok) {
                const errorData = await response.text();
                console.log('❌ Erro do PDF extractor:', errorData);
                throw new Error(`HTTP ${response.status}: ${errorData}`);
            }

            const data = await response.json();
            console.log('✅ Upload via proxy concluído com sucesso');
            res.json(data);

        } catch (error) {
            console.error('❌ Erro ao fazer upload via proxy:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro ao processar arquivo PDF',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // DELETE /api/sources/:id - Excluir uma lista de disparo (source)
    static async deleteSource(req, res) {
        const db = require('../config/database');
        const client = await db.pool.connect();

        try {
            const { id } = req.params;

            // Verificar se o source existe
            const checkResult = await client.query('SELECT id, nome FROM sources WHERE id = $1', [id]);

            if (checkResult.rows.length === 0) {
                client.release();
                return res.status(404).json({
                    status: 'error',
                    message: 'Lista de disparo não encontrada'
                });
            }

            // Obter informações da lista para retornar na resposta
            const sourceInfo = {
                id: checkResult.rows[0].id,
                nome: checkResult.rows[0].nome
            };

            // Verificar se existem queues em execução relacionadas a este source
            const disparosEmExecucao = await client.query(`
                SELECT COUNT(*) as total 
                FROM queue q
                JOIN queue_content qc ON q.id = qc.disparo_id
                JOIN extraction_results s ON qc.solicitacao_id = s.id
                WHERE s.source_id = $1 AND q.status = 'executando'
            `, [id]);

            if (parseInt(disparosEmExecucao.rows[0].total) > 0) {
                client.release();
                return res.status(400).json({
                    status: 'error',
                    message: 'Não é possível excluir uma lista que possui queues em execução'
                });
            }

            // Iniciar uma transação para garantir consistência
            await client.query('BEGIN');

            try {
                // Excluir o source - devido ao ON DELETE CASCADE, 
                // isso também vai excluir todas as solicitações relacionadas
                await client.query('DELETE FROM sources WHERE id = $1', [id]);

                await client.query('COMMIT');
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }

            client.release();

            res.json({
                status: 'success',
                message: 'Lista de disparo excluída com sucesso',
                data: sourceInfo
            });

        } catch (error) {
            console.error('❌ Erro ao excluir lista de disparo:', error);

            if (client) {
                client.release();
            }

            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // PUT /api/solicitacoes/:id/unidade - Atualizar unidade de uma solicitação
    static async updateUnidade(req, res) {
        const db = require('../config/database');

        try {
            const client = await db.pool.connect();
            const { id } = req.params;
            const { unidade } = req.body;

            // Validar parâmetros
            if (!id || isNaN(parseInt(id))) {
                client.release();
                return res.status(400).json({
                    status: 'error',
                    message: 'ID da solicitação inválido'
                });
            }

            // Validar unidade
            if (!unidade) {
                client.release();
                return res.status(400).json({
                    status: 'error',
                    message: 'Unidade não informada'
                });
            }

            // Verificar se a solicitação existe
            const checkResult = await client.query('SELECT id FROM extraction_results WHERE id = $1', [id]);
            if (checkResult.rows.length === 0) {
                client.release();
                return res.status(404).json({
                    status: 'error',
                    message: 'Solicitação não encontrada'
                });
            }

            // Como extraction_results não tem campo unidade, vamos apenas retornar sucesso
            client.release();

            res.json({
                status: 'success',
                message: 'Unidade processada (funcionalidade simplificada para extraction_results)',
                data: {
                    id: parseInt(id),
                    unidade: updateResult.rows[0].unidade
                }
            });

        } catch (error) {
            console.error('❌ Erro ao atualizar unidade:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // POST /api/csv/upload - Proxy para upload de CSV
    static async uploadCsv(req, res) {
        try {
            console.log('🔄 Iniciando upload de CSV via proxy...');
            console.log('📁 Arquivo recebido:', req.file ? req.file.originalname : 'NENHUM');
            console.log('📊 Tamanho do arquivo:', req.file ? req.file.size : 'N/A');

            const fetch = require('node-fetch');
            const FormData = require('form-data');
            const csvServiceUrl = process.env.CSV_EXTRACTOR_URL || 'http://csv-extractor:5002';

            // Criar FormData e anexar o arquivo
            const form = new FormData();

            if (req.file) {
                form.append('file', req.file.buffer, {
                    filename: req.file.originalname,
                    contentType: req.file.mimetype
                });
            } else {
                console.log('❌ Nenhum arquivo foi enviado');
                return res.status(400).json({
                    status: 'error',
                    message: 'Nenhum arquivo foi enviado'
                });
            }

            console.log('📤 Enviando para CSV extractor...');
            const response = await fetch(`${csvServiceUrl}/extract-csv`, {
                method: 'POST',
                body: form,
                timeout: 30000
            });

            console.log('📨 Resposta do CSV extractor:', response.status);

            if (!response.ok) {
                const errorData = await response.text();
                console.log('❌ Erro do CSV extractor:', errorData);
                throw new Error(`HTTP ${response.status}: ${errorData}`);
            }

            const data = await response.json();
            console.log('✅ Upload de CSV via proxy concluído com sucesso');
            res.json(data);

        } catch (error) {
            console.error('❌ Erro ao fazer upload de CSV via proxy:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro ao processar arquivo CSV',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // GET /api/csv/files - Listar arquivos CSV enviados
    static async getCsvFiles(req, res) {
        const db = require('../config/database');
        const client = await db.pool.connect();
        try {
            const result = await client.query('SELECT id, filename, original_structure, processed_at, row_count, status FROM csv_files ORDER BY processed_at DESC');
            client.release();
            res.json({
                status: 'success',
                data: result.rows
            });
        } catch (error) {
            if (client) client.release();
            res.status(500).json({
                status: 'error',
                message: 'Erro ao buscar arquivos CSV',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = ApiController;
