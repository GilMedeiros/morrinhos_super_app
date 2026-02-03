# Instruções para atualização da aplicação na VPS

## Usando a imagem Docker Hub

A aplicação foi publicada no Docker Hub como `gilmedeiros/mr_app_cnta:latest` e também como `gilmedeiros/mr_app_cnta:v20250821`.

Para atualizar a aplicação na VPS, execute os seguintes comandos:

1. Acesse a pasta do projeto na VPS:
```bash
cd /caminho/para/o/projeto
```

2. Pare os containers atuais (opcional, se quiser um reinício completo):
```bash
docker-compose down
```

3. Puxe a imagem mais recente do Docker Hub:
```bash
docker pull gilmedeiros/mr_app_cnta:latest
```

4. Inicie os containers:
```bash
docker-compose up -d
```

## Atualizando o docker-compose.yml

Se o arquivo `docker-compose.yml` na VPS ainda estiver usando `build: .` em vez de uma imagem específica, você pode atualizá-lo para usar a imagem do Docker Hub:

1. Edite o arquivo docker-compose.yml:
```bash
nano docker-compose.yml
```

2. Altere a configuração da aplicação de:
```yaml
app:
  build: .
  # ...outras configurações
```

Para:
```yaml
app:
  image: gilmedeiros/mr_app_cnta:latest
  # ...outras configurações
```

3. Salve o arquivo e reinicie os containers:
```bash
docker-compose up -d
```

## Rollback (se necessário)

Se houver problemas com a versão mais recente, você pode voltar para uma versão específica anterior:

```bash
docker-compose down
docker pull gilmedeiros/mr_app_cnta:v20250821  # Ou outra tag específica
docker-compose up -d
```

## Notas

- A tag `latest` sempre refere-se à versão mais recente enviada para o Docker Hub.
- Tags com datas (ex: `v20250821`) são versões específicas que podem ser usadas para rollback se necessário.
- Certifique-se de que variáveis de ambiente e configurações específicas da VPS estão corretamente configuradas no docker-compose.yml.
