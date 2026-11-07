# Linha do tempo visual dos treinos

## Intenção

Adicionar à prévia semanal uma coluna visual que mostre, de forma rápida e fiel, a ordem e a distância das etapas de cada sessão. A referência escolhida é a opção A: uma linha do tempo horizontal por treino, com blocos de aquecimento, esforço, recuperação e desaquecimento.

## Objetivos

- Exibir uma linha do tempo em todas as linhas de sessão da tabela do site.
- Dimensionar os blocos pela distância e distinguir fases por cor e intensidade visual.
- Mostrar cada repetição de trabalho e recuperação nos treinos intervalados, de limiar e fartlek; dividir o progressivo por trechos de esforço.
- Representar treinos leves e longos como contínuos, preservando suas fases e o ritmo leve.
- Usar uma legenda única acima da tabela e manter as informações textuais atuais.
- Garantir que a linha do tempo e a representação textual venham da mesma estrutura de dados, sem interpretar descrições em prosa.
- Tornar as etapas compreensíveis sem depender exclusivamente das cores, incluindo nomes, distâncias e ritmos em texto acessível.

## Não objetivos

- Alterar ritmos, distâncias ou a prescrição dos treinos.
- Incluir o desenho na planilha XLSX; nesta entrega ele aparece somente na prévia do site.
- Substituir a tabela semanal por um painel separado ou por uma imagem estática.
- Permitir que a pessoa personalize cores ou escalas.

## Abordagens consideradas

1. **Segmentos estruturados no gerador (escolhida):** o plano fornece cada etapa em ordem, com tipo, distância, ritmo e rótulo; a prévia desenha essa sequência. Isso preserva correspondência entre prescrição e gráfico para todos os tipos de sessão.
2. **Interpretar as descrições atuais:** evitaria alterar o modelo, mas dependeria da redação e localização textual para inferir repetições, distâncias e recuperações; mudanças de texto poderiam quebrar ou falsificar o desenho.
3. **Desenhar uma aproximação por tipo de sessão:** descartada porque não mostraria a quantidade e a ordem reais de repetições que aparecem na prescrição.

## Decisões e restrições

- `WorkoutSession` atualmente contém distâncias gerais de aquecimento, parte principal e desaquecimento; as repetições e recuperações das sessões de qualidade são codificadas em `description`.
- Adicionar segmentos ordenados à sessão, gerados a partir da prescrição real. A descrição existente deve continuar disponível para as células textuais da tabela; a prévia não deve tentar extrair dados desse texto.
- A soma das distâncias dos segmentos deve continuar correspondendo à distância total planejada da sessão, com a precisão de 0,01 km já usada pelo gerador.
- Cada sessão aparece na prévia: corrida leve e longo mostram sequência leve; limiar, intervalado e fartlek mostram trabalho e recuperação repetidos; progressivo mostra seus trechos fácil, moderado e limiar; aquecimento e desaquecimento permanecem visíveis.
- A largura representa distância relativa dentro do treino. A cor/altura distingue esforço e fase. Segmentos muito curtos devem continuar perceptíveis e ter rótulo acessível; cores não são o único meio de identificação.
- A tabela já tem rolagem horizontal; manter a miniatura compacta e incluir uma legenda única fora das linhas.
- A exportação XLSX e o cálculo do plano permanecem sem alterações funcionais.

## Critérios de sucesso

Cada sessão da prévia contém uma sequência visual correspondente aos seus segmentos estruturados. Testes comprovam que os segmentos das quatro modalidades de qualidade e das sessões leves/longas representam a distância planejada, mantêm a ordem, e que o gráfico não exige alterações na exportação XLSX. A interface mantém os textos atuais e permite compreender cada fase sem depender apenas de cor.
