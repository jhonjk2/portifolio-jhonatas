# Portfólio Jhonatas — Render + painel de administração

Aplicação Node.js/Express com portfólio público, PostgreSQL e painel privado em `/admin`.

## Requisitos
- Node.js 20 ou superior
- PostgreSQL

## Executar localmente
1. Instalar dependências: `npm install`
2. Copiar `.env.example` para `.env` e preencher as variáveis.
3. Gerar hash da palavra-passe: `npm run hash-password` e copiar o resultado para `ADMIN_PASSWORD_HASH` no `.env`.
4. Iniciar: `npm start`
5. Abrir `http://localhost:3000` e `http://localhost:3000/admin`.

A palavra-passe não é guardada em texto simples. O script pede-a no terminal e gera um hash bcrypt.

## Publicar na Render
1. Enviar esta pasta para um repositório GitHub.
2. Na Render, criar uma base de dados PostgreSQL.
3. Criar um **Web Service** ligado ao repositório.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Adicionar as variáveis de ambiente:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = Internal Database URL da base PostgreSQL criada na Render
   - `SESSION_SECRET` = uma chave aleatória longa (pelo menos 32 caracteres)
   - `ADMIN_USERNAME` = o nome de utilizador escolhido
   - `ADMIN_PASSWORD_HASH` = hash gerado com `npm run hash-password` localmente
7. Fazer deploy. Na primeira inicialização, as tabelas são criadas automaticamente e os três projetos iniciais são inseridos se a tabela estiver vazia.
8. Aceder a `https://TEU-SERVICO.onrender.com/admin`.

Não coloques `.env`, palavras-passe ou hashes em repositórios públicos. Usa apenas as variáveis de ambiente da Render para os segredos.

## Gestão
- `GET /admin/login`: login
- `GET /admin`: painel protegido
- `GET /api/projects`: projetos publicados (dados públicos)
- O painel permite criar, editar, publicar/ocultar e eliminar projetos.
- A imagem é indicada por URL HTTPS; o ficheiro não é carregado para o servidor.
