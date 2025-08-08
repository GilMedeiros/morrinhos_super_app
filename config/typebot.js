const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class TypebotAPI {
    constructor() {
        // Configurações padrão da API do Typebot
        this.defaultConfig = {
            baseURL: 'https://evo.apollocompany.com.br/typebot/start/4363_apollo',
            apiKey: '8DAE19CC1DC5-430B-A005-5E4CDFEBB17E',
            httpMethod: 'POST',
            customHeaders: {},
            payloadTemplate: JSON.stringify({
                phone: "{phone}",
                name: "{name}",
                agendamento: "{agendamento}",
                procedimento: "{procedimento}",
                profissional: "{profissional}",
                id_solicitacao: "{id_solicitacao}",
                data_hora: "{data_hora}",
                classificacao_risco: "{classificacao_risco}",
                situacao: "{situacao}",
                observacao: "{observacao}",
                identificacao_paciente: "{identificacao_paciente}",
                disparo_nome: "{disparo_nome}",
                test: false
            }, null, 2)
        };

        // Configurações atuais (carregadas do arquivo ou padrão)
        this.config = { ...this.defaultConfig };
        this.configFile = path.join(__dirname, 'webhook-config.json');

        // Carregar configurações salvas de forma síncrona
        this.loadConfigSync();
    }

    /**
     * Carregar configurações do arquivo de forma síncrona
     */
    loadConfigSync() {
        try {
            const fs = require('fs');
            const configData = fs.readFileSync(this.configFile, 'utf8');
            const savedConfig = JSON.parse(configData);
            this.config = { ...this.defaultConfig, ...savedConfig };
            console.log('✅ Configurações do Typebot carregadas do arquivo (sync)');
            console.log('🔧 URL carregada:', this.config.baseURL);
            console.log('🔑 API Key carregada:', this.config.apiKey ? '***redacted***' : 'não definida');
        } catch (error) {
            console.log('📄 Usando configurações padrão do Typebot (arquivo não encontrado ou inválido)');
            this.config = { ...this.defaultConfig };
        }
    }

    /**
     * Carregar configurações do arquivo
     */
    async loadConfig() {
        try {
            const configData = await fs.readFile(this.configFile, 'utf8');
            const savedConfig = JSON.parse(configData);
            this.config = { ...this.defaultConfig, ...savedConfig };
            console.log('✅ Configurações do Typebot carregadas do arquivo');
            console.log('🔧 URL carregada:', this.config.baseURL);
            console.log('🔑 API Key carregada:', this.config.apiKey ? '***redacted***' : 'não definida');
        } catch (error) {
            console.log('📄 Usando configurações padrão do Typebot');
            this.config = { ...this.defaultConfig };
        }
    }

    /**
     * Salvar configurações no arquivo
     */
    async saveConfig(newConfig) {
        try {
            console.log('💾 Salvando configurações:', newConfig);

            const configToSave = {
                baseURL: newConfig.url || this.config.baseURL,
                apiKey: newConfig.apiKey || this.config.apiKey,
                httpMethod: newConfig.httpMethod || this.config.httpMethod || 'POST',
                customHeaders: newConfig.customHeaders || this.config.customHeaders || {},
                payloadTemplate: newConfig.payloadTemplate || this.config.payloadTemplate || this.defaultConfig.payloadTemplate
            };

            console.log('💾 Configuração processada para salvar:', {
                baseURL: configToSave.baseURL,
                apiKey: configToSave.apiKey ? '***redacted***' : 'não definida',
                httpMethod: configToSave.httpMethod,
                customHeaders: configToSave.customHeaders,
                payloadTemplate: configToSave.payloadTemplate ? 'definido' : 'não definido'
            });

            await fs.writeFile(this.configFile, JSON.stringify(configToSave, null, 2));
            this.config = configToSave;
            console.log('💾 Configurações do Webhook salvas com sucesso');
            console.log('🔧 URL salva:', this.config.baseURL);

            // Recarregar para verificar
            await this.loadConfig();

            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar configurações:', error.message);
            throw error;
        }
    }

    /**
     * Obter configurações atuais
     */
    getConfig() {
        // Garantir que as configurações estejam atualizadas
        this.loadConfigSync();

        const config = {
            url: this.config.baseURL,
            apiKey: this.config.apiKey,
            httpMethod: this.config.httpMethod,
            customHeaders: this.config.customHeaders,
            payloadTemplate: this.config.payloadTemplate
        };

        console.log('📋 Retornando configurações:', {
            url: config.url,
            apiKey: config.apiKey ? '***redacted***' : 'não definida',
            httpMethod: config.httpMethod,
            customHeaders: config.customHeaders,
            payloadTemplate: config.payloadTemplate ? 'definido' : 'não definido'
        });

        return config;
    }

    /**
     * Restaurar configurações padrão
     */
    async resetConfig() {
        try {
            await fs.unlink(this.configFile);
        } catch (error) {
            // Arquivo não existe, ignorar
        }
        this.config = { ...this.defaultConfig };
        console.log('🔄 Configurações do Typebot restauradas para padrão');
        return true;
    }

    // Getters para compatibilidade com código existente
    get baseURL() {
        return this.config.baseURL;
    }

    get apiKey() {
        return this.config.apiKey;
    }

    get httpMethod() {
        return this.config.httpMethod || 'POST';
    }

    get customHeaders() {
        return this.config.customHeaders || {};
    }

    get payloadTemplate() {
        return this.config.payloadTemplate || this.defaultConfig.payloadTemplate;
    }

    /**
     * Processa o template do payload substituindo as variáveis
     * @param {Object} variables - Variáveis para substituição
     * @returns {Object} Payload processado
     */
    processPayloadTemplate(variables) {
        try {
            let template = this.payloadTemplate;

            // Se não há template, usar formato padrão
            if (!template) {
                return {
                    phone: variables.phone || '',
                    name: variables.name || '',
                    agendamento: variables.agendamento || '',
                    procedimento: variables.procedimento || '',
                    profissional: variables.profissional || '',
                    id_solicitacao: variables.id_solicitacao || '',
                    data_hora: variables.data_hora || '',
                    classificacao_risco: variables.classificacao_risco || '',
                    situacao: variables.situacao || '',
                    observacao: variables.observacao || '',
                    identificacao_paciente: variables.identificacao_paciente || '',
                    disparo_nome: variables.disparo_nome || '',
                    test: variables.test || false
                };
            }

            // Substituir variáveis no template com tratamento inteligente
            let processedTemplate = template;

            // Substituir cada variável cuidadosamente
            const replacements = {
                phone: variables.phone || '',
                name: variables.name || '',
                agendamento: variables.agendamento || '',
                procedimento: variables.procedimento || '',
                profissional: variables.profissional || '',
                id_solicitacao: variables.id_solicitacao || '',
                data_hora: variables.data_hora || '',
                classificacao_risco: variables.classificacao_risco || '',
                situacao: variables.situacao || '',
                observacao: variables.observacao || '',
                identificacao_paciente: variables.identificacao_paciente || '',
                disparo_nome: variables.disparo_nome || '',
                test: variables.test || false
            };

            // Para cada variável, verificar se está entre aspas ou não
            Object.keys(replacements).forEach(key => {
                const value = replacements[key];
                const quotedPattern = new RegExp(`"\\{${key}\\}"`, 'g');
                const unquotedPattern = new RegExp(`\\{${key}\\}`, 'g');

                // Se a variável está entre aspas duplas, substitui mantendo as aspas para strings
                // ou removendo para outros tipos
                if (processedTemplate.includes(`"{${key}}"`)) {
                    if (typeof value === 'string') {
                        processedTemplate = processedTemplate.replace(quotedPattern, `"${value}"`);
                    } else {
                        processedTemplate = processedTemplate.replace(quotedPattern, String(value));
                    }
                } else {
                    // Variável sem aspas - substitui diretamente
                    if (typeof value === 'string') {
                        processedTemplate = processedTemplate.replace(unquotedPattern, `"${value}"`);
                    } else {
                        processedTemplate = processedTemplate.replace(unquotedPattern, String(value));
                    }
                }
            });

            return JSON.parse(processedTemplate);
        } catch (error) {
            console.error('❌ Erro ao processar template do payload:', error.message);
            console.error('Template original:', this.payloadTemplate);
            console.error('Variáveis:', variables);

            // Fallback para formato padrão
            return {
                phone: variables.phone || '',
                name: variables.name || '',
                agendamento: variables.agendamento || '',
                procedimento: variables.procedimento || '',
                profissional: variables.profissional || '',
                id_solicitacao: variables.id_solicitacao || '',
                data_hora: variables.data_hora || '',
                classificacao_risco: variables.classificacao_risco || '',
                situacao: variables.situacao || '',
                observacao: variables.observacao || '',
                identificacao_paciente: variables.identificacao_paciente || '',
                disparo_nome: variables.disparo_nome || '',
                test: variables.test || false,
                error: 'Template inválido - usando formato padrão',
                originalError: error.message
            };
        }
    }

    /**
     * Envia uma mensagem via Typebot para um número específico
     * @param {string} remoteJid - Número do WhatsApp (com código do país)
     * @param {Object} variables - Variáveis a serem enviadas
     * @param {string} variables.name - Nome do paciente
     * @param {string} variables.agendamento - Data do agendamento
     * @param {string} variables.procedimento - Nome do procedimento
     * @param {string} variables.profissional - Nome do profissional
     * @returns {Promise<Object>} Resposta da API
     */
    async sendMessage(remoteJid, variables) {
        try {
            console.log(`📤 Enviando mensagem via Webhook para ${remoteJid}`);

            // Processar payload usando template configurável
            const payload = this.processPayloadTemplate({
                phone: remoteJid,
                name: variables.name || '',
                agendamento: variables.agendamento || '',
                procedimento: variables.procedimento || '',
                profissional: variables.profissional || '',
                id_solicitacao: variables.id_solicitacao || '',
                data_hora: variables.data_hora || '',
                classificacao_risco: variables.classificacao_risco || '',
                situacao: variables.situacao || '',
                observacao: variables.observacao || '',
                identificacao_paciente: variables.identificacao_paciente || '',
                disparo_nome: variables.disparo_nome || '',
                test: false
            });

            console.log('📋 Payload:', JSON.stringify(payload, null, 2));

            // Preparar headers
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`,
                'X-API-Key': this.config.apiKey,
                'User-Agent': 'Morrinhos-System/1.0',
                ...this.customHeaders
            };

            const response = await axios({
                method: this.httpMethod,
                url: this.config.baseURL,
                data: payload,
                headers: headers,
                timeout: 30000 // 30 segundos de timeout
            });

            console.log(`✅ Mensagem enviada com sucesso para ${remoteJid}`);
            console.log('📥 Resposta da API:', response.data);

            return {
                success: true,
                data: response.data,
                status: response.status,
                payload: payload
            };

        } catch (error) {
            console.error(`❌ Erro ao enviar mensagem para ${remoteJid}:`, error.message);

            // Log detalhado do erro
            if (error.response) {
                console.error('📊 Status:', error.response.status);
                console.error('📊 Headers:', error.response.headers);
                console.error('📊 Data:', error.response.data);
            } else if (error.request) {
                console.error('📊 Request:', error.request);
            }

            return {
                success: false,
                error: error.message,
                status: error.response?.status || 0,
                data: error.response?.data || null
            };
        }
    }

    /**
     * Formata o número de telefone para o padrão internacional
     * @param {string} phoneNumber - Número de telefone
     * @returns {string} Número formatado
     */
    formatPhoneNumber(phoneNumber) {
        // Remove todos os caracteres não numéricos
        let cleaned = phoneNumber.replace(/\D/g, '');

        // Se não começar com 55 (código do Brasil), adiciona
        if (!cleaned.startsWith('55')) {
            cleaned = '55' + cleaned;
        }

        // Garante que números móveis tenham 9 dígitos (adiciona 9 se necessário)
        // Formato esperado: 5521983330400 (55 + 21 + 9 + 83330400)
        if (cleaned.length === 12 && cleaned.substring(4, 5) !== '9') {
            // Insere o 9 após o DDD
            cleaned = cleaned.substring(0, 4) + '9' + cleaned.substring(4);
        }

        console.log(`📱 Número formatado: ${phoneNumber} -> ${cleaned}`);
        return cleaned;
    }

    /**
     * Formata a data de agendamento
     * @param {Date|string} date - Data do agendamento
     * @returns {string} Data formatada
     */
    formatDate(date) {
        if (!date) return '';

        const dateObj = date instanceof Date ? date : new Date(date);

        if (isNaN(dateObj.getTime())) {
            console.warn('⚠️ Data inválida:', date);
            return '';
        }

        // Formato brasileiro: DD/MM/YYYY às HH:MM
        const formatted = dateObj.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo'
        });

        console.log(`📅 Data formatada: ${date} -> ${formatted}`);
        return formatted;
    }

    /**
     * Testa a conectividade com a API usando configurações específicas
     * @param {Object} testConfig - Configurações para teste (opcional)
     * @returns {Promise<Object>} Resultado do teste
     */
    async testConnection(testConfig = null) {
        try {
            console.log('🔍 Testando conectividade com a API do Typebot...');

            const config = testConfig || this.config;
            const baseURL = testConfig?.url || config.baseURL;
            const apiKey = testConfig?.apiKey || config.apiKey;

            // Requisição HTTP simples para testar conectividade
            const testPayload = {
                phone: '5511999999999', // Número de teste
                name: 'Teste Conectividade',
                agendamento: '01/01/2025 às 10:00',
                procedimento: 'Teste de Conectividade',
                test: true // Indica que é um teste
            };

            const response = await axios.post(baseURL, testPayload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'X-API-Key': apiKey,
                    'User-Agent': 'Morrinhos-System/1.0'
                },
                timeout: 10000,
                validateStatus: () => true // Aceita qualquer status para teste
            });

            console.log(`📊 Status da API: ${response.status}`);

            // Considera sucesso se o status for 2xx ou 4xx (API acessível)
            const isConnected = response.status >= 200 && response.status < 500;

            if (isConnected) {
                console.log('✅ API do Typebot acessível');
                return {
                    success: true,
                    connected: true,
                    status: response.status,
                    message: 'Conectividade OK - API respondeu corretamente',
                    data: response.data
                };
            } else {
                console.log('❌ API do Typebot não acessível');
                return {
                    success: false,
                    connected: false,
                    status: response.status,
                    message: `API não acessível - Status ${response.status}`,
                    data: response.data
                };
            }

        } catch (error) {
            console.error('❌ Erro ao testar conectividade:', error.message);

            let errorMessage = error.message;
            let errorCode = 'UNKNOWN_ERROR';

            if (error.code === 'ECONNREFUSED') {
                errorMessage = 'Conexão recusada - Verifique a URL';
                errorCode = 'CONNECTION_REFUSED';
            } else if (error.code === 'ENOTFOUND') {
                errorMessage = 'URL não encontrada - Verifique o endereço';
                errorCode = 'URL_NOT_FOUND';
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = 'Timeout - API demorou para responder';
                errorCode = 'TIMEOUT';
            }

            return {
                success: false,
                connected: false,
                status: error.response?.status || 0,
                message: errorMessage,
                error: errorCode,
                data: error.response?.data || null
            };
        }
    }

    /**
     * Envia uma mensagem de teste usando configurações específicas
     * @param {Object} params - Parâmetros do teste
     * @param {string} params.phone - Número de telefone
     * @param {Object} params.variables - Variáveis da mensagem
     * @param {Object} params.config - Configurações específicas (opcional)
     * @returns {Promise<Object>} Resultado do envio
     */
    async testMessage(params) {
        try {
            const { phone, variables, config: testConfig } = params;

            console.log(`📤 Enviando mensagem de teste para ${phone}`);

            const config = testConfig || this.config;
            const baseURL = testConfig?.url || config.baseURL;
            const apiKey = testConfig?.apiKey || config.apiKey;
            const httpMethod = testConfig?.httpMethod || config.httpMethod || 'POST';
            const customHeaders = testConfig?.customHeaders || config.customHeaders || {};
            const payloadTemplate = testConfig?.payloadTemplate || config.payloadTemplate;

            const formattedPhone = this.formatPhoneNumber(phone);

            // Processar payload usando template (temporário para teste)
            let payload;
            if (payloadTemplate) {
                try {
                    const processedTemplate = payloadTemplate
                        .replace(/\{phone\}/g, formattedPhone)
                        .replace(/\{name\}/g, variables.name || '')
                        .replace(/\{agendamento\}/g, variables.agendamento || '')
                        .replace(/\{procedimento\}/g, variables.procedimento || '')
                        .replace(/\{profissional\}/g, variables.profissional || '')
                        .replace(/\{id_solicitacao\}/g, variables.id_solicitacao || '')
                        .replace(/\{data_hora\}/g, variables.data_hora || '')
                        .replace(/\{classificacao_risco\}/g, variables.classificacao_risco || '')
                        .replace(/\{situacao\}/g, variables.situacao || '')
                        .replace(/\{observacao\}/g, variables.observacao || '')
                        .replace(/\{identificacao_paciente\}/g, variables.identificacao_paciente || '')
                        .replace(/\{disparo_nome\}/g, variables.disparo_nome || '')
                        .replace(/\{test\}/g, true);

                    payload = JSON.parse(processedTemplate);
                } catch (error) {
                    console.warn('⚠️ Erro ao processar template, usando formato padrão');
                    payload = {
                        phone: formattedPhone,
                        name: variables.name || '',
                        agendamento: variables.agendamento || '',
                        procedimento: variables.procedimento || '',
                        profissional: variables.profissional || '',
                        id_solicitacao: variables.id_solicitacao || '',
                        data_hora: variables.data_hora || '',
                        classificacao_risco: variables.classificacao_risco || '',
                        situacao: variables.situacao || '',
                        observacao: variables.observacao || '',
                        identificacao_paciente: variables.identificacao_paciente || '',
                        disparo_nome: variables.disparo_nome || '',
                        test: true
                    };
                }
            } else {
                payload = {
                    phone: formattedPhone,
                    name: variables.name || '',
                    agendamento: variables.agendamento || '',
                    procedimento: variables.procedimento || '',
                    profissional: variables.profissional || '',
                    id_solicitacao: variables.id_solicitacao || '',
                    data_hora: variables.data_hora || '',
                    classificacao_risco: variables.classificacao_risco || '',
                    situacao: variables.situacao || '',
                    observacao: variables.observacao || '',
                    identificacao_paciente: variables.identificacao_paciente || '',
                    disparo_nome: variables.disparo_nome || '',
                    test: true
                };
            }

            console.log('📋 Payload de teste:', JSON.stringify(payload, null, 2));

            // Preparar headers
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'X-API-Key': apiKey,
                'User-Agent': 'Morrinhos-System/1.0',
                ...customHeaders
            };

            const response = await axios({
                method: httpMethod,
                url: baseURL,
                data: payload,
                headers: headers,
                timeout: 30000
            });

            console.log(`✅ Mensagem de teste enviada com sucesso para ${phone}`);
            console.log('📥 Resposta da API:', response.data);

            return {
                success: true,
                formattedPhone: formattedPhone,
                data: response.data,
                status: response.status,
                message: 'Mensagem de teste enviada com sucesso',
                payload: payload,
                headers: headers
            };

        } catch (error) {
            console.error(`❌ Erro ao enviar mensagem de teste:`, error.message);

            let errorMessage = 'Erro ao enviar mensagem de teste';

            if (error.response) {
                errorMessage = `Erro ${error.response.status}: ${error.response.data?.message || error.message}`;
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage = 'Conexão recusada - Verifique a URL da API';
            } else if (error.code === 'ENOTFOUND') {
                errorMessage = 'URL não encontrada - Verifique o endereço da API';
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = 'Timeout - API demorou para responder';
            }

            return {
                success: false,
                error: error.message,
                status: error.response?.status || 0,
                data: error.response?.data || null,
                message: errorMessage
            };
        }
    }

    /**
     * Testa a conectividade com a API (método original para compatibilidade)
     * @returns {Promise<boolean>} True se a API estiver acessível
     */
    async testConnectionLegacy() {
        const result = await this.testConnection();
        return result.connected;
    }
}

// Instância singleton
let typebotInstance = null;

function getTypebotAPI() {
    if (!typebotInstance) {
        typebotInstance = new TypebotAPI();
    }
    return typebotInstance;
}

module.exports = TypebotAPI;
module.exports.getTypebotAPI = getTypebotAPI;
