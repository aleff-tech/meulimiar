# Design: gerador de planilhas de corrida

**Status:** aprovado pelo usuário.

## Intenção

Criar uma página estática, publicada no GitHub Pages, que ajude corredores de rua a montar e baixar uma planilha de preparação para 3 km, 5 km, 10 km, meia maratona ou maratona. A planilha usa uma marca recente de 5 km para sugerir ritmos e usa a rotina atual do corredor para organizar um ciclo semanal. A página deve ser simples de preencher e o arquivo baixado deve ser útil sem depender da conexão com o site.

## Objetivos

- Gerar no navegador uma planilha XLSX com um calendário semana a semana, treinos por sessão, distâncias e ritmos sugeridos.
- Ajustar a proposta à distância-alvo, marca de 5 km, quilometragem semanal atual, sessões por semana, preferência de carga e semanas disponíveis.
- Calcular e exibir o IMC a partir de peso e altura, apenas como informação.
- Hospedar a aplicação como conteúdo estático no GitHub Pages; não enviar os dados do usuário a um servidor.
- Oferecer uma experiência de página única, com validação e prévia antes do download.

## Fora de escopo

- Criar conta, guardar dados, sincronizar dispositivos, usar GPS ou conectar com relógios.
- Prever o tempo final em outra distância, substituir avaliação médica ou oferecer recomendações para lesões/doenças.
- Usar IMC para definir ritmos, volume ou intensidade.
- Gerar recomendações clínicas ou afirmar que o plano é uma prescrição individual de treinador.

## Critérios de sucesso

- O usuário consegue preencher os dados, entender os ritmos sugeridos, conferir o plano e baixar um XLSX que abre corretamente em aplicativos de planilha.
- Os ritmos nos três pontos informados pelo usuário são reproduzidos exatamente, e marcas entre eles recebem valores coerentes.
- O número de sessões e o volume atual são respeitados ao montar o calendário; as restrições de segurança são visíveis e não podem ser anuladas pelo modo agressivo.
- A página funciona ao ser publicada no caminho de projeto do GitHub Pages, sem backend.

## Abordagens consideradas

1. **Aplicação estática React, TypeScript e XLSX no navegador — escolhida.** Permite manter formulário, validação, prévia e regras de treino organizadas e gerar uma planilha formatada sem servidor. Exige dependências e configuração de build, mas corresponde à experiência e ao formato de arquivo solicitados.
2. **HTML/CSS/JavaScript sem framework e exportação CSV.** Menos dependências e configuração; CSV é simples, mas oferece formatação e organização de abas inferiores às de um XLSX.
3. **Serviço de backend para gerar a planilha.** Centralizaria as regras, mas exige hospedagem e manutenção de servidor, contradizendo a preferência por uma página autônoma no GitHub Pages.

## Decisões acordadas

- **Interface:** uma página única, conforme a opção visual A escolhida pelo usuário.
- **Publicação:** aplicação client-side estática no GitHub Pages.
- **Planilha:** arquivo XLSX criado no navegador; sem conta e sem persistência de dados.
- **Distâncias-alvo:** 3 km, 5 km, 10 km, 21,1 km e 42,2 km.
- **Tempo de referência:** tempo recente de prova de 5 km inserido em horas, minutos e segundos. A distância-alvo continua sendo uma escolha separada.
- **Quilometragem atual:** incluir um campo de km corridos por semana para orientar o volume inicial.
- **Rotina:** usuário escolhe quantas sessões de corrida faz por semana, quantas semanas tem até a prova e uma preferência mais leve ou mais agressiva.
- **IMC:** calcular `peso em kg / altura em metros²`, exibir o resultado como informativo e não usá-lo para prescrever treino.
- **Ritmos-âncora fornecidos pelo usuário** (minutos por km):

  | Marca de 5 km | Leve | Limiar | Tiro |
  |---|---:|---:|---:|
  | 20:00 | 5:20 | 4:15 | 3:55 |
  | 22:30 | 6:00 | 4:45 | 4:25 |
  | 25:00 | 6:40 | 5:15 | 4:50 |

- **Cálculo dos ritmos:** interpolar linearmente cada categoria entre as marcas de 5 km. Fora do intervalo de 20:00–25:00, usar o ritmo da âncora mais próxima e avisar que o resultado está limitado à faixa de referência, em vez de extrapolar sem dados.
- **Calendário:** detalhar cada sessão por semana, com tipo de treino, distância e ritmo-alvo. Distribuir treinos leves, sessão(ões) de qualidade, longo e descanso conforme a distância e a frequência escolhidas; incluir recuperação e redução antes da prova. Sem dias da semana cadastrados, identificar as sessões como "Treino 1", "Treino 2" etc.
- **Carga:** começar da quilometragem semanal informada. O modo mais agressivo pode concentrar mais trabalho de qualidade e o mais leve favorece recuperação; semanas mais numerosas permitem uma progressão mais gradual. Nenhuma combinação de preferência e prazo deve forçar aumento brusco de carga. Exibir aviso claro quando o prazo for curto para a distância escolhida.
- **Conteúdo do XLSX:** uma aba de resumo com os dados, IMC e ritmos; outra aba com o calendário completo. Usar nomes e unidades em português e ritmos no formato `min:seg/km`.
- **Tratamento dos dados:** cálculos e exportação ficam no navegador. Não persistir os dados após a sessão.

## Restrições e cuidados

- O repositório atualmente contém apenas um README, sem aplicação ou stack estabelecida.
- O GitHub Pages serve arquivos estáticos; o build precisa respeitar o caminho-base do repositório.
- O campo de quilometragem semanal não informa há quanto tempo esse volume é mantido. Por isso, o plano deve ser apresentado como orientação geral, iniciar de forma conservadora e evitar saltos grandes; o modo agressivo não remove limites de segurança.
- A marca de 5 km e os três ritmos são estimativas de entrada, não avaliação fisiológica. Mostrar os ritmos como alvos orientativos e esclarecer que desconforto, fadiga persistente ou lesão exigem reduzir/interromper o treino e procurar orientação apropriada.
- Validar entradas obrigatórias, valores positivos, formato do tempo e limites razoáveis para peso, altura, quilometragem, sessões e semanas. Não gerar sucesso aparente com dados incompletos ou inválidos.

## Deixado para o construtor

- Escolher componentes e estilo visual consistentes com uma página responsiva e acessível.
- Definir o intervalo permitido para semanas e sessões e os avisos de entrada, sem aceitar ciclos impossíveis ou inseguros.
- Implementar templates determinísticos por distância, duração e frequência, respeitando a progressão conservadora descrita acima; manter os cálculos de ritmo e de calendário separados da interface para facilitar testes.
- Escolher uma biblioteca XLSX compatível com execução no navegador e configurar o build/publicação no GitHub Pages.
- Definir texto curto de orientação e mensagens de validação em português brasileiro.
