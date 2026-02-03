# Sistema de Mensagens Personalizadas

O sistema permite enviar mensagens personalizadas com substituição de variáveis.

## Formato da Mensagem

As mensagens podem incluir variáveis que serão substituídas pelos dados de cada registro. Exemplos:

```
Olá {nome}, informamos que você possui débito de {valor_devido} referente ao processo {processo}.
```

## Variáveis Disponíveis

- `{nome}`: Nome do destinatário
- `{telefone}`: Número de telefone
- `{data}`: Todos os dados do registro como JSON (útil para debug)

## Exemplos de Uso

### Aviso de Débito
```
Olá {nome}, informamos que você possui débitos junto à Fazenda Pública do município de Morrinhos - Goiás no valor de {valor_devido} referente ao processo {processo}.

Digite 1 para pagar, 2 para parcelamento ou 3 para maiores informações.
```

### Notificação de Prazo
```
{nome}, lembramos que o prazo para regularização dos seus débitos vence hoje. Procure o departamento de arrecadação e evite transtornos.
```

### Informativo de DUAM
```
{nome}, o seu DUAM REPAC nº {ccp} está disponível para pagamento. A parcela {processo} está em atraso há mais de 30 dias.

Procure o departamento de arrecadação e evite transtornos.
```

### Perda de Parcelamento
```
{nome}, você será excluído(a) do programa REPAC por atraso superior a 60 dias.

Procure o departamento de arrecadação imediatamente e evite a perda dos benefícios.
```

## Armazenamento

As mensagens são armazenadas no campo `configuracao` (tipo JSONB) da tabela `queue`:

```sql
{
  "mensagem_personalizada": "Olá {nome}, informamos que..."
}
```

## Validação

O sistema verifica automaticamente se todas as variáveis usadas na mensagem existem nos dados antes de iniciar o disparo.