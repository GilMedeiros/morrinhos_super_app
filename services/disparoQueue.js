const TypebotAPI = require('../config/typebot');
const db = require('../config/database');
const fs = require('fs');
const path = require('path');

class DisparoQueue {
    constructor() {
        this.isProcessing = false;
        this.processingInterval = null;
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
            console.error('❌ API do Typebot não está acessível. Fila não será iniciada.');
            this.isProcessing = false;
            return false;
        }

        // Inicia o loop de processamento com intervalos dinâmicos
        this.scheduleNextProcess();

        return true;
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
                    ds.id as disparo_solicitacao_id,
                    ds.disparo_id,
                    ds.solicitacao_id,
                    ds.tentativas,
                    sol.paciente,
                    sol.celular_telefone,
                    sol.procedimento,
                    sol.profissional_solicitante,
                    sol.schedule,
                    sol.solicitacao,
                    sol.data_hora,
                    sol.classificacao_risco,
                    sol.situacao,
                    sol.observacao,
                    sol.identificacao_paciente,
                    d.nome as disparo_nome
                FROM disparo_solicitacoes ds
                INNER JOIN solicitacoes sol ON ds.solicitacao_id = sol.id
                INNER JOIN disparos d ON ds.disparo_id = d.id
                WHERE ds.status = 'pendente' 
                AND d.status = 'executando'
                AND ds.tentativas < $1
                ORDER BY ds.created_at ASC
                LIMIT $2
            `;

            const result = await client.query(query, [this.config.maxRetries, this.config.batchSize]);

            if (result.rows.length === 0) {
                // console.log('📭 Nenhuma mensagem pendente na fila');
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
            disparo_solicitacao_id,
            disparo_id,
            solicitacao_id,
            tentativas,
            paciente,
            celular_telefone,
            procedimento,
            profissional_solicitante,
            schedule,
            disparo_nome,
            solicitacao,
            data_hora,
            classificacao_risco,
            situacao,
            observacao,
            identificacao_paciente
        } = messageData;

        console.log(`📤 Processando mensagem para ${paciente} (${celular_telefone})`);

        try {
            // Incrementa tentativas
            await client.query(`
                UPDATE disparo_solicitacoes 
                SET tentativas = tentativas + 1 
                WHERE id = $1
            `, [disparo_solicitacao_id]);

            // Formata o número de telefone
            const formattedPhone = this.typebotAPI.formatPhoneNumber(celular_telefone);

            // Prepara variáveis para o Typebot
            const variables = {
                name: paciente || 'Paciente',
                procedimento: procedimento || 'Procedimento não informado',
                agendamento: this.formatScheduleDate(schedule),
                profissional: profissional_solicitante || 'Profissional não informado',
                // Novas informações adicionadas
                id_solicitacao: solicitacao || '',
                data_hora: data_hora || '',
                classificacao_risco: classificacao_risco || '',
                situacao: situacao || '',
                observacao: observacao || '',
                identificacao_paciente: identificacao_paciente || '',
                disparo_nome: disparo_nome || ''
            };

            console.log(`📋 Variáveis: ${JSON.stringify(variables)}`);

            // Envia mensagem via Typebot
            const result = await this.typebotAPI.sendMessage(formattedPhone, variables);

            if (result.success) {
                // Sucesso - atualiza status
                await client.query(`
                    UPDATE disparo_solicitacoes 
                    SET status = 'enviado', 
                        data_envio = CURRENT_TIMESTAMP,
                        resposta_api = $2
                    WHERE id = $1
                `, [disparo_solicitacao_id, JSON.stringify(result.data)]);

                // Atualiza status da solicitação principal
                await client.query(`
                    UPDATE solicitacoes 
                    SET status = 'enviado'
                    WHERE id = $1
                `, [solicitacao_id]);

                console.log(`✅ Mensagem enviada com sucesso para ${paciente}`);

            } else {
                // Erro - verifica se deve tentar novamente
                const newTentativas = tentativas + 1;

                if (newTentativas >= this.config.maxRetries) {
                    // Máximo de tentativas atingido
                    await client.query(`
                        UPDATE disparo_solicitacoes 
                        SET status = 'erro', 
                            erro_motivo = $2,
                            resposta_api = $3
                        WHERE id = $1
                    `, [
                        disparo_solicitacao_id,
                        `Falha após ${this.config.maxRetries} tentativas: ${result.error}`,
                        JSON.stringify(result)
                    ]);

                    console.error(`❌ Falha definitiva para ${paciente} após ${this.config.maxRetries} tentativas`);
                } else {
                    // Ainda pode tentar novamente
                    await client.query(`
                        UPDATE disparo_solicitacoes 
                        SET erro_motivo = $2,
                            resposta_api = $3
                        WHERE id = $1
                    `, [
                        disparo_solicitacao_id,
                        `Tentativa ${newTentativas}/${this.config.maxRetries}: ${result.error}`,
                        JSON.stringify(result)
                    ]);

                    console.warn(`⚠️ Falha temporária para ${paciente} (tentativa ${newTentativas}/${this.config.maxRetries})`);
                }
            }

        } catch (error) {
            console.error(`❌ Erro ao processar mensagem para ${paciente}:`, error);

            // Registra erro no banco
            await client.query(`
                UPDATE disparo_solicitacoes 
                SET status = 'erro', 
                    erro_motivo = $2
                WHERE id = $1
            `, [disparo_solicitacao_id, `Erro interno: ${error.message}`]);
        }
    }

    /**
     * Verifica se há disparos pendentes e atualiza status dos disparos concluídos
     */
    async checkDisparoStatus() {
        const client = await db.pool.connect();

        try {
            // Busca disparos em execução
            const disparosEmExecucao = await client.query(`
                SELECT id FROM disparos WHERE status = 'executando'
            `);

            for (const disparo of disparosEmExecucao.rows) {
                // Verifica se todas as mensagens foram processadas
                const statusQuery = await client.query(`
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN status = 'enviado' THEN 1 END) as enviados,
                        COUNT(CASE WHEN status = 'erro' THEN 1 END) as erros,
                        COUNT(CASE WHEN status = 'pendente' THEN 1 END) as pendentes
                    FROM disparo_solicitacoes 
                    WHERE disparo_id = $1
                `, [disparo.id]);

                const stats = statusQuery.rows[0];
                const processados = parseInt(stats.enviados) + parseInt(stats.erros);
                const total = parseInt(stats.total);
                const pendentes = parseInt(stats.pendentes);

                if (pendentes === 0 && total > 0) {
                    // Todas as mensagens foram processadas
                    const statusFinal = parseInt(stats.erros) === 0 ? 'concluido' : 'concluido';

                    const resultado = {
                        total_processadas: total,
                        sucessos: parseInt(stats.enviados),
                        erros: parseInt(stats.erros),
                        data_conclusao: new Date()
                    };

                    await client.query(`
                        UPDATE disparos 
                        SET status = $2, 
                            data_conclusao = CURRENT_TIMESTAMP,
                            resultado = $3
                        WHERE id = $1
                    `, [disparo.id, statusFinal, JSON.stringify(resultado)]);

                    console.log(`🏁 Disparo ${disparo.id} concluído: ${stats.enviados} enviados, ${stats.erros} erros`);
                }
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
        if (!schedule) return 'Data não informada';

        try {
            let scheduleObj;
            if (typeof schedule === 'string') {
                scheduleObj = JSON.parse(schedule);
            } else {
                scheduleObj = schedule;
            }

            if (scheduleObj && scheduleObj.data_agendamento) {
                return this.typebotAPI.formatDate(scheduleObj.data_agendamento);
            }

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
                    d.id as disparo_id,
                    d.nome,
                    d.status as disparo_status,
                    COUNT(ds.id) as total_mensagens,
                    COUNT(CASE WHEN ds.status = 'pendente' THEN 1 END) as pendentes,
                    COUNT(CASE WHEN ds.status = 'enviado' THEN 1 END) as enviadas,
                    COUNT(CASE WHEN ds.status = 'erro' THEN 1 END) as erros
                FROM disparos d
                LEFT JOIN disparo_solicitacoes ds ON d.id = ds.disparo_id
                WHERE d.status IN ('executando', 'criado')
                GROUP BY d.id, d.nome, d.status
                ORDER BY d.data_criacao DESC
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
