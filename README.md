# 3VolutionTurbos — Gestão de Oficina

Aplicação web mobile-first para gerir folhas de obra da oficina em dois ou mais telemóveis, com sincronização através do Supabase.

## O que já faz

- Login de utilizadores.
- Folha de obra numerada automaticamente (`OT-2026-0001`, etc.).
- Cliente: nome, telefone, NIF, email e morada.
- Data de receção e de entrega.
- Categorias:
  - Peças de Turbo
  - Linhas de Escape
  - Turbos Novos
  - Reparações de Turbos
  - Hibridações de Turbos
  - Preparações de Turbos
- Estado da obra:
  - Recebido
  - Em diagnóstico
  - Em reparação
  - Pronto
  - Entregue
- Fotografias "Antes" e "Depois", usando diretamente a câmara do telefone.
- Pesquisa rápida por nome, telefone, NIF, nº da obra, matrícula ou referência do turbo.
- Histórico de mudanças de estado.
- Atualização em tempo real entre aparelhos.
- Fotos guardadas num bucket privado do Supabase.

## 1. Criar o projeto Supabase

1. Criar um projeto em https://supabase.com
2. Abrir **SQL Editor**.
3. Copiar todo o conteúdo de `supabase/schema.sql`.
4. Executar o SQL.

Isto cria as tabelas, funções, regras de segurança, bucket de fotos e Realtime.

## 2. Criar os utilizadores da oficina

No Supabase:

`Authentication` → `Users` → `Add user`

Cria os dois utilizadores, por exemplo:
- telefone1/oficina@...
- telefone2/oficina2@...

Podem também utilizar a mesma conta nos dois telemóveis, embora seja melhor usar contas diferentes.

## 3. Configurar variáveis de ambiente

Copia:

```bash
cp .env.example .env.local
```

No Supabase, abre **Connect** e copia:
- Project URL
- Publishable key

Preenche `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Nunca coloques uma `service_role` key no frontend.

## 4. Executar no computador

Requer Node.js recente.

```bash
npm install
npm run dev
```

Abre:

```text
http://localhost:3000
```

## 5. Colocar no GitHub

Dentro da pasta:

```bash
git init
git add .
git commit -m "Primeira versão da app 3VolutionTurbos"
git branch -M main
git remote add origin https://github.com/TEU-UTILIZADOR/3volution-turbos.git
git push -u origin main
```

O `.env.local` está ignorado pelo Git e não será enviado para o GitHub.

## 6. Publicar na Vercel

1. Entrar em https://vercel.com
2. `Add New` → `Project`
3. Escolher o repositório GitHub.
4. Adicionar as duas Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. Fazer Deploy.

Depois basta abrir o endereço Vercel nos dois telemóveis.

## Segurança

A versão inicial usa Row Level Security e só permite acesso a utilizadores autenticados. Como esta aplicação é para uma única oficina, os utilizadores autenticados veem as mesmas obras.

Se no futuro a aplicação for usada por várias oficinas diferentes, deve ser acrescentado um modelo multi-tenant (por exemplo `workshop_id`) para isolar os dados de cada empresa.

## Próximas melhorias sugeridas

- Edição de dados completos da folha de obra.
- Stock / peças.
- Preço, orçamento e estado de pagamento.
- PDF/impressão da folha de obra.
- Assinatura do cliente.
- Envio de SMS/WhatsApp quando a obra está pronta.
- Relatórios mensais.
- Perfis e permissões por funcionário.
- PWA instalável no ecrã inicial.
"# 3volution-turbos-gpt" 
