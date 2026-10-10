# FitQuest

Acompanhe e **gamifique** sua jornada fitness: treino, dieta, avaliação física e progresso — com níveis, XP, missões e conquistas. Visual neo-brutalista, claro/escuro, mobile-first, instalável (PWA) e funciona offline.

## Funcionalidades

**Hoje (painel gamificado)**
- Nível, XP do dia, sequência de dias ativos, missões diárias (refeições, proteína, kcal, água, treino, pesagem) e “dia perfeito”.
- Semana: calendário de atividade e missões semanais (frequência de treino, proteína 5/7, diário 6/7, volume por grupo).

**Treino**
- Rotinas próprias ou modelos prontos (Full body, Upper/Lower, PPL, ABC); 65+ exercícios por grupo muscular + exercícios personalizados.
- Sessão ao vivo: carga, reps, **RPE** e **%RM** (opcionais), aquecimento, timer de descanso, cargas da última sessão e sugestão de progressão (dupla progressão).
- PR detectado em tempo real (1RM estimado — Epley, com RIR via RPE).
- Histórico editável, gráfico de evolução por exercício (1RM, carga máx., volume) e **séries semanais por grupo muscular** com faixa de referência 10–20.

**Outras atividades** (Corrida, Caminhada, Ciclismo, Natação, HIIT/Funcional, Esportes, Outro)
- Treino separado por categoria; cada uma com suas métricas: distância, duração, pace (min/km ou /100 m) ou velocidade (km/h), FC média, elevação, cadência, rounds, RPE e kcal estimadas.
- Cronômetro com pausa (continua contando com a tela bloqueada) ou registro manual; treinos planejados com meta de distância/tempo.
- Histórico, volume semanal, gráficos de ritmo e FC, recordes (maior distância, melhor pace/velocidade) que valem XP e conquistas (5K, 10K, meia maratona…).
- Excluir treinos da rotina e do histórico direto na lista.

**Dieta**
- Diário por refeição com a **Tabela TACO completa** (4ª ed., 591 alimentos) + alimentos personalizados; busca sem acento, recentes, copiar dia anterior.
- **Cálculo de macros**: TMB (Mifflin-St Jeor ou Katch-McArdle quando há % de gordura), fator de atividade, ajuste por objetivo; recalcula sozinho quando você registra peso/BF. Metas manuais opcionais.
- **Plano alimentar automático** a partir de um questionário (nº de refeições, restrições, preferências, aversões), com porções resolvidas para bater os macros e substituições equivalentes.

**Corpo**
- Avaliação simplificada: peso, cintura, pescoço (e quadril para mulheres) → **% de gordura** (Marinha dos EUA; RFM como alternativa), massa magra/gorda, IMC.
- Fotos de progresso (frente/lado/costas) guardadas no aparelho e comparação **antes × depois**.
- Gráficos de peso (com média móvel) e % de gordura.

**Jornada**
- Curva de níveis com títulos, histórico de XP, mapa de constância, objetivos pessoais (peso, BF, carga, livre) e 25 conquistas.
- O XP é **derivado dos registros** (não acumulado): editar/apagar ajusta tudo — sem XP duplicado.

## Rodando

Não há build. Sirva a pasta com qualquer servidor estático:

```bash
npm start            # python3 -m http.server 5173
# abra http://localhost:5173
```

Funciona direto no GitHub Pages (index.html na raiz).

Testes das regras de negócio (Node 20+):

```bash
npm test
```

## Estrutura

```
index.html, manifest.webmanifest, sw.js   PWA
css/style.css                              design system
vendor/                                    Preact + htm (sem build)
js/app.js                                  shell, rotas, feedback de XP
js/calc.js                                 BF, TMB, macros, 1RM
js/dietgen.js                              gerador de plano alimentar
js/game.js                                 XP, níveis, missões, conquistas
js/training.js                             histórico, PRs, volume, progressão
js/selectors.js / store.js                 estado (localStorage) e seletores
js/photos.js                               fotos (IndexedDB)
js/data/taco.js, exercises.js              TACO e biblioteca de exercícios
js/views/*                                 telas
tests/                                     testes (node:test)
```

## Dados e privacidade

Tudo fica no navegador do aparelho (localStorage + IndexedDB). Use **Ajustes → Backup** para exportar/importar (com ou sem fotos).

Ao publicar uma nova versão, altere `VERSION` em `sw.js` para renovar o cache offline.

## Créditos

- TACO — Tabela Brasileira de Composição de Alimentos, NEPA/UNICAMP, 4ª ed. (dados obtidos de raulfdm/taco-api).
- Preact e htm (MIT).

Estimativas não substituem avaliação de profissionais de saúde.
