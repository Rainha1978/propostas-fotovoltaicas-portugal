# Propostas Fotovoltaicas Portugal

Aplicacao web inicial para receber leads, calcular uma proposta fotovoltaica indicativa, guardar estado comercial e gerar PDF. As integracoes com WhatsApp, Facebook e email ficam preparadas na arquitetura, mas ainda nao foram implementadas.

## Estado desta primeira versao

- Formulario de criacao de lead
- Listagem e detalhe de leads
- Motor de calculo isolado em `src/domain/solarCalculator.js`
- ROI real com autoconsumo direto e bateria
- Estrutura PostgreSQL em `database/schema.sql`
- Repositorio de dados ligado a PostgreSQL via `DATABASE_URL`
- Geracao server-side de PDF indicativo
- Testes unitarios para dimensionamento, paineis, bateria, trifasico e ROI
- Pontos de extensao reservados em `src/integrations`

## Instalar

```bash
npm install
cp .env.example .env
npm run dev
```

Abrir `http://localhost:3000`.

## Testes

```bash
npm test
```

Os testes usam `node:test`, por isso nao dependem de bibliotecas adicionais.

## Regras principais do motor

- Energia: `0.20 EUR/kWh`
- Producao anual: `1500 kWh/kWp`
- Fatura sem consumo informado: `fatura / 0.20`
- Dimensionamento por escaloes ate `6 kWp`
- Painel 595W apenas para telhado sanduiche em res do chao
- Hibrido quando ha bateria ou consumo principal noturno
- Trifasico com bateria usa DEYE + GSL HV como opcao principal
- Preco final apresenta sem IVA, IVA a 23% e total com IVA

## Proximos passos naturais

1. Ligar autenticacao simples de administrador.
2. Adicionar exportacao CSV/Excel.
3. Criar fila de lembretes: 24h sem resposta, 3 dias e 7 dias apos proposta.
4. Ligar entradas externas: site, Facebook Lead Ads e WhatsApp Business API.
