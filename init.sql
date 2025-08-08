-- Script de inicialização do banco de dados PostgreSQL
-- Criar extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Criar tabela para fontes dos PDFs
CREATE TABLE IF NOT EXISTS sources (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    data_upload TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    quantidade_itens INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Criar tabela para solicitações extraídas dos PDFs
CREATE TABLE IF NOT EXISTS solicitacoes (
    id SERIAL PRIMARY KEY,
    source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    solicitacao VARCHAR(255) NOT NULL,
    paciente VARCHAR(255),
    procedimento TEXT,
    data_hora VARCHAR(255),
    celular_telefone VARCHAR(255),
    classificacao_risco VARCHAR(255),
    situacao VARCHAR(255),
    observacao TEXT,
    profissional_solicitante VARCHAR(255),
    schedule JSONB,
    status VARCHAR(50) DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_id, solicitacao)
);
-- Criar índices para users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
-- Criar índices para sources
CREATE INDEX IF NOT EXISTS idx_sources_nome ON sources(nome);
CREATE INDEX IF NOT EXISTS idx_sources_data_upload ON sources(data_upload);
CREATE INDEX IF NOT EXISTS idx_sources_status ON sources(status);
-- Criar índices para solicitações
CREATE INDEX IF NOT EXISTS idx_solicitacoes_source_id ON solicitacoes(source_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_solicitacao ON solicitacoes(solicitacao);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_paciente ON solicitacoes(paciente);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_created_at ON solicitacoes(created_at);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_situacao ON solicitacoes(situacao);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes(status);
-- Inserir dados de exemplo
INSERT INTO users (name, email)
VALUES ('João Silva', 'joao@exemplo.com'),
    ('Maria Santos', 'maria@exemplo.com'),
    ('Pedro Oliveira', 'pedro@exemplo.com') ON CONFLICT (email) DO NOTHING;
-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ language 'plpgsql';
-- Criar trigger para atualizar updated_at na tabela users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE
UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Criar trigger para atualizar updated_at na tabela sources
DROP TRIGGER IF EXISTS update_sources_updated_at ON sources;
CREATE TRIGGER update_sources_updated_at BEFORE
UPDATE ON sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Criar trigger para atualizar updated_at na tabela solicitacoes
DROP TRIGGER IF EXISTS update_solicitacoes_updated_at ON solicitacoes;
CREATE TRIGGER update_solicitacoes_updated_at BEFORE
UPDATE ON solicitacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();