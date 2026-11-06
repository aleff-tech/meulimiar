# Plano de corrida orientado por objetivo

**Status:** rascunho para aprovação; nenhuma implementação desta reformulação foi iniciada.

## Intenção

Transformar o gerador atual em um plano de preparação orientado pela distância, pelo tempo final desejado e pela data da prova. A pessoa deve receber uma progressão periodizada de resistência e velocidade, além de alertas honestos quando o prazo ou a meta forem exigentes. O plano continua sendo uma ferramenta geral de orientação, não uma prescrição individual nem uma garantia de resultado.

## Objetivos

- Manter as distâncias disponíveis: 3 km, 5 km, 10 km, meia maratona (21,1 km) e maratona (42,2 km).
- Manter a marca recente de 5 km, o volume semanal atual, as sessões por semana, peso e altura como dados de entrada.
- Pedir confirmação de maioridade para exibir a orientação de IMC voltada a adultos; a confirmação não é necessária para gerar o plano.
- Substituir “semanas disponíveis” e “preferência de carga” pela data da prova e pelo tempo total desejado para a distância selecionada. O tempo usa campos de horas, minutos e segundos.
- Organizar o plano em fases de base, desenvolvimento, preparação específica e polimento, distribuídas até a prova.
- Quando a meta for ambiciosa ou o prazo curto, gerar um plano reduzido e conservador com alerta; não bloquear o plano, forçar carga para compensar o prazo ou apresentar a meta como garantida.
- Exibir semanas de calendário iniciadas na segunda-feira, com períodos datados e a data da prova.
- Reunir aquecimento, treino principal e desaquecimento em uma só coluna “Treino principal”, preservando as etapas e seus ritmos na descrição completa.
- Atualizar a planilha XLSX para refletir os novos dados e o treino consolidado.
- Manter a visualização de cada sessão como blocos contíguos: largura proporcional à duração no eixo X e altura representando velocidade.

## Não objetivos

- Garantir que o tempo-alvo será alcançado, fornecer diagnóstico ou substituir orientação profissional.
- Usar o IMC para alterar automaticamente os ritmos ou a carga. A informação atual do IMC continua sendo um aviso de triagem, não um diagnóstico ou uma regra automática de prescrição.
- Adicionar cadastro, persistência remota, acompanhamento de resultados reais ou integração com serviços externos.
- Incorporar o gráfico de blocos ao XLSX; a representação visual permanece na prévia web, enquanto a planilha exporta os dados e as instruções textuais.
- Introduzir novas modalidades de treino além das já geradas pelo plano atual.

## Abordagens consideradas

1. **Rampa gradual de ritmos:** interpolar os ritmos de treino atuais em direção a ritmos calculados para a meta, semana a semana. É simples de explicar, mas tende a distribuir a mudança uniformemente e não representa tão bem a função distinta de cada período.
2. **Periodização por fases (escolhida):** distribuir base, desenvolvimento, especificidade e polimento conforme as semanas até a prova; a composição dos treinos evolui com essas fases. É mais alinhada ao objetivo declarado de desenvolver resistência e velocidade, embora exija mudanças maiores no modelo do plano.
3. **Manter os ritmos atuais e usar a meta apenas no resumo:** seria a mudança mais simples, mas não faria a data e o tempo orientarem efetivamente o treino; por isso não atende ao pedido.

## Decisões e restrições

### Formulário e calendário

- O tempo-alvo é o tempo total de chegada para a distância selecionada; a data informada é o dia da prova.
- A data deve ser futura. O ciclo começa na data atual e usa semanas de calendário de segunda a domingo. A primeira e a última semana podem ser parciais; nenhuma sessão pode ser datada antes do início do ciclo, e a data da prova deve aparecer explicitamente.
- Mostrar a prova como um evento separado no dia selecionado, fora da tabela de sessões, da frequência semanal e do volume de treino.
- **Chamada de implementação:** preservar o limite superior atual de 24 semanas para manter o tamanho do plano controlado. Ciclos abaixo de quatro semanas continuam válidos, mas recebem alerta e não tentam comprimir todas as fases em uma progressão acelerada.
- Preservar os limites de entrada já existentes para peso, altura, distância, frequência e tempo de 5 km, ajustando o parser para remover `weeksAvailable` e `preference` e validar `raceDate` e `goalTimeSeconds`.
- A marca atual de 5 km continua sendo a referência dos ritmos leve, limiar e tiro. Os valores de referência já existentes — 20:00 (5:20, 4:15, 3:55 min/km), 22:30 (6:00, 4:45, 4:25) e 25:00 (6:40, 5:15, 4:50) — não devem ser alterados nesta reformulação. A limitação fora da faixa de referência continua acompanhada de aviso.

### Geração e segurança do plano

- Substituir a progressão baseada na preferência por uma progressão única e prudente. A quilometragem semanal informada é a condição inicial; não deve ser aumentada para “recuperar” semanas que faltam.
- Distribuir os treinos pelas fases:
  - **Base:** predominância de corrida contínua confortável e longão, com estímulos de qualidade moderados.
  - **Desenvolvimento:** progressão dos estímulos de limiar e intervalados, preservando recuperação.
  - **Específica:** incluir blocos de esforço relacionados ao ritmo-alvo, junto dos outros estímulos adequados à distância.
  - **Polimento:** reduzir o volume antes da prova, mantendo apenas estímulos curtos e controlados.
