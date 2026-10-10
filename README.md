# FitQuest

Acompanhe e **gamifique** sua jornada fitness: treino, dieta, avaliação física e progresso — com níveis, XP, missões e conquistas. Visual neo-brutalista, claro/escuro, mobile-first, instalável (PWA) e funciona offline.

## Funcionalidades

**Hoje (painel gamificado)**
- Nível, XP do dia, sequência de dias ativos, missões diárias (refeições, proteína, kcal, água, treino, pesagem) e “dia perfeito”.
- Semana: calendário de atividade e missões semanais (frequência de treino, proteína 5/7, diário 6/7, volume por grupo).

**Treino**
- Rotinas próprias ou modelos prontos (Full body, Upper/Lower, PPL, ABC); 65+ exercícios por grupo muscular + exercícios personalizados.
- Sessão ao vivo com barra fixa no topo (tempo de treino e descanso, com aviso sonoro/vibração).
- Séries com tipos: aquecimento, trabalho, top set, back-off, drop set, falha, rest-pause, myo-reps, cluster e negativa.
- Carga e reps se auto-preenchem nas séries de baixo; meta editável (reps, RPE, %, carga, descanso) e observações por exercício e por treino.
- Coluna de intensidade por exercício: **RPE** ou **%RM** (com 1RM de referência). Aba **RM** com calculadora (Epley, Brzycki, Lombardi) e tabela de %.
- Funciona offline (dieta e treino); sincroniza quando a conexão volta.
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

## Conta e nuvem (Supabase)

1. No Supabase → **SQL Editor**, rode `supabase/schema.sql` (tabelas, RLS, login por usuário e bucket de fotos).
2. Em `js/config.js`, preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY` (Project Settings → API).
3. Opcional: Authentication → Sign In / Providers → Email → desligue **Confirm email** para entrar logo após o cadastro.

Com isso o app pede **login (usuário + senha)** ou **cadastro (usuário, e-mail, senha)**; a sessão fica salva no aparelho. Os dados são gravados no aparelho na hora e sincronizados com a tabela `user_data` (último a gravar vence); fotos vão para o bucket privado `photos`. Funciona offline e envia quando a conexão volta. Os dados que já existiam no aparelho são levados para a conta no primeiro login.

Sem as chaves, o app funciona só no aparelho, como antes.

## Dados e privacidade

Tudo fica no navegador do aparelho (localStorage + IndexedDB). Use **Ajustes → Backup** para exportar/importar (com ou sem fotos).

Ao publicar uma nova versão, altere `VERSION` em `sw.js` para renovar o cache offline.

## Créditos

- TACO — Tabela Brasileira de Composição de Alimentos, NEPA/UNICAMP, 4ª ed. (dados obtidos de raulfdm/taco-api).
- Preact e htm (MIT).

Estimativas não substituem avaliação de profissionais de saúde.
