-- Criar tabela para solicitações extraídas dos PDFs
CREATE TABLE IF NOT EXISTS solicitacoes (
    id SERIAL PRIMARY KEY,
    solicitacao VARCHAR(255) UNIQUE NOT NULL,
    paciente VARCHAR(255),
    procedimento TEXT,
    data_hora VARCHAR(255),
    celular_telefone VARCHAR(255),
    classificacao_risco VARCHAR(255),
    situacao VARCHAR(255),
    observacao TEXT,
    profissional_solicitante VARCHAR(255),
    schedule JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_solicitacoes_solicitacao ON solicitacoes(solicitacao);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_paciente ON solicitacoes(paciente);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_created_at ON solicitacoes(created_at);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_situacao ON solicitacoes(situacao);
-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_solicitacoes_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ language 'plpgsql';
DROP TRIGGER IF EXISTS update_solicitacoes_updated_at ON solicitacoes;
CREATE TRIGGER update_solicitacoes_updated_at BEFORE
UPDATE ON solicitacoes FOR EACH ROW EXECUTE FUNCTION update_solicitacoes_updated_at();