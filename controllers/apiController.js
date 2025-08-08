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
            // Tentar buscar do cache primeiro
            const cacheKey = 'users:all';
            const cachedUsers = await redis.get(cacheKey);

            if (cachedUsers) {
                return res.json({
                    status: 'success',
                    data: cachedUsers,
                    cached: true
                });
            }

            // Buscar do banco de dados
            const users = await User.findAll();
            const usersJson = users.map(user => user.toJSON());

            // Armazenar no cache por 5 minutos
            await redis.set(cacheKey, usersJson, 300);

            res.json({
                status: 'success',
                data: usersJson,
                cached: false
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
            const { name, email } = req.body;

            if (!name || !email) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Nome e email são obrigatórios'
                });
            }

            const newUser = await User.create({ name, email });

            // Invalidar cache de todos os usuários
            await redis.del('users:all');

            res.status(201).json({
                status: 'success',
                message: 'Usuário criado com sucesso',
                data: newUser.toJSON()
            });
        } catch (error) {
            console.error('Erro ao criar usuário:', error);

            if (error.message.includes('Email já está em uso')) {
                return res.status(409).json({
                    status: 'error',
                    message: error.message
                });
            }

            if (error.message.includes('Dados inválidos')) {
                return res.status(400).json({
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
            const { id } = req.params;
            const { name, email } = req.body;

            if (!name || !email) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Nome e email são obrigatórios'
                });
            }

            const updatedUser = await User.update(id, { name, email });

            // Invalidar caches relacionados
            await redis.del('users:all');
            await redis.del(`user:${id}`);

            res.json({
                status: 'success',
                message: 'Usuário atualizado com sucesso',
                data: updatedUser.toJSON()
            });
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);

            if (error.message.includes('não encontrado')) {
                return res.status(404).json({
                    status: 'error',
                    message: error.message
                });
            }

            if (error.message.includes('Dados inválidos')) {
                return res.status(400).json({
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
                    LEFT JOIN solicitacoes sol ON s.id = sol.source_id
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

            const { nome, descricao, source_id, solicitacoes_ids, configuracao } = req.body;

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
                'SELECT id FROM solicitacoes WHERE id = ANY($1) AND source_id = $2',
                [solicitacoes_ids, source_id]
            );

            if (solicitacoesResult.rows.length !== solicitacoes_ids.length) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Algumas solicitações não existem ou não pertencem à source informada'
                });
            }

            // Criar o disparo
            const disparoResult = await client.query(`
                INSERT INTO disparos (nome, descricao, source_id, total_solicitacoes, configuracao)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [nome, descricao, source_id, solicitacoes_ids.length, configuracao || {}]);

            const disparo = disparoResult.rows[0];

            // Inserir as relações com as solicitações
            const insertPromises = solicitacoes_ids.map(solicitacao_id =>
                client.query(`
                    INSERT INTO disparo_solicitacoes (disparo_id, solicitacao_id)
                    VALUES ($1, $2)
                `, [disparo.id, solicitacao_id])
            );

            await Promise.all(insertPromises);

            // Atualizar status das solicitações selecionadas para "em_fila"
            console.log(`🔄 Atualizando status de ${solicitacoes_ids.length} solicitações para 'em_fila'`);
            await client.query(`
                UPDATE solicitacoes 
                SET status = 'em_fila', updated_at = CURRENT_TIMESTAMP
                WHERE id = ANY($1)
            `, [solicitacoes_ids]);

            console.log(`✅ Status das solicitações atualizado para 'em_fila' no disparo: ${disparo.id}`);

            await client.query('COMMIT');

            res.status(201).json({
                status: 'success',
                message: 'Disparo criado com sucesso',
                data: disparo
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erro ao criar disparo:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            client.release();
        }
    }

    // GET /api/disparos - Listar disparos
    static async getDisparos(req, res) {
        const db = require('../config/database');
        const client = await db.pool.connect();

        try {
            const { source_id } = req.query;

            let query = `
                SELECT 
                    d.*,
                    s.nome as source_nome,
                    COUNT(ds.solicitacao_id) as total_solicitacoes_vinculadas,
                    COUNT(CASE WHEN ds.status = 'enviado' THEN 1 END) as solicitacoes_enviadas,
                    COUNT(CASE WHEN ds.status = 'erro' THEN 1 END) as solicitacoes_erro
                FROM disparos d
                INNER JOIN sources s ON d.source_id = s.id
                LEFT JOIN disparo_solicitacoes ds ON d.id = ds.disparo_id
            `;

            const params = [];

            if (source_id) {
                query += ' WHERE d.source_id = $1';
                params.push(source_id);
            }

            query += `
                GROUP BY d.id, s.nome
                ORDER BY d.data_criacao DESC
            `;

            const result = await client.query(query, params);

            res.json({
                status: 'success',
                data: result.rows,
                count: result.rows.length
            });

        } catch (error) {
            console.error('Erro ao buscar disparos:', error);
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
                    d.*,
                    s.nome as source_nome
                FROM disparos d
                INNER JOIN sources s ON d.source_id = s.id
                WHERE d.id = $1
            `, [id]);

            if (disparoResult.rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Disparo não encontrado'
                });
            }

            const disparo = disparoResult.rows[0];

            // Buscar solicitações vinculadas
            const solicitacoesResult = await client.query(`
                SELECT 
                    ds.*,
                    sol.id as solicitacao_id,
                    sol.solicitacao,  -- Incluímos a coluna solicitacao explicitamente (varchar)
                    sol.paciente,
                    sol.procedimento,
                    sol.situacao,
                    sol.schedule,
                    sol.classificacao_risco,
                    sol.identificacao_paciente,
                    sol.profissional_solicitante,
                    sol.observacao,
                    sol.status  -- Incluir o status da tabela solicitacoes
                FROM disparo_solicitacoes ds
                INNER JOIN solicitacoes sol ON ds.solicitacao_id = sol.id
                WHERE ds.disparo_id = $1
                ORDER BY ds.created_at
            `, [id]);

            disparo.solicitacoes = solicitacoesResult.rows;

            res.json({
                status: 'success',
                data: disparo
            });

        } catch (error) {
            console.error('Erro ao buscar disparo:', error);
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
            const { nome, descricao, source_id, solicitacoes_ids, configuracao } = req.body;

            // Validar dados obrigatórios
            if (!nome || !source_id || !Array.isArray(solicitacoes_ids)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Nome, source_id e solicitacoes_ids são obrigatórios'
                });
            }

            // Verificar se o disparo existe e pode ser editado
            const checkResult = await client.query('SELECT status FROM disparos WHERE id = $1', [id]);

            if (checkResult.rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Disparo não encontrado'
                });
            }

            // Não permitir edição de disparos em execução ou concluídos
            if (['executando', 'concluido'].includes(checkResult.rows[0].status)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Não é possível editar um disparo em execução ou concluído'
                });
            }

            // Atualizar dados do disparo
            const updateQuery = `
                UPDATE disparos 
                SET nome = $2, descricao = $3, source_id = $4, configuracao = $5, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;

            const disparoResult = await client.query(updateQuery, [
                id,
                nome,
                descricao,
                source_id,
                JSON.stringify(configuracao)
            ]);

            // Remover todas as solicitações vinculadas anteriormente
            await client.query('DELETE FROM disparo_solicitacoes WHERE disparo_id = $1', [id]);

            // Reverter status das solicitações anteriores (remover 'em_fila')
            await client.query(`
                UPDATE solicitacoes 
                SET status = 'pendente' 
                WHERE status = 'em_fila' AND id IN (
                    SELECT solicitacao_id FROM disparo_solicitacoes WHERE disparo_id = $1
                )
            `, [id]);

            // Adicionar novas solicitações ao disparo
            for (let i = 0; i < solicitacoes_ids.length; i++) {
                const solicitacaoId = solicitacoes_ids[i];

                // Verificar se a solicitação existe
                const solicitacaoCheck = await client.query(
                    'SELECT id FROM solicitacoes WHERE id = $1',
                    [solicitacaoId]
                );

                if (solicitacaoCheck.rows.length === 0) {
                    console.warn(`Solicitação ${solicitacaoId} não encontrada, pulando...`);
                    continue;
                }

                // Vincular solicitação ao disparo
                await client.query(`
                    INSERT INTO disparo_solicitacoes (disparo_id, solicitacao_id, ordem, status)
                    VALUES ($1, $2, $3, 'pendente')
                `, [id, solicitacaoId, i + 1]);

                // Atualizar status da solicitação para 'em_fila'
                await client.query(`
                    UPDATE solicitacoes 
                    SET status = 'em_fila'
                    WHERE id = $1
                `, [solicitacaoId]);
            }

            res.json({
                status: 'success',
                message: 'Disparo atualizado com sucesso',
                data: disparoResult.rows[0]
            });

        } catch (error) {
            console.error('Erro ao atualizar disparo:', error);
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
            const validStatuses = ['criado', 'executando', 'concluido', 'cancelado', 'erro'];
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
                updateFields.push(`data_execucao = $${paramIndex}`);
                params.push(new Date());
                paramIndex++;
            } else if (status === 'concluido' || status === 'cancelado' || status === 'erro') {
                updateFields.push(`data_conclusao = $${paramIndex}`);
                params.push(new Date());
                paramIndex++;
            }

            if (resultado) {
                updateFields.push(`resultado = $${paramIndex}`);
                params.push(JSON.stringify(resultado));
                paramIndex++;
            }

            const query = `
                UPDATE disparos 
                SET ${updateFields.join(', ')}
                WHERE id = $1
                RETURNING *
            `;

            const result = await client.query(query, params);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Disparo não encontrado'
                });
            }

            res.json({
                status: 'success',
                message: 'Status do disparo atualizado com sucesso',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erro ao atualizar status do disparo:', error);
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

            // Verificar se o disparo existe
            const checkResult = await client.query('SELECT status FROM disparos WHERE id = $1', [id]);

            if (checkResult.rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Disparo não encontrado'
                });
            }

            // Não permitir exclusão de disparos em execução
            if (checkResult.rows[0].status === 'executando') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Não é possível excluir um disparo em execução'
                });
            }

            // Excluir o disparo (cascade irá excluir as relações automaticamente)
            await client.query('DELETE FROM disparos WHERE id = $1', [id]);

            res.json({
                status: 'success',
                message: 'Disparo excluído com sucesso'
            });

        } catch (error) {
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
            const checkResult = await client.query('SELECT id FROM solicitacoes WHERE id = $1', [id]);
            if (checkResult.rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Solicitação não encontrada'
                });
            }

            // Atualizar o agendamento
            const result = await client.query(`
                UPDATE solicitacoes 
                SET schedule = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `, [JSON.stringify(schedule), id]);

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

    // GET /api/sources/:id/solicitacoes - Buscar solicitações de uma source específica
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

            // Buscar solicitações da source com informações de agendamento
            const query = `
                SELECT 
                    s.id,
                    s.solicitacao,
                    s.paciente,
                    s.procedimento,
                    s.data_hora,
                    s.situacao,
                    s.profissional_solicitante,
                    s.classificacao_risco,
                    s.celular_telefone,
                    s.identificacao_paciente,
                    s.observacao,
                    s.status,
                    s.schedule,
                    s.source_id,
                    s.created_at,
                    s.updated_at
                FROM solicitacoes s
                WHERE s.source_id = $1
                ORDER BY s.paciente, s.data_hora
            `;

            const result = await client.query(query, [sourceId]);
            console.log('✅ Query executada com sucesso, linhas retornadas:', result.rows.length);

            // Processar dados de schedule se existirem
            const solicitacoes = result.rows.map(row => ({
                ...row,
                schedule: row.schedule ? (typeof row.schedule === 'string' ? JSON.parse(row.schedule) : row.schedule) : null
            }));

            console.log('📋 Solicitações processadas:', solicitacoes.length);
            client.release();

            res.json({
                status: 'success',
                message: `${solicitacoes.length} solicitações encontradas`,
                solicitacoes: solicitacoes,
                total: solicitacoes.length
            });

        } catch (error) {
            console.error('❌ Erro ao buscar solicitações por source:', error);
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
            // Verificar se o disparo existe e não está em execução
            const disparoResult = await client.query(`
                SELECT 
                    d.*,
                    s.nome as source_nome
                FROM disparos d
                INNER JOIN sources s ON d.source_id = s.id
                WHERE d.id = $1
            `, [id]);

            if (disparoResult.rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Disparo não encontrado'
                });
            }

            const disparo = disparoResult.rows[0];

            // Verificar se o disparo já está em execução ou concluído
            if (disparo.status === 'executando') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Disparo já está em execução'
                });
            }

            if (disparo.status === 'concluido') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Disparo já foi concluído'
                });
            }

            // Atualizar status para executando
            await client.query(`
                UPDATE disparos 
                SET status = 'executando', data_execucao = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [id]);

            // Buscar solicitações vinculadas
            const solicitacoesResult = await client.query(`
                SELECT 
                    ds.id as disparo_solicitacao_id,
                    ds.solicitacao_id,
                    sol.paciente,
                    sol.celular_telefone,
                    sol.procedimento,
                    sol.schedule
                FROM disparo_solicitacoes ds
                INNER JOIN solicitacoes sol ON ds.solicitacao_id = sol.id
                WHERE ds.disparo_id = $1 AND ds.status = 'pendente'
                ORDER BY ds.created_at
            `, [id]);

            if (solicitacoesResult.rows.length === 0) {
                // Nenhuma solicitação pendente, marcar como concluído
                await client.query(`
                    UPDATE disparos 
                    SET status = 'concluido', data_conclusao = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [id]);

                return res.json({
                    status: 'success',
                    message: 'Disparo não possui solicitações pendentes',
                    data: {
                        disparo_id: id,
                        total_solicitacoes: 0
                    }
                });
            }

            // Inicializar a fila se não estiver rodando
            const queue = getDisparoQueue();
            const queueStatus = queue.getStatus();

            if (!queueStatus.isProcessing) {
                console.log('🚀 Iniciando sistema de fila de disparos...');
                const started = await queue.startQueue();

                if (!started) {
                    // Reverter status do disparo se a fila não pôde ser iniciada
                    await client.query(`
                        UPDATE disparos 
                        SET status = 'erro', 
                            data_conclusao = CURRENT_TIMESTAMP,
                            resultado = $2
                        WHERE id = $1
                    `, [id, JSON.stringify({ erro: 'Não foi possível iniciar a fila de disparos' })]);

                    return res.status(500).json({
                        status: 'error',
                        message: 'Não foi possível iniciar a fila de disparos. Verifique a conectividade com a API.'
                    });
                }
            }

            console.log(`📋 Disparo ${id} adicionado à fila com ${solicitacoesResult.rows.length} mensagens`);

            res.json({
                status: 'success',
                message: `Disparo iniciado com sucesso! ${solicitacoesResult.rows.length} mensagens adicionadas à fila.`,
                data: {
                    disparo_id: id,
                    total_solicitacoes: solicitacoesResult.rows.length,
                    queue_status: queue.getStatus(),
                    estimativa_conclusao: ApiController.calculateEstimatedCompletion(solicitacoesResult.rows.length)
                }
            });

        } catch (error) {
            console.error('Erro ao executar disparo:', error);

            // Em caso de erro, atualizar disparo para status de erro (se id estiver disponível)
            if (id) {
                try {
                    await client.query(`
                        UPDATE disparos 
                        SET status = 'erro', 
                            data_conclusao = CURRENT_TIMESTAMP,
                            resultado = $2
                        WHERE id = $1
                    `, [id, JSON.stringify({ erro: error.message })]);
                } catch (updateError) {
                    console.error('Erro ao atualizar status do disparo para erro:', updateError);
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
            const { phone, variables, url, apiKey, httpMethod, customHeaders, payloadTemplate } = req.body;

            if (!phone || !variables) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Número de telefone e variáveis são obrigatórios'
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
                    s.solicitacao,
                    s.paciente,
                    s.procedimento,
                    s.data_hora,
                    s.situacao,
                    s.profissional_solicitante,
                    s.classificacao_risco,
                    s.celular_telefone,
                    s.identificacao_paciente,
                    s.observacao,
                    s.status,
                    s.schedule,
                    s.source_id,
                    src.nome as source_nome,
                    s.created_at,
                    s.updated_at
                FROM solicitacoes s
                LEFT JOIN sources src ON s.source_id = src.id
                ${whereClause}
                ORDER BY s.created_at DESC, s.data_hora DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            queryParams.push(parseInt(limit), offset);

            // Query para contar total de registros
            const countQuery = `
                SELECT COUNT(*) as total
                FROM solicitacoes s
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
                situacoes: 'SELECT DISTINCT situacao FROM solicitacoes WHERE situacao IS NOT NULL AND situacao != \'\' ORDER BY situacao',
                classificacoes_risco: 'SELECT DISTINCT classificacao_risco FROM solicitacoes WHERE classificacao_risco IS NOT NULL AND classificacao_risco != \'\' ORDER BY classificacao_risco',
                profissionais: 'SELECT DISTINCT profissional_solicitante FROM solicitacoes WHERE profissional_solicitante IS NOT NULL AND profissional_solicitante != \'\' ORDER BY profissional_solicitante',
                status: 'SELECT DISTINCT status FROM solicitacoes WHERE status IS NOT NULL AND status != \'\' ORDER BY status'
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
            const checkResult = await client.query('SELECT id FROM solicitacoes WHERE id = $1', [id]);
            if (checkResult.rows.length === 0) {
                client.release();
                return res.status(404).json({
                    status: 'error',
                    message: 'Solicitação não encontrada'
                });
            }

            // Atualizar observação
            const updateResult = await client.query(
                'UPDATE solicitacoes SET observacao = $1, updated_at = NOW() WHERE id = $2 RETURNING observacao',
                [observacao || null, id]
            );

            client.release();

            res.json({
                status: 'success',
                message: 'Observação atualizada com sucesso',
                data: {
                    id: parseInt(id),
                    observacao: updateResult.rows[0].observacao
                }
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
            const fetch = require('node-fetch');
            const FormData = require('form-data');
            const pdfServiceUrl = process.env.PDF_EXTRACTOR_URL || 'http://pdf-extractor:5000';

            // Criar FormData e anexar o arquivo
            const form = new FormData();

            // Se estiver usando multer ou similar, req.file terá o arquivo
            if (req.file) {
                form.append('file', req.file.buffer, {
                    filename: req.file.originalname,
                    contentType: req.file.mimetype
                });
            } else {
                return res.status(400).json({
                    status: 'error',
                    message: 'Nenhum arquivo foi enviado'
                });
            }

            const response = await fetch(`${pdfServiceUrl}/upload`, {
                method: 'POST',
                body: form,
                timeout: 30000 // 30 segundos timeout para upload
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorData}`);
            }

            const data = await response.json();
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
}

module.exports = ApiController;
