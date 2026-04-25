# Calibracao com orcamentos reais

Foram analisados 47 documentos indicados pelo utilizador. A extracao aproveitavel ficou sobretudo nos orcamentos/faturas com linhas de artigos, totais, datas e potencia explicita.

## Regras mantidas

- O dimensionamento por consumo mensal continua igual.
- A recomendacao on-grid vs hibrido continua baseada em bateria pedida ou consumo principal noturno.
- A escolha de painel 595W continua limitada a telhado sanduiche em res do chao.
- Trifasico com bateria continua a privilegiar DEYE + GSL HV como opcao principal.

## Coeficientes ajustados

- IVA atual do MVP: 23%.
- IVA historico observado nos documentos: 6%; usado apenas para interpretar orcamentos antigos, nao como regra atual.
- Painel pequeno/standard: 79 EUR por painel, calibrado pela mediana dos 460W.
- Painel grande: 99 EUR por painel, calibrado por 575W/590W/595W recentes.
- Estrutura telha lusa: 95 EUR por par de paineis, com minimo de 190 EUR.
- Estrutura sanduiche: 70 EUR por par de paineis.
- Estrutura triangular: 120 EUR por par de paineis, por prudencia.
- Mao de obra: deixou de ser proporcional direta ao kWp em instalacoes pequenas. Regra atual:
  - minimo tecnico considerado: 20 horas por instalacao;
  - on-grid simples ate 4 paineis: 360 EUR;
  - 5 a 6 paineis: 400 EUR;
  - 7 a 8 paineis: 440 EUR;
  - 9 a 10 paineis: 480 EUR;
  - 11 a 12 paineis: 520 EUR;
  - acima de 12 paineis: +40 EUR por cada 2 paineis;
  - hibrido: mesma base on-grid +120 EUR por bateria instalada no seu todo;
  - telha lusa dificil: +10 EUR por cada 2 paineis;
  - sanduiche simples: mantem valor base.
- Material eletrico/protecoes base: 165 EUR, com cabo proporcional as distancias introduzidas.
- Extras de instalacao: 35 EUR/kWp.

## Padroes observados

- On-grid domestico, sem outliers: mediana historica aproximada de 713 EUR/kWp com IVA a 6%; ajustado ao IVA atual fica cerca de 827 EUR/kWp.
- Hibrido domestico, sem outliers: mediana historica aproximada de 1226 EUR/kWp com IVA a 6%; ajustado ao IVA atual fica cerca de 1423 EUR/kWp.
- Casos pequenos abaixo de 2kWp ficam naturalmente mais caros por kWp por causa dos custos fixos.
- Casos grandes acima de 8kWp ficam mais baratos por kWp por diluicao de mao de obra, inversor e protecoes.
- A bateria e o principal fator de variacao: em sistemas pequenos, pode quase duplicar o EUR/kWp.
- A distancia nao aparece sempre explicita nos orcamentos, por isso foi mantida como coeficiente transparente de cabo/deslocacao em vez de ser absorvida no preco base.
- Telhado com salva-telhas/telha lusa tende a puxar estrutura para cima; sanduiche fica mais simples; triangular deve continuar conservador ate haver mais exemplos.

## Outliers evitados

- Orcamentos marcados como amigo/base sem todos os custos.
- Sistemas grandes comerciais ou semi-comerciais quando distorcem o EUR/kWp domestico.
- Documentos em que a potencia nao esta clara ou inclui valores de equipamentos que parecem potencia nominal de inversor/bateria.
- Faturas/orcamentos muito antigos usados apenas como referencia secundaria, porque os precos mudaram.

## Implementacao

Os coeficientes vivem em `src/domain/priceCalibration.js`. O motor continua em `src/domain/solarCalculator.js` e devolve tambem uma nota de calibracao para a pagina de detalhe do lead.