- Reutilizar os tipos e estruturas atuais (leve/contínuo, longo, limiar, intervalado, fartlek e progressivo) e suas descrições estruturadas. A referência indicada para a variedade e os objetivos dos treinos é [Olympics.com — Treino de corrida: conheça tipos](https://www.olympics.com/pt/noticias/treino-de-corrida-conheca-tipos).
- Manter a regra existente de uma sessão de qualidade no máximo por semana quando a frequência permite; com uma ou duas sessões semanais, preservar a distribuição atual sem inventar sessões adicionais.
- Manter semanas de recuperação e polimento final como conceitos, adaptados ao calendário e às fases. **Chamada de implementação:** usar como teto de progressão de volume o aumento de 5% do modo leve atual; manter a redução de recuperação de 20% a cada quarta semana e o polimento final em 60% do pico. Esses valores são limites do gerador, não garantias contra lesões.
- Usar o ritmo-alvo como objetivo de sessões específicas, não como predição garantida. **Chamada de implementação:** comparar o tempo-alvo com uma equivalência de desempenho de 5 km usando a fórmula de Riegel (expoente 1,06), exclusivamente como heurística; emitir alerta quando a meta for pelo menos 5% mais rápida que a estimativa. Se o ritmo-alvo for mais rápido que o ritmo de tiro calculado da marca atual, limitar os blocos prescritos a esse ritmo de tiro e manter a meta solicitada visível. Não afirmar que o cálculo prevê o resultado individual.
- Preservar os avisos existentes para tempo de ciclo mínimo por distância, distância longa insuficiente, sessão curta e adaptação de treino de qualidade. O prazo insuficiente gera aviso e plano reduzido, nunca uma escalada de volume/intensidade para compensar.
- Continuar exibindo o valor do IMC como informativo. Exibir a orientação atual para IMC adulto igual ou acima de 30 somente após confirmação de maioridade: considerar esforço mais leve, progressão conservadora e alternativa de menor impacto, sem afirmar que isso evita lesões e sem modificar automaticamente o plano. Sem confirmação, não mostrar interpretação ou orientação específica de IMC adulto.

### Prévia e visualização

- A tabela mantém semana, sessão, distância, ritmo-alvo e estrutura visual. Remover as colunas separadas de aquecimento e desaquecimento; a célula “Treino principal” contém a sessão inteira em ordem, incluindo aquecimento, trabalho/recuperação e desaquecimento.
- A linha do tempo usa os mesmos segmentos estruturados que formam a descrição do treino. A duração de cada segmento é distância × ritmo; a largura representa a proporção dessa duração no treino completo. A altura representa velocidade em km/h, com escala legível e consistente entre os segmentos de uma sessão.
- Manter fases identificáveis por texto acessível, nome e legenda, sem depender apenas de cor. A legenda inclui aquecimento e desaquecimento, apesar de não serem colunas próprias.
- Identificar a fase de treinamento e o intervalo de datas por semana para que a periodização e a data final sejam compreensíveis na prévia. Exibir o evento da prova separadamente, sem contá-lo como uma sessão de treino.

### Exportação XLSX

- Atualizar o resumo com distância, tempo-alvo, data da prova, marca atual de 5 km, perfil/ritmos, IMC, avisos e confirmação de maioridade quando marcada; remover “Preferência de carga” e substituir “Semanas até a prova” por data e duração calculada do ciclo.
- Atualizar “Plano semanal” com as datas da semana, fase, sessão, distância, ritmo e uma coluna única contendo o treino completo. Não exportar colunas separadas de aquecimento/desaquecimento nem a preferência antiga.
- Representar a prova como evento separado, sem somá-la às sessões ou ao volume semanal.
- Manter o gráfico de blocos exclusivo da prévia web; o XLSX representa as mesmas etapas na instrução textual consolidada.

## Critérios de sucesso

- O formulário aceita data e meta válidas, rejeita datas passadas e exibe mensagens de validação associadas aos campos.
- A quantidade de semanas e as fases correspondem ao intervalo entre hoje e a prova; semanas parciais não criam treinos em datas passadas.
- Metas ambiciosas e ciclos curtos produzem alertas e um plano conservador, sem crescimento compensatório ou promessa de resultado.
- A orientação adulta de IMC só aparece após a confirmação de maioridade; o evento da prova não conta como sessão nem altera o volume semanal.
- As sessões preservam distância total, ordenação dos segmentos, aquecimento e desaquecimento; somente a distribuição por fase e os estímulos específicos evoluem.
- A prévia apresenta uma coluna consolidada de treino e um gráfico cuja largura corresponde a tempo e cuja altura corresponde a velocidade.
- O XLSX inclui meta/data/fases e a instrução consolidada, sem preferência antiga ou colunas separadas de aquecimento/desaquecimento.
- Testes cobrem limites de data/tempo, fases curtas e longas, alertas, metas fora da faixa prudente, renderização da tabela/gráfico e conteúdo do XLSX; typecheck e build continuam passando.

## Chamadas deixadas à implementação

- Determinar a distribuição exata de semanas entre fases para planos curtos e longos, respeitando a distância-alvo, a frequência semanal, as semanas de recuperação e o polimento.
- Determinar a escala visual de velocidade e a forma de rotular semanas parciais, sem alterar a interpretação escolhida para X (tempo) e altura (velocidade).
