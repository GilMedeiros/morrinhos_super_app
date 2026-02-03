-- Criar tabela sources se não existir
CREATE TABLE IF NOT EXISTS sources (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    data_upload TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    quantidade_itens INTEGER DEFAULT 0,
    registros_processados INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'processing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Criar tabela para resultados de extração dos PDFs
CREATE TABLE IF NOT EXISTS extraction_results (
    id SERIAL PRIMARY KEY,
    status VARCHAR(20) DEFAULT 'ativo',
    data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ccp VARCHAR(50),
    nome TEXT NOT NULL,
    celular VARCHAR(20),
    processo TEXT,
    valor_devido NUMERIC,
    source_id INTEGER REFERENCES sources(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_id, ccp)
);
-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_extraction_results_ccp ON extraction_results(ccp);
CREATE INDEX IF NOT EXISTS idx_extraction_results_nome ON extraction_results(nome);
CREATE INDEX IF NOT EXISTS idx_extraction_results_source_id ON extraction_results(source_id);
CREATE INDEX IF NOT EXISTS idx_extraction_results_created_at ON extraction_results(created_at);
CREATE INDEX IF NOT EXISTS idx_extraction_results_status ON extraction_results(status);
-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_extraction_results_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP;
NEW.data_atualizacao = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ language 'plpgsql';
DROP TRIGGER IF EXISTS update_extraction_results_updated_at ON extraction_results;
CREATE TRIGGER update_extraction_results_updated_at BEFORE
UPDATE ON extraction_results FOR EACH ROW EXECUTE FUNCTION update_extraction_results_updated_at();
-- Criar trigger para sources também
CREATE OR REPLACE FUNCTION update_sources_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ language 'plpgsql';
DROP TRIGGER IF EXISTS update_sources_updated_at ON sources;
CREATE TRIGGER update_sources_updated_at BEFORE
UPDATE ON sources FOR EACH ROW EXECUTE FUNCTION update_sources_updated_at();