const TypebotAPI = require('../config/typebot');
const db = require('../config/database');
const fs = require('fs');
const path = require('path');

class DisparoQueue {
    constructor() {
        this.isProcessing = false;
        this.processingInterval = null;
        this.statusCheckInterval = null;
        this.typebotAPI = new TypebotAPI();
        this.configFilePath = path.join(__dirname, '..', 'config', 'queue-config.json');

        // Configurações padrão da fila
        this.config = {
            minInterval: 20000,  // 20 segundos mínimo
            maxInterval: 30000,  // 30 segundos máximo
            maxRetries: 3,       // Máximo de tentativas por mensagem
            batchSize: 1         // Processa uma mensagem por vez
        };

        // Carregar configurações salvas
        this.loadConfig();

        console.log('🎯 Sistema de fila de disparos inicializado');
        console.log(`⚙️ Configurações: Min ${this.config.minInterval / 1000}s, Max ${this.config.maxInterval / 1000}s, Tentativas ${this.config.maxRetries}`);
    }

    /**
     * Inicia o processamento da fila
     */
    async startQueue() {
        if (this.isProcessing) {
            console.log('⚠️ Fila já está sendo processada');
            return;
        }

        console.log('🚀 Iniciando processamento da fila de disparos');
        this.isProcessing = true;

        // Verifica conectividade com a API
        const isConnected = await this.typebotAPI.testConnection();
        if (!isConnected) {
            console.error('❌ Conexão falhou. Fila não será iniciada.');
            this.isProcessing = false;
            return false;
        }

        // Inicia o loop de processamento com intervalos dinâmicos
        this.scheduleNextProcess();

        // Inicia a verificação periódica do status dos disparos
        this.startStatusCheck();

        return true;
    }

    /**
     * Inicia a verificação periódica do status dos disparos
     */
    startStatusCheck() {
        // Cancela qualquer verificação anterior que possa estar ativa
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
        }

        // Verifica o status a cada 60 segundos
        this.statusCheckInterval = setInterval(async () => {
            console.log('🔄 Verificando status dos disparos...');
            await this.checkDisparoStatus();
        }, 60000); // 60 segundos

