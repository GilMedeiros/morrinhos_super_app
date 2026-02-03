#!/bin/bash

echo "Iniciando o processo de build e push da imagem Docker..."
echo ""

# Defina seu nome de usuário do Docker Hub
DOCKER_USERNAME="gilmedeiros"

# Defina o nome do repositório
REPO_NAME="morrinhos"

# Defina a versão (use a data atual para versão incremental)
VERSION="v$(date +%Y%m%d)"
TAG="$VERSION"

echo "Criando nova imagem com a tag: $DOCKER_USERNAME/$REPO_NAME:$TAG"
echo ""

# Faça o build da imagem
docker build -t "$DOCKER_USERNAME/$REPO_NAME:$TAG" .

# Também crie uma tag 'latest'
docker tag "$DOCKER_USERNAME/$REPO_NAME:$TAG" "$DOCKER_USERNAME/$REPO_NAME:latest"

echo ""
echo "Imagem criada com sucesso!"
echo ""

# Faça login no Docker Hub (será solicitada sua senha)
echo "Fazendo login no Docker Hub..."
docker login -u "$DOCKER_USERNAME"

# Envie as imagens para o Docker Hub
echo ""
echo "Enviando imagem com tag $TAG para o Docker Hub..."
docker push "$DOCKER_USERNAME/$REPO_NAME:$TAG"

echo ""
echo "Enviando imagem com tag 'latest' para o Docker Hub..."
docker push "$DOCKER_USERNAME/$REPO_NAME:latest"

echo ""
echo "Processo concluído! A imagem $DOCKER_USERNAME/$REPO_NAME:$TAG foi enviada para o Docker Hub."
echo ""

# Atualizar o docker-compose.yml para usar a imagem do Docker Hub
read -p "Deseja atualizar o docker-compose.yml para usar a imagem do Docker Hub? (S/N) " UPDATE_COMPOSE

if [[ "$UPDATE_COMPOSE" == [Ss]* ]]; then
    echo "Atualizando docker-compose.yml..."
    
    # Crie um backup do arquivo original
    cp docker-compose.yml docker-compose.yml.bak
    
    # Substitua a configuração 'build' pela 'image'
    sed -i "s|build: \.|image: $DOCKER_USERNAME/$REPO_NAME:latest|g" docker-compose.yml
    
    echo "docker-compose.yml atualizado! Um backup foi criado como docker-compose.yml.bak"
fi

echo ""
echo "Pressione ENTER para sair..."
read
