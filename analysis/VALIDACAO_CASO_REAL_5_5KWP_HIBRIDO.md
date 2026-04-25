# Validacao com caso real 5.5kWp hibrido 10kWh

Caso real fornecido:

| Linha | Real sem IVA |
| --- | ---: |
| 12 paineis 460W | 876.00 EUR |
| Inversor | 1100.00 EUR |
| Estrutura | 550.00 EUR |
| Bateria | 2640.00 EUR |
| Material eletrico | 240.00 EUR |
| Mao de obra | 550.00 EUR |
| Contador | 560.00 EUR |
| Extras | 100.00 EUR |
| Total | 6616.00 EUR |

## Modelo antes da calibracao

| Linha | Modelo anterior | Real | Diferenca |
| --- | ---: | ---: | ---: |
| Paineis | 948.00 EUR | 876.00 EUR | +72.00 EUR |
| Inversor | 1325.00 EUR | 1100.00 EUR | +225.00 EUR |
| Estrutura | 570.00 EUR | 550.00 EUR | +20.00 EUR |
| Bateria | 2960.00 EUR | 2640.00 EUR | +320.00 EUR |
| Material eletrico/protecoes | 325.00 EUR | 240.00 EUR | +85.00 EUR |
| Mao de obra total | 640.00 EUR | 550.00 EUR | +90.00 EUR |
| Contador | 550.00 EUR | 560.00 EUR | -10.00 EUR |
| Extras | 212.50 EUR | 100.00 EUR | +112.50 EUR |
| Total sem IVA | 7530.50 EUR | 6616.00 EUR | +914.50 EUR |

Principais desvios: bateria antiga Lynx (+320), inversor (+225), extras (+112.50), eletrica/protecoes (+85), paineis (+72). O valor de 1684 EUR/kWp vinha do preco com IVA; sem IVA eram 1369 EUR/kWp.

## Modelo depois da calibracao

| Linha | Modelo atual | Real | Diferenca |
| --- | ---: | ---: | ---: |
| Paineis | 876.00 EUR | 876.00 EUR | 0.00 EUR |
| Inversor | 1100.00 EUR | 1100.00 EUR | 0.00 EUR |
| Estrutura | 552.00 EUR | 550.00 EUR | +2.00 EUR |
| Bateria | 2640.00 EUR | 2640.00 EUR | 0.00 EUR |
| Material eletrico/protecoes | 240.00 EUR | 240.00 EUR | 0.00 EUR |
| Mao de obra total | 640.00 EUR | 550.00 EUR | +90.00 EUR |
| Contador | 560.00 EUR | 560.00 EUR | 0.00 EUR |
| Extras | 102.50 EUR | 100.00 EUR | +2.50 EUR |
| Total sem IVA | 6710.50 EUR | 6616.00 EUR | +94.50 EUR |

Nota sobre mao de obra: o MVP mantem a regra aprovada de 520 EUR para 12 paineis + 120 EUR por instalacao de bateria. Se o valor real de 550 EUR ja inclui a montagem da bateria, entao o modelo fica 90 EUR acima nessa linha por decisao explicita de regra.

## Resultado recalculado

| Indicador | Modelo anterior | Modelo atual | Diferenca |
| --- | ---: | ---: | ---: |
| Preco sem IVA | 7530.50 EUR | 6710.50 EUR | -820.00 EUR |
| IVA 23% | 1732.02 EUR | 1543.42 EUR | -188.60 EUR |
| Preco com IVA | 9262.52 EUR | 8253.92 EUR | -1008.60 EUR |
| EUR/kWp sem IVA | 1369.18 EUR/kWp | 1220.09 EUR/kWp | -149.09 EUR/kWp |
| EUR/kWp com IVA | 1684.09 EUR/kWp | 1500.71 EUR/kWp | -183.38 EUR/kWp |
| Bateria separada | 2960.00 EUR | 2640.00 EUR | -320.00 EUR |

Conclusao: com os coeficientes atuais, o hibrido monofasico 10kWh fica em 1220 EUR/kWp sem IVA, dentro do intervalo alvo de 1200-1400 EUR/kWp.