        // Executa uma verificação inicial imediata
        this.checkDisparoStatus();
    }

    /**
     * Agenda o próximo processamento com intervalo dinâmico
     */
    scheduleNextProcess() {
        if (!this.isProcessing) return;

        const interval = this.getRandomInterval();
        this.processingInterval = setTimeout(async () => {
            if (this.isProcessing) {
                await this.processNextBatch();
                this.scheduleNextProcess(); // Agenda o próximo
            }
        }, interval);
    }

    /**
     * Para o processamento da fila
     */
    stopQueue() {
        console.log('⏹️ Parando processamento da fila de disparos');
        this.isProcessing = false;

        if (this.processingInterval) {
            clearTimeout(this.processingInterval);
            this.processingInterval = null;
        }

        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    }

    /**
     * Processa o próximo lote de mensagens na fila
     */
    async processNextBatch() {
        if (!this.isProcessing) return;

        const client = await db.pool.connect();

        try {
            // Busca mensagens pendentes na fila, ordenadas por prioridade e data
            const query = `
                SELECT 
                    qc.id as queue_content_id,
                    qc.queue_id,
                    qc.solicitacao_id,
                    qc.tentativas,
                    sol.status,
                    sol.created_at,
                    sol.data,
                    sol.row_number,
                    q.nome as queue_nome,
                    q.configuracao
                FROM queue_content qc
                INNER JOIN extraction_results sol ON qc.solicitacao_id = sol.id
                INNER JOIN queue q ON qc.queue_id = q.id
                WHERE qc.status = 'pending' 
                AND q.status = 'executing'
                AND qc.tentativas < $1
                ORDER BY qc.created_at ASC
                LIMIT $2
            `;

            const result = await client.query(query, [this.config.maxRetries, this.config.batchSize]);

            if (result.rows.length === 0) {
                console.log('📭 Nenhuma mensagem pendente na fila.');
                // this.stopQueue();
                return;
            }

            console.log(`📨 Processando ${result.rows.length} mensagem(s) da fila`);

            // Processa cada mensagem
            for (const row of result.rows) {
                await this.processMessage(client, row);

                // Intervalo entre mensagens do mesmo lote (se houver mais de uma)
                if (result.rows.length > 1) {
                    await this.sleep(2000); // 2 segundos entre mensagens do mesmo lote
                }
            }

        } catch (error) {
            console.error('❌ Erro ao processar fila:', error);
        } finally {
            client.release();
        }
    }

    /**
     * Processa uma mensagem individual
     */
    async processMessage(client, messageData) {
        const {
            queue_content_id,
            queue_id,
            solicitacao_id,
            tentativas,
            queue_nome,
            data,
            configuracao
        } = messageData;
        console.log('DEBUG disparoQueue.js - configuracao.mensagem_personalizada:', configuracao.mensagem_personalizada);

        console.log(`📤 Processando mensagem para ${data.nome} (${data.telefone})`);

        try {
            // Incrementa tentativas
            await client.query(`
                UPDATE queue_content 
                SET tentativas = tentativas + 1 
                WHERE id = $1
            `, [queue_content_id]);

            // Formata o número de telefone
            const formattedPhone = this.typebotAPI.formatPhoneNumber(data.telefone);

            console.log(`📋 Dados do banco de dados para solicitação ${solicitacao_id}:`);
            console.log(`📋 Nome: "${data.nome}"`);
            console.log(`📋 Celular: "${data.telefone}"`);
            console.log(`📋 Tipo de Mensagem: "${configuracao.tipo_mensagem}"`);

            // Dados para o webhook
            // Prepara variáveis
            // Preparar a mensagem personalizada substituindo as variáveis

            // Usar a mensagem personalizada do usuário exatamente como foi digitada (texto livre):
            let mensagem = configuracao.mensagem_personalizada || '';

            // Substituir TODAS as {variaveis} encontradas no texto por seus valores (ou vazio se não existir no data)
            const placeholders = mensagem.match(/\{([^}]+)\}/g) || [];
            placeholders.forEach(tag => {
                const key = tag.replace(/[{}]/g, '');
                const valorSub = (data && typeof data === 'object' && data[key] !== undefined && data[key] !== null) ? data[key] : '';
                const regex = new RegExp(`\\{${key}\\}`, 'g');
                mensagem = mensagem.replace(regex, valorSub);
            });
            console.log('DEBUG disparoQueue.js - mensagem totalmente interpolada:', mensagem);

            const variables = {
                id: solicitacao_id,
                message: mensagem,
                // debug extra
                debug_msg: mensagem,
                name: data.nome || 'Nome',
                phone: formattedPhone || 'Telefone',
                data: data || '',
                queue_nome: queue_nome || ''
            };
            console.log('DEBUG disparoQueue.js - variables para sendMessage:', variables);

            console.log(`📋 Variáveis preparadas para webhook: ${JSON.stringify(variables, null, 2)}`);

            // Envia mensagem via Typebot
            const result = await this.typebotAPI.sendMessage(formattedPhone, variables);
            console.log('📤 Resultado do envio:', result);

            if (result.success) {
                // Sucesso - atualiza status
                await client.query(`
                    UPDATE queue_content 
                    SET status = 'delivered', 
                        data_envio = CURRENT_TIMESTAMP,
                        resposta_api = $2
                    WHERE id = $1
                `, [queue_content_id, JSON.stringify(result.data)]);

                // Atualiza status da solicitação principal
                await client.query(`
                    UPDATE extraction_results 
                    SET status = 'delivered'
                    WHERE id = $1
                `, [solicitacao_id]);

                console.log(`✅ Mensagem enviada com sucesso para ${data.nome} (${formattedPhone})`);

            } else {
                // Erro - verifica se deve tentar novamente
                const newTentativas = tentativas + 1;

                if (newTentativas >= this.config.maxRetries) {
                    // Máximo de tentativas atingido
                    await client.query(`
                        UPDATE queue_content 
                        SET status = 'error', 
                            ultimo_erro = $2,
                            resposta_api = $3
                        WHERE id = $1
                    `, [
                        queue_content_id,
                        `Falha após ${this.config.maxRetries} tentativas: ${result.error}`,
                        JSON.stringify(result)
                    ]);
                    console.error(`❌ Mensagem para ${data.nome} falhou definitivamente após ${this.config.maxRetries} tentativas`);
                    // Atualiza status da solicitação principal para erro
                    await client.query(`
                        UPDATE extraction_results
                        SET status = 'error'
                        WHERE id = $1
                    `, [solicitacao_id]);
                } else {
                    // Ainda pode tentar novamente
                    await client.query(`
                        UPDATE queue_content 
                        SET ultimo_erro = $2,
                            resposta_api = $3
                        WHERE id = $1
                    `, [
                        queue_content_id,
                        `Tentativa ${newTentativas}/${this.config.maxRetries}: ${result.error}`,
                        JSON.stringify(result)
                    ]);

                    console.warn(`⚠️ Falha temporária para ${data.nome} (tentativa ${newTentativas}/${this.config.maxRetries})`);
                }
            }

        } catch (error) {
            console.error(`❌ Erro ao processar mensagem para ${data.nome}:`, error);

            // Registra erro no banco
            await client.query(`
                UPDATE queue_content 
                SET status = 'error', 
                    ultimo_erro = $2
                WHERE id = $1
            `, [queue_content_id, `Erro interno: ${error.message}`]);
        }
    }

    /**
     * Verifica se há queues pendentes e atualiza status das queues concluídas
     */
    async checkDisparoStatus() {
        const client = await db.pool.connect();

        try {
            // Busca queues em execução
            const queuesEmExecucao = await client.query(`
                SELECT id, nome FROM queue WHERE status = 'executing'
            `);

            console.log(`🔍 Verificando status de ${queuesEmExecucao.rows.length} queues em execução`);

            for (const queue of queuesEmExecucao.rows) {
                // Verifica se todas as mensagens foram processadas
                const statusQuery = await client.query(`
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as enviados,
                        COUNT(CASE WHEN status = 'error' THEN 1 END) as erros,
                        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendentes
                    FROM queue_content 
                    WHERE queue_id = $1
                `, [queue.id]);

                const stats = statusQuery.rows[0];
                const processados = parseInt(stats.enviados) + parseInt(stats.erros);
                const total = parseInt(stats.total);
                const pendentes = parseInt(stats.pendentes);

                console.log(`📊 Queue ${queue.id} (${queue.nome}): Total=${total}, Enviados=${stats.enviados}, Erros=${stats.erros}, Pendentes=${pendentes}`);

                if (pendentes === 0 && total > 0) {
                    // Todas as mensagens foram processadas
                    const statusFinal = parseInt(stats.erros) === 0 ? 'done' : 'done';

                    const resultado = {
                        total_processadas: total,
                        sucessos: parseInt(stats.enviados),
                        erros: parseInt(stats.erros)
                    };

                    await client.query(`
                        UPDATE queue
                        SET status = $2,
                            resultado = $3
                        WHERE id = $1
                    `, [queue.id, statusFinal, JSON.stringify(resultado)]);

                    console.log(`🏁 Queue ${queue.id} concluída: ${stats.enviados} enviados, ${stats.erros} erros`);
                }
            }

            // Para a fila se não houver mais queues em execução
            if (queuesEmExecucao.rows.length === 0) {
                console.log('📭 Todas as queues foram concluídas. Parando a fila.');
                this.stopQueue();
            }

        } catch (error) {
            console.error('❌ Erro ao verificar status dos disparos:', error);
        } finally {
            client.release();
        }
    }

    /**
     * Formata a data do agendamento
     */
    formatScheduleDate(schedule) {
        console.log('📅 Formatando data do agendamento:', schedule);

        if (!schedule) {
            console.log('📅 Schedule não fornecido, retornando "Data não informada"');
            return 'Data não informada';
        }

        try {
            let scheduleObj;
            if (typeof schedule === 'string') {
                console.log('📅 Schedule é string, fazendo parse JSON');
                scheduleObj = JSON.parse(schedule);
            } else {
                console.log('📅 Schedule já é objeto');
                scheduleObj = schedule;
            }

            console.log('📅 Schedule object:', scheduleObj);

            if (scheduleObj && scheduleObj.data_agendamento) {
                console.log('📅 Data agendamento encontrada:', scheduleObj.data_agendamento);
                const formattedDate = this.typebotAPI.formatDate(scheduleObj.data_agendamento);
                console.log('📅 Data formatada:', formattedDate);
                return formattedDate;
            }

            console.log('📅 Não há data_agendamento no schedule object');
            return 'Data não informada';
        } catch (error) {
            console.warn('⚠️ Erro ao formatar data do agendamento:', error);
            return 'Data não informada';
        }
    }

    /**
     * Retorna um intervalo aleatório entre min e max
     */
    getRandomInterval() {
        const min = this.config.minInterval;
        const max = this.config.maxInterval;
        const interval = Math.floor(Math.random() * (max - min + 1)) + min;
        console.log(`⏱️ Próximo processamento em ${interval / 1000} segundos`);
        return interval;
    }

    /**
     * Pausa a execução por um determinado tempo
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retorna estatísticas da fila
     */
    async getQueueStats() {
        const client = await db.pool.connect();

        try {
            const stats = await client.query(`
                SELECT 
                    q.id as queue_id,
                    q.nome,
                    q.status as queue_status,
                    COUNT(qc.id) as total_mensagens,
                    COUNT(CASE WHEN qc.status = 'pending' THEN 1 END) as pendentes,
                    COUNT(CASE WHEN qc.status = 'enviado' THEN 1 END) as enviadas,
                    COUNT(CASE WHEN qc.status = 'erro' THEN 1 END) as erros
                FROM queue q
                LEFT JOIN queue_content qc ON q.id = qc.queue_id
                WHERE q.status IN ('executing', 'criado')
                GROUP BY q.id, q.nome, q.status
                ORDER BY q.data_disparo DESC
            `);

            return stats.rows;
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas da fila:', error);
            return [];
        } finally {
            client.release();
        }
    }

    /**
     * Retorna status da fila
     */
    getStatus() {
        return {
            isProcessing: this.isProcessing,
            hasInterval: !!this.processingInterval,
            config: this.config
        };
    }

    /**
     * Retorna configurações da fila
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Carrega configurações do arquivo
     */
    loadConfig() {
        try {
            if (fs.existsSync(this.configFilePath)) {
                const configData = fs.readFileSync(this.configFilePath, 'utf8');
                const savedConfig = JSON.parse(configData);

                // Mescla com configurações padrão
                this.config = {
                    ...this.config,
                    ...savedConfig
                };

                console.log('📂 Configurações da fila carregadas do arquivo');
            } else {
                console.log('📄 Arquivo de configurações não encontrado, usando padrões');
                this.saveConfig(); // Salva configurações padrão
            }
        } catch (error) {
            console.error('❌ Erro ao carregar configurações da fila:', error);
            console.log('🔄 Usando configurações padrão');
        }
    }

    /**
     * Salva configurações no arquivo
     */
    saveConfig() {
        try {
            const configDir = path.dirname(this.configFilePath);

            // Cria diretório se não existir
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            fs.writeFileSync(this.configFilePath, JSON.stringify(this.config, null, 2));
            console.log('💾 Configurações da fila salvas');
        } catch (error) {
            console.error('❌ Erro ao salvar configurações da fila:', error);
        }
    }

    /**
     * Atualiza configurações da fila
     */
    async updateConfig(newConfig) {
        try {
            const oldConfig = { ...this.config };

            // Atualiza configurações
            this.config = {
                ...this.config,
                ...newConfig
            };

            // Salva no arquivo
            this.saveConfig();

            // Se a fila está processando e o intervalo mudou, reinicia
            if (this.isProcessing && (
                oldConfig.minInterval !== this.config.minInterval ||
                oldConfig.maxInterval !== this.config.maxInterval
            )) {
                console.log('🔄 Reiniciando fila com novos intervalos...');
                this.stopQueue();

                // Pequena pausa antes de reiniciar
                await this.sleep(1000);
                await this.startQueue();
            }

            console.log(`⚙️ Configurações atualizadas: Min ${this.config.minInterval / 1000}s, Max ${this.config.maxInterval / 1000}s, Tentativas ${this.config.maxRetries}`);

            return true;
        } catch (error) {
            console.error('❌ Erro ao atualizar configurações:', error);
            return false;
        }
    }
}

// Instância singleton da fila
let queueInstance = null;

function getDisparoQueue() {
    if (!queueInstance) {
        queueInstance = new DisparoQueue();
    }
    return queueInstance;
}

module.exports = {
    DisparoQueue,
    getDisparoQueue
};
