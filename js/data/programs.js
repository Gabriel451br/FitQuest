// Modelos de programa em blocos. Cada bloco tem um papel claro:
//  Base        — poucos acessórios, mais compostos, reps mais altas, RPE e %RM baixos.
//  Hipertrofia — mais exercícios, RPE alto (acessórios perto da falha), volume.
//  Força       — básicos pesados (3–6 reps), acessórios só os necessários.
//  Potência    — poucos exercícios: específicos + explosivos, %RM alto, clusters e speed sets.
// Os básicos usam progressão por %RM ou RPE (ver js/periodization.js): %RM linear (+2,5%/sem),
// 5/3/1, Juggernaut ou autorregulada (top set em RPE + back-offs, estilo John Haack).
// Exercício: { exId, sets, reps, rest, note, prog, section, optional, superset, pct, groups, wave, supp, rpe, drop }

export const TEMPLATE_VERSION = 2;

const E = (exId, sets, reps, o = {}) => ({ exId, sets, reps: String(reps), rest: 90, prog: 'double', ...o });
// %RM linear: grupos [séries, reps, %, tipo]
const PCT = (exId, groups, o = {}) => {
  const gs = groups.map(([sets, reps, pct, kind = 'work', extra = {}]) => ({ sets, reps: String(reps), pct, kind, ...extra }));
  return { exId, prog: 'pct', groups: gs, sets: gs.reduce((a, x) => a + x.sets, 0), reps: gs[0].reps, rest: 180, ...o };
};
const W531 = (exId, supp, o = {}) => ({ exId, prog: 'w531', supp, sets: supp ? 8 : 3, reps: '5/3/1+', rest: 180, ...o });
const JUGG = (exId, o = {}) => ({ exId, prog: 'jugg', sets: 5, reps: '8', rest: 180, ...o });
const AUTO = (exId, sets, reps, o = {}) => ({ exId, prog: 'haack', sets, reps: String(reps), rest: 210, drop: 10, ...o });

const plan = (rows) => rows.map(([from, to, rpe, text, flag]) => ({ from, to, rpe, text, ...(flag === 'deload' ? { deload: true } : flag === 'test' ? { test: true } : {}) }));

// --- Dad Strength — War Machine ------------------------------------------------------------

const DAD_WARM = {
  A: ['5 min bike leve', 'Mobilidade de quadril e tornozelo, ponte de glúteo 2×10', 'Rotação externa com banda 2×15', 'Rampa do primeiro básico: barra vazia, 40%, 55%, 70%'],
  B: ['5 min remo leve', 'Gato-camelo, hip hinge com bastão 2×10', 'Dead hang 2×20 s', 'Rampa do terra: 40%, 55%, 70%'],
  C: ['5 min bike', 'Prehab de joelho (o do bloco)', 'Agachamento no peso corporal com pausa 2×8', 'Rampa do primeiro básico'],
};

export const PROGRAM_TEMPLATES = {
  'dad-strength': {
    version: TEMPLATE_VERSION,
    name: 'Dad Strength — War Machine',
    author: 'FitQuest', tagline: 'Build the body. Build the strength. Protect the family.', cover: '#d9772f',
    level: 'Intermediário', days: 3, sessionMin: 65, goals: ['forca', 'hipertrofia', 'potencia', 'jiu-jitsu'], equipment: 'Academia completa',
    schedule: ['Jiu', 'A', 'Jiu', 'B', 'Jiu?', 'C', 'Off'],
    desc: 'Ciclo de 20 semanas em 3 blocos bem diferentes: Base (6 sem, %RM baixo e poucos acessórios), Hipertrofia (8 sem, 5/3/1 + BBB e acessórios perto da falha) e Potência (6 sem, clusters, speed sets, explosivos e top sets autorregulados). 3 musculações/semana (A ter, B qui, C sáb) + 2–3 Jiu-Jitsu.',
    rules: [
      'Cada bloco tem um papel: Base constrói técnica e capacidade, Hipertrofia constrói massa, Potência transforma força em velocidade.',
      'Cargas dos básicos vêm do seu 1RM (Progresso → Meus 1RM, ou estimado pelo histórico). Atualize o 1RM a cada bloco.',
      '%RM linear: +2,5% por semana nos básicos. 5/3/1: o AMRAP da última série recalcula o 1RM estimado. Autorregulada: registre o RPE do top set.',
      'Aquecimento não conta como volume. Sem falha em agachamento, terra, supino e explosivos.',
      'Jiu-Jitsu também é carga: rola pesado na véspera → tire 1 série dos acessórios.',
      'Regra do joelho: dor crescente, inchaço, falseio ou perda de amplitude → interromper o estímulo e reavaliar.',
    ],
    sections: [
      { title: 'Como ler as prescrições', items: [
        '@65% = 65% do seu 1RM. "AMRAP 8+" = máximo de reps com técnica (mínimo 8).',
        'Cluster 5×2 = 5 blocos de 2 reps com 10–15 s de pausa entre as reps e 2–3 min entre os blocos.',
        'Speed set: carga leve, a barra precisa subir rápido. Perdeu velocidade, pare.',
        'Top set @RPE 8 = série pesada deixando ~2 reps na reserva; back-off = mesma reps com ~10% menos carga.',
      ] },
    ],
    blocks: [
      {
        name: 'Bloco 1 — Base', goal: 'preparacao', weeks: 6, progression: 'pct',
        weekPlan: plan([
          [1, 1, '6', 'Base: cargas em %RM baixas, técnica perfeita e 3–4 reps na reserva.'],
          [2, 3, '6-7', '+2,5% por semana nos básicos; acessórios em RPE 7.'],
          [4, 5, '7-8', 'Semanas mais pesadas da base — ainda sem falha.'],
          [6, 6, '5', 'Deload: 60% das séries e −10% de carga.', 'deload'],
        ]),
        objective: 'Consolidar os padrões (agachamento, terra, supino, desenvolvimento), criar capacidade de trabalho e preparar o joelho. Poucos acessórios, reps 6–10 nos compostos, 60–72% do 1RM, RPE 6–7.',
        criteria: 'Avançar quando os básicos estiverem tecnicamente sólidos em ~72% e o joelho tolerar bem o volume.',
        workouts: [
          { name: 'B1 · A — Base: Agachamento + Supino', sessionMin: 55, warmup: DAD_WARM.A, exercises: [
            E('spanish-squat', 2, '12-15', { note: 'Prehab: controle do quadríceps, sem dor relevante.', rest: 60 }),
            PCT('agachamento', [[4, 8, 62.5]], { note: 'Excêntrico de 3 s, amplitude tolerada.' }),
            PCT('supino-reto', [[4, 8, 62.5]], { note: 'Escápulas travadas, pausa curta no peito.' }),
            E('remada-apoio', 3, '10-12', { note: 'RPE 7.' }),
            E('desenvolvimento-halter', 3, '10-12', { note: 'RPE 7.' }),
          ] },
          { name: 'B1 · B — Base: Terra + Desenvolvimento', sessionMin: 55, warmup: DAD_WARM.B, exercises: [
            E('cadeira-extensora', 2, '12-15', { note: 'Prehab: amplitude e carga conforme tolerância.', rest: 60 }),
            PCT('levantamento-terra', [[4, 6, 62.5]], { note: 'Reinicie cada rep no chão. Coluna neutra.' }),
            PCT('desenvolvimento', [[3, 8, 60]], { note: 'Glúteo e abdômen travados.' }),
            E('barra-neutra', 4, '6-8', { note: 'Assistida se precisar. RPE 7.', rest: 120 }),
            E('farmer-walk', 3, '30m', { note: 'Pegada que não abre no fim do round.', rest: 90 }),
          ] },
          { name: 'B1 · C — Base: Unilateral + Posterior', sessionMin: 55, warmup: DAD_WARM.C, finisher: ['Caminhada rápida ou bike leve 15–20 min (Z2)'], exercises: [
            E('step-down', 2, '8-10', { note: 'Prehab, por perna. Só se liberado e sem sintomas.', rest: 60 }),
            E('zercher', 3, '8-10', { note: 'RPE 6–7; postura sólida.', rest: 150 }),
            E('supino-inclinado-halter', 3, '10-12', { note: 'RPE 7.' }),
            E('puxada-neutra', 3, '10-12', { note: 'Controle escapular. RPE 7.' }),
            E('hip-thrust', 3, '10-12', { note: 'Pausa no topo.' }),
          ] },
        ],
      },
      {
        name: 'Bloco 2 — Hipertrofia & Armor', goal: 'hipertrofia', weeks: 8, progression: 'double',
        weekPlan: plan([
          [1, 3, '8', '5/3/1 nos básicos (semanas 5s, 3s, 5/3/1) + acessórios em RPE 8–9.'],
          [4, 4, '5-6', 'Deload do ciclo 5/3/1: 40/50/60% e acessórios pela metade.', 'deload'],
          [5, 7, '8-9', 'Segundo ciclo: 1RM estimado atualizado pelos AMRAPs; última série dos acessórios perto da falha.'],
          [8, 8, '5-6', 'Deload antes do bloco de potência.', 'deload'],
        ]),
        objective: 'Máxima massa muscular: mais exercícios e mais séries, acessórios em RPE 8–9 (última série perto da falha). Básicos em 5/3/1 com BBB/FSL para volume sem perder força. Prioridade: antebraços, braços, trapézio, glúteos e panturrilhas.',
        volumeTargets: 'Séries/semana — Peitoral 10–14 · Costas 12–16 · Deltoides 10–14 · Bíceps 8–12 · Tríceps 8–12 · Antebraço 8–14 · Trapézio 8–12 · Quadríceps 8–12 · Posteriores 8–10 · Glúteos 8–12 · Panturrilhas 8–12.',
        criteria: 'Avançar com força mantida ou maior nos AMRAPs, volume bem tolerado e liberação para atividades explosivas.',
        workouts: [
          { name: 'B2 · A — Upper + braços', sessionMin: 75, warmup: DAD_WARM.A, short: 'Sem tempo: corte o supino inclinado e o superset de braço.', exercises: [
            W531('supino-reto', 'bbb', { note: '5/3/1 + BBB 5×10 @50% do TM.', section: 'Básico' }),
            E('desenvolvimento', 3, '8-10', { note: 'RPE 8.', section: 'Hipertrofia', rest: 120 }),
            E('remada-apoio', 4, '8-12', { note: 'RPE 8–9.', section: 'Hipertrofia' }),
            E('supino-inclinado-halter', 3, '8-12', { note: 'RPE 9 na última.', section: 'Hipertrofia', optional: true }),
            E('elevacao-lateral', 4, '12-20', { note: 'RPE 9, descida lenta.', section: 'Armor', rest: 60 }),
            E('rosca-scott', 3, '8-12', { note: 'Superset com tríceps. RPE 9.', section: 'Armor', superset: 'S1', optional: true }),
            E('triceps-polia', 3, '8-12', { note: 'Superset com rosca Scott.', section: 'Armor', superset: 'S1', optional: true }),
            E('rosca-punho', 2, '15-20', { note: 'Sem irritar punho/cotovelo.', section: 'Armor', rest: 60 }),
          ] },
          { name: 'B2 · B — Posterior, costas e pegada', sessionMin: 75, warmup: DAD_WARM.B, short: 'Sem tempo: corte o face pull e a panturrilha.', exercises: [
            W531('levantamento-terra', 'fsl', { note: '5/3/1 + FSL 5×5 na % da 1ª série.', section: 'Básico' }),
            E('barra-neutra', 4, '6-10', { note: 'RPE 8; com carga se ficar fácil.', section: 'Hipertrofia', rest: 120 }),
            E('remada-curvada', 3, '8-12', { note: 'Meio das costas. RPE 8–9.', section: 'Hipertrofia' }),
            E('encolhimento', 4, '10-12', { note: 'Pausa 1 s no topo. RPE 9.', section: 'Armor', rest: 75 }),
            E('rosca-martelo', 3, '10-12', { note: 'RPE 9.', section: 'Armor', rest: 75 }),
            E('face-pull', 3, '15-20', { note: 'Saúde do ombro.', section: 'Armor', rest: 60, optional: true }),
            E('plate-pinch', 3, '20-40', { note: 'Segundos. Pinça forte.', section: 'Armor', rest: 60 }),
            E('panturrilha-sentado', 4, '10-20', { note: 'Ênfase em sóleo.', section: 'Armor', rest: 60, optional: true }),
          ] },
          { name: 'B2 · C — Lower & Armor', sessionMin: 80, warmup: DAD_WARM.C, short: 'Sem tempo: corte a rosca inversa e o tríceps francês.', exercises: [
            E('prehab-joelho', 1, '5-8', { note: 'Minutos. Variações toleradas.', rest: 0 }),
            W531('agachamento', 'fsl', { note: '5/3/1 + FSL 5×5. Joelho manda.', section: 'Básico' }),
            E('leg-press', 3, '10-15', { note: 'RPE 8–9, sem travar o joelho.', section: 'Hipertrofia', rest: 120 }),
            E('hip-thrust', 3, '8-12', { note: 'Pausa no topo. RPE 9.', section: 'Hipertrofia' }),
            E('mesa-flexora', 3, '10-15', { note: 'Excêntrico controlado. RPE 9.', section: 'Hipertrofia', rest: 75 }),
            E('puxada-neutra', 3, '10-12', { note: 'RPE 8.', section: 'Hipertrofia' }),
            E('rosca-inversa', 3, '12-15', { note: 'Braquiorradial.', section: 'Armor', rest: 60, optional: true }),
            E('triceps-frances', 3, '10-15', { note: 'Cabeça longa.', section: 'Armor', rest: 75, optional: true }),
            E('panturrilha-pe', 4, '8-15', { note: 'Pausa no alongamento.', section: 'Armor', rest: 60 }),
          ] },
        ],
      },
      {
        name: 'Bloco 3 — Power & Combat Athlete', goal: 'potencia', weeks: 6, progression: 'haack',
        weekPlan: plan([
          [1, 1, '7', 'Potência: top sets @RPE 7, clusters e explosivos descansados.'],
          [2, 3, '8', 'Top set @RPE 8 — a carga vem do 1RM estimado do dia. Clusters +2,5%.'],
          [4, 5, '9', 'Pico: top set @RPE 9, sem falha. Explosivos com intenção máxima.'],
          [6, 6, '9', 'Teste/transição: top single @9 nos básicos (ou deload se acumulou cansaço) e medidas.', 'test'],
        ]),
        objective: 'Converter força em produção rápida de força: poucos exercícios, específicos (clean, saltos, push press) e só os acessórios necessários (pegada, puxada). %RM alto (75–90%), clusters e speed sets. Exige liberação para saltos e aterrissagens.',
        criteria: 'Fim do ciclo: compare top sets e 1RM estimados com o bloco 1 e escolha o próximo ciclo pelos dados.',
        workouts: [
          { name: 'B3 · A — Power + Agachamento', sessionMin: 55, warmup: DAD_WARM.A, exercises: [
            E('prehab-joelho', 1, '5-8', { note: 'Minutos.', rest: 0 }),
            PCT('power-clean', [[5, 2, 70, 'speed']], { note: 'Clean pull ou power clean (só com técnica liberada). Parar se a velocidade cair.', rest: 120 }),
            AUTO('agachamento', 4, '3', { note: 'Top set + 3 back-offs −10%.' }),
            AUTO('supino-pausado', 4, '2-3', { note: 'Pausa de 2 s no peito.', drop: 8 }),
          ] },
          { name: 'B3 · B — Terra cluster + Pegada', sessionMin: 50, warmup: DAD_WARM.B, finisher: ['Sprints 4×40 m (descanso completo) — só se liberado'], exercises: [
            PCT('levantamento-terra', [[5, 2, 80, 'cluster']], { note: 'Cluster: 2 reps com 10–15 s entre elas; 3 min entre os blocos.' }),
            E('barra-neutra', 4, '3-5', { note: 'Com carga, RPE 8.', rest: 150 }),
            E('farmer-walk', 4, '20m', { note: 'Pesado e rápido — pegada de luta.', rest: 120 }),
            E('plate-pinch', 3, '15-30', { note: 'Segundos. Isometria de alta qualidade.', rest: 60 }),
          ] },
          { name: 'B3 · C — Explosivos + Push press', sessionMin: 50, warmup: DAD_WARM.C, exercises: [
            E('salto-vertical', 3, '5', { note: 'Pliometria: máximo de altura, aterrissagem macia com joelhos levemente flexionados. Só se liberado.', prog: 'explosive', rest: 90 }),
            PCT('agachamento', [[6, 2, 60, 'speed']], { note: 'Speed sets: a barra sobe rápido. 60 s entre as séries.', rest: 60 }),
            AUTO('push-press', 3, '3', { note: 'Top set + 2 back-offs.' }),
            E('flexao-pliometrica', 4, '5', { note: 'Mãos saem do chão. Parou de explodir, pare.', prog: 'explosive', rest: 90 }),
            E('hip-thrust', 3, '5', { note: 'Subida explosiva, descida controlada.', prog: 'explosive', rest: 120 }),
          ] },
        ],
      },
    ],
  },
};

// --- Tronco de Árvore — Strongman × Jiu-Jítsu ---------------------------------------------

const TRONCO_WARM = {
  A: ['5 min bike ou remo leve', 'Ponte de glúteo 2×10, gato-camelo, rotação torácica no chão 8/lado', 'Dead hang 2×20 s e rotação externa de ombro com banda 2×15', 'Rampa do terra: barra vazia, 40%, 60%, 80% da carga do dia'],
  B: ['5 min bike leve', 'Ponte de glúteo 2×10, agachamento no peso corporal com pausa 2×8, mobilidade de tornozelo', 'Rotação externa de ombro com banda 2×15, dead hang 2×20 s', 'Rampa do agachamento: barra vazia, 40%, 60%, 80% da carga do dia'],
  C: ['5 min remo ou bike', 'Ponte de glúteo 2×12, rotação torácica, mobilidade de quadril sem torcer o joelho', 'Rampa do push press: barra vazia, 40%, 60%, 80%', 'Dead hang 2×20 s'],
};
const DAY = { A: 'Puxada pesada + Trapézio', B: 'Pernas + Ombros + Puxada vertical', C: 'Strongman funcional + Hipertrofia' };
const F = 'Força principal';
const H = (x) => `Hipertrofia · ${x}`;
const J = 'Funcional · jiu';
const T = 'Tronco de árvore';

const TRONCO_BLOCKS = [
  {
    name: 'Bloco 1 — Base', goal: 'preparacao', weeks: 4, progression: 'pct',
    weekPlan: plan([
      [1, 1, '6', 'Base: RIR 4 — cargas em %RM baixas, técnica e ROM.'],
      [2, 2, '6-7', '+2,5% nos básicos; RIR 3–4.'],
      [3, 3, '7', 'Semana mais dura da base: RIR 3, ainda longe da falha.'],
      [4, 4, '5', 'Deload: 60% das séries, −10% de carga.', 'deload'],
    ]),
    objective: 'Construir a base: compostos com reps mais altas (6–10) a 57–65% do 1RM subindo 2,5%/semana, poucos acessórios e RPE 6–7. Joelho recuperando carga com excêntrico controlado; pescoço e pegada aprendendo a técnica.',
    criteria: 'Avance após o deload se as cargas subiram, o joelho passa no teste das 24 h e o jiu está rendendo.',
    days: {
      A: { time: 60, short: '45 min: faça só os 2 básicos, remada e farmer.', finisher: ['Cardio leve 10–15 min (bike/caminhada, Z2) se não tiver jiu no dia'], exercises: [
        PCT('levantamento-terra', [[4, 8, 60]], { section: F, note: 'Do chão, reiniciando a cada rep (sem quicar). Coluna neutra.' }),
        PCT('supino-reto', [[4, 10, 60]], { section: F, note: 'Escápulas travadas, pausa curta no peito.' }),
        E('remada-curvada', 3, '10', { section: H('costas'), note: 'Pronada, tronco a ~45°. RPE 7.', rest: 120 }),
        E('encolhimento', 3, '12', { section: H('trapézio'), note: 'Pausa de 2 s no topo. RPE 7.', rest: 90, optional: true }),
        E('farmer-walk', 3, '30m', { section: J, note: 'Postura alta, passos curtos. Carga moderada.', rest: 120 }),
        E('pescoco', 2, '15', { section: T, note: '4 direções, lento, nunca falha.', rest: 60 }),
      ] },
      B: { time: 60, short: '45 min: os 3 básicos + pallof.', exercises: [
        PCT('agachamento', [[4, 8, 57.5]], { section: F, note: 'Excêntrico de 3 s, profundidade onde o joelho está 100% confortável. Sem torção.' }),
        PCT('desenvolvimento', [[4, 8, 60]], { section: F, note: 'Militar em pé. Glúteo e abdômen travados.' }),
        E('barra-fixa', 4, '6-8', { section: F, note: 'Peso corporal (ou assistida). RPE 7, sem kipping.', rest: 150 }),
        E('rdl', 3, '10', { section: H('posterior'), note: 'Quadril para trás, barra rente à perna. RPE 6–7.', rest: 120, optional: true }),
        E('pallof', 3, '10', { section: J, note: 'Anti-rotação, 10/lado.', rest: 60 }),
        E('pescoco-iso', 3, '10s', { section: T, note: 'Isometria 10 s por direção.', rest: 45 }),
      ] },
      C: { time: 60, short: '45 min: push press, rack pull e suitcase.', exercises: [
        PCT('push-press', [[4, 6, 60]], { section: F, note: 'Dip curto, explosão de pernas, trava em cima.' }),
        E('rack-pull', 3, '8', { section: F, note: 'RPE 7. Se o jiu de sexta foi pesado, RPE 6.', rest: 180 }),
        E('paralelas', 3, '10', { section: H('peito'), note: 'Peso corporal; desce até 90°.', rest: 120 }),
        E('hip-thrust', 3, '10', { section: H('glúteo'), note: 'Pausa 1 s no topo.', rest: 120, optional: true }),
        E('suitcase-carry', 3, '30m', { section: J, note: 'Não deixa o tronco inclinar. 30 m/lado.', rest: 90 }),
        E('panturrilha-leg', 3, '15', { section: T, note: 'Pausa em cima, alonga embaixo.', rest: 60 }),
      ] },
    },
  },
  {
    name: 'Bloco 2 — Hipertrofia', goal: 'hipertrofia', weeks: 4, progression: 'double', wave: 8,
    weekPlan: plan([
      [1, 1, '8', 'Juggernaut onda de 8s — acumulação (5×8 @65% TM). Acessórios RIR 2.'],
      [2, 2, '8-9', 'Intensificação (3×8 @72,5% TM). Acessórios RIR 1–2.'],
      [3, 3, '9', 'Realização: AMRAP @80% TM (padrão 8). Acessórios até RIR 0–1.'],
      [4, 4, '6', 'Deload: 40/50/60% TM nos básicos e metade dos acessórios.', 'deload'],
    ]),
    objective: 'Máximo de massa: mais exercícios (10–13 por dia), acessórios em RPE 8–9 com a última série perto da falha, supersets de braço. Básicos na onda de 8s do Juggernaut — o AMRAP da semana 3 atualiza o training max.',
    criteria: 'Avance se o AMRAP bateu o padrão (8+), as medidas subiram e o joelho segue tranquilo.',
    days: {
      A: { time: 80, short: '60 min: mantenha os básicos, tire 1 série dos acessórios e o superset de braço.', exercises: [
        JUGG('levantamento-terra', { section: F, note: 'Do chão, sem quicar.' }),
        JUGG('supino-reto', { section: F, note: 'Escápulas travadas.' }),
        E('remada-curvada', 3, '8-10', { section: H('costas, trapézio, ombros'), note: 'RPE 8–9.', rest: 150 }),
        E('encolhimento', 4, '10-12', { section: H('costas, trapézio, ombros'), note: 'Pausa de 2 s no topo. RPE 9.', rest: 120 }),
        E('elevacao-lateral', 3, '12-15', { section: H('costas, trapézio, ombros'), note: 'Descida de 2–3 s. RPE 9.', rest: 90 }),
        E('farmer-walk', 4, '30m', { section: J, note: 'Mais pesado que no bloco 1.', rest: 120 }),
        E('rosca-direta', 3, '8-12', { section: T, note: 'Superset com tríceps testa. RPE 9.', rest: 90, optional: true, superset: 'S1' }),
        E('triceps-testa', 3, '8-12', { section: T, note: 'Superset com rosca direta.', rest: 90, optional: true, superset: 'S1' }),
        E('panturrilha-pe', 4, '12-15', { section: T, note: 'Alonga 2 s embaixo, pausa 1 s em cima.', rest: 90 }),
        E('pescoco', 2, '15-20', { section: T, note: '4 direções, lento, nunca falha.', rest: 60 }),
      ] },
      B: { time: 85, short: '65 min: tire o encolhimento com halteres e o superset de braço.', exercises: [
        JUGG('agachamento', { section: F, note: 'Joelho manda: se a realização doer, pare no padrão.' }),
        JUGG('desenvolvimento', { section: F, note: 'Militar em pé.' }),
        E('barra-fixa', 4, '6-10', { section: F, note: 'Com carga se passar de 10. RPE 8.', rest: 150 }),
        E('rdl', 3, '8-10', { section: H('posterior, ombro, trapézio'), note: 'RPE 8.', rest: 150 }),
        E('face-pull', 3, '15-20', { section: H('posterior, ombro, trapézio'), note: 'Rotação externa no fim.', rest: 60 }),
        E('encolhimento', 3, '12-15', { section: H('posterior, ombro, trapézio'), note: 'Halteres, pegada neutra. RPE 9.', rest: 90, optional: true }),
        E('pallof', 3, '12', { section: J, note: '12/lado + prancha lateral 40 s.', rest: 60 }),
        E('rosca-martelo', 3, '10-12', { section: T, note: 'Superset com tríceps corda. RPE 9.', rest: 90, optional: true, superset: 'S1' }),
        E('triceps-corda', 3, '10-12', { section: T, note: 'Superset com rosca martelo.', rest: 90, optional: true, superset: 'S1' }),
        E('panturrilha-sentado', 4, '12-20', { section: T, note: 'Sóleo.', rest: 90 }),
        E('pescoco-iso', 4, '10s', { section: T, note: 'Isometria 10 s por direção.', rest: 45 }),
      ] },
      C: { time: 90, short: '65 min: tire a remada unilateral, o leg curl e o superset de braço.', exercises: [
        JUGG('push-press', { section: F, note: 'Estilo strongman.' }),
        E('rack-pull', 3, '6-8', { section: F, note: 'RPE 8.', rest: 180 }),
        E('paralelas', 4, '8-10', { section: H('peito, pernas, glúteo'), note: 'Com carga. RPE 9.', rest: 150 }),
        E('leg-press', 3, '12-15', { section: H('peito, pernas, glúteo'), note: 'RPE 9, sem travar o joelho.', rest: 120 }),
        E('hip-thrust', 3, '8-12', { section: H('peito, pernas, glúteo'), note: 'Pausa 1 s no topo. RPE 9.', rest: 120 }),
        E('remada-unilateral', 3, '10-12', { section: H('peito, pernas, glúteo'), note: 'RPE 9.', rest: 90, optional: true }),
        E('mesa-flexora', 3, '10-15', { section: H('peito, pernas, glúteo'), note: 'Excêntrico de 3 s. RPE 9.', rest: 90, optional: true }),
        E('suitcase-carry', 4, '30m', { section: J, note: '30 m/lado.', rest: 90 }),
        E('circuito-antebraco', 3, '1', { section: J, note: 'Dead hang 30–60 s + rosca de punho 15–20 + inversa 12–15 (1 round).', rest: 60 }),
        E('rosca-inclinada', 3, '10-15', { section: T, note: 'Superset com tríceps francês.', rest: 90, optional: true, superset: 'S1' }),
        E('triceps-frances', 3, '10-15', { section: T, note: 'Superset com rosca inclinada.', rest: 90, optional: true, superset: 'S1' }),
        E('panturrilha-leg', 4, '15-20', { section: T, note: 'Pausa de 1 s em cima.', rest: 75 }),
        E('pescoco', 2, '20', { section: T, note: 'Lento, sem falha.', rest: 60 }),
      ] },
    },
  },
  {
    name: 'Bloco 3 — Força Strongman', goal: 'forca', weeks: 4, progression: 'haack',
    weekPlan: plan([
      [1, 1, '7', 'Autorregulada: top set @RPE 7 (carga pelo 1RM estimado) + back-offs −10%.'],
      [2, 2, '8', 'Top set @RPE 8. Registre o RPE: o 1RM estimado se ajusta.'],
      [3, 3, '9', 'Top set @RPE 9 — o mais pesado do ciclo, sem falha.'],
      [4, 4, '9', 'Semana 12 — testes de 3–5RM sem falha absoluta: terra, agachamento (só se o joelho estiver ok), militar, barra com carga, farmer 40 m e medidas.', 'test'],
    ]),
    objective: 'Força bruta e específica: poucos exercícios (5 por dia), básicos pesados em 3–5 reps no estilo John Haack (top set em RPE + back-offs), carregadas até 40 m com carga máxima técnica e só os acessórios necessários (face pull, pegada, pescoço).',
    criteria: 'Fim do ciclo: compare os testes e as medidas da semana 12 e recomece com o 1RM novo.',
    days: {
      A: { time: 60, short: '45 min: terra, supino e farmer.', exercises: [
        AUTO('levantamento-terra', 4, '3', { section: F, note: 'Top set + 3 back-offs.' }),
        AUTO('supino-reto', 4, '4', { section: F, note: 'Top set + 3 back-offs −8%.', drop: 8 }),
        E('encolhimento', 4, '6-8', { section: H('trapézio'), note: 'Pesado + hold de 20 s na última.', rest: 120 }),
        E('farmer-walk', 4, '40m', { section: J, note: 'Carga máxima técnica.', rest: 150 }),
        E('pescoco', 2, '12-15', { section: T, note: '+ isometria 20 s.', rest: 60 }),
      ] },
      B: { time: 60, short: '45 min: os 3 básicos.', exercises: [
        AUTO('agachamento', 4, '3', { section: F, note: 'Só se o joelho passar no teste das 24 h; senão leg press pesado.' }),
        AUTO('desenvolvimento', 4, '3', { section: F, note: 'Top set + 3 back-offs.' }),
        E('barra-fixa', 5, '3-5', { section: F, note: 'Com carga, RPE 8. Use cinto.', rest: 180 }),
        E('face-pull', 3, '12-15', { section: H('ombro'), note: 'Ombro saudável para o jiu.', rest: 60 }),
        E('pescoco-iso', 5, '10s', { section: T, note: 'Isometria 10 s por direção.', rest: 45 }),
      ] },
      C: { time: 60, short: '45 min: push press, rack pull e suitcase.', exercises: [
        AUTO('push-press', 4, '2-3', { section: F, note: 'Top set + 3 back-offs.' }),
        AUTO('rack-pull', 3, '3', { section: F, note: 'Top set + 2 back-offs. Jiu pesado na sexta → RPE 7.' }),
        E('suitcase-carry', 4, '40m', { section: J, note: '40 m/lado, carga máxima técnica.', rest: 120 }),
        E('hip-thrust', 4, '6-8', { section: H('glúteo'), note: 'Subida explosiva.', rest: 120 }),
        E('circuito-antebraco', 3, '1', { section: J, note: 'Dead hang + rosca de punho + inversa.', rest: 60 }),
      ] },
    },
  },
];

PROGRAM_TEMPLATES['tronco-arvore'] = {
  version: TEMPLATE_VERSION,
  name: 'Tronco de Árvore — Strongman × Jiu-Jítsu',
  author: 'Protocolo · Nov 2026', tagline: 'Shape strongman estilo Pudzianowski, adaptado ao joelho e à rotina de jiu-jítsu.', cover: '#e0551f',
  level: 'Intermediário', days: 3, sessionMin: 70, goals: ['strongman', 'forca', 'hipertrofia', 'jiu-jitsu'], equipment: 'Academia + halteres pesados',
  schedule: ['Jiu', 'A', 'Jiu', 'B', 'Jiu?', 'C', 'Off'],
  desc: '3 full body por semana (ter · qui · sáb), 12 semanas em 3 blocos de 4 bem diferentes: Base (%RM baixo, poucos acessórios), Hipertrofia (mais exercícios, RPE alto, Juggernaut 8s) e Força Strongman (poucos exercícios, top sets autorregulados, teste na semana 12). Pescoço, trapézio, antebraço e panturrilha 3× por semana.',
  rules: [
    'Cada bloco tem um papel: Base (técnica e capacidade), Hipertrofia (volume e massa), Força (carga máxima e específica).',
    'As cargas dos básicos saem do seu 1RM (Progresso → Meus 1RM ou estimado pelo histórico). Bloco 1: %RM +2,5%/semana. Bloco 2: Juggernaut. Bloco 3: top set em RPE + back-offs.',
    'Pescoço, trapézio, antebraço e panturrilha 3× por semana: músculos pequenos respondem à frequência.',
    'Falha total só nos isoladores do bloco de hipertrofia. Nos básicos, nunca.',
    'Joelho manda — teste das 24 h: inchaço ou dor acima de 3/10 no dia seguinte → reduza 10% o agachamento ou troque por leg press. Nada de pivô ou torção sob carga.',
    'Anote o RPE do top set: é ele que recalcula o seu 1RM estimado.',
  ],
  sections: [
    { title: 'Mapa do shape', items: ['Trapézio (3×): encolhimento com pausa, terra, rack pull, farmer walk', 'Pescoço (3×): 4 direções + isometria, progressão lenta', 'Peitoral (2×): supino reto + paralelas', 'Ombros (3×): militar, push press, elevação lateral, face pull', 'Braço e antebraço: supersets bi/tri no bloco 2 + carregadas + rosca de punho', 'Pernas e glúteo: agachamento, leg press, stiff, hip thrust, leg curl', 'Panturrilha (3×): em pé, sentada e no leg press'] },
    { title: 'Ponte com o jiu-jítsu', items: ['Terra / rack pull → levantar o oponente, defesa de queda, base na passagem', 'Hip thrust → ponte e fuga de montada', 'Remada / barra fixa → puxada de guarda, controle de gola e manga', 'Farmer / suitcase → pegada que não abre no fim do round', 'Pallof → resistir à rotação, base lateral', 'Militar / push press → frames, empurrar, explosão', 'Pescoço → proteção em quedas, defesa de guilhotina', 'Sexta com sparring pesado: no sábado, rack pull 1 RPE abaixo e −1 série de leg press.', 'Joelho no tatame: até a liberação, evite leg locks, heel hooks e joelho preso com corpo girando.', 'Pescoço: no máximo +10% de carga por semana. Pare com formigamento ou dor cervical.'] },
    { title: 'Comida e recuperação', items: ['Manutenção ou superávit leve (+200 a 300 kcal) nos dias de treino; proteína ~190 g/dia.', 'Duas semanas sem progredir: coma e durma mais antes de mexer no treino.', 'Dor articular: reduza carga e volume do exercício culpado, não pare tudo. Cansaço acumulado: antecipe o deload.', 'Registrar: cargas, reps e RPE dos básicos, peso médio semanal, medidas a cada 4 semanas, joelho 0–10.'] },
  ],
  blocks: TRONCO_BLOCKS.map((b, i) => ({
    name: b.name, goal: b.goal, weeks: b.weeks, progression: b.progression, weekPlan: b.weekPlan, objective: b.objective, criteria: b.criteria,
    ...(b.wave ? { wave: b.wave } : {}),
    workouts: Object.entries(b.days).map(([k, d]) => ({
      name: `B${i + 1} · ${k} — ${DAY[k]}`, warmup: TRONCO_WARM[k], short: d.short, sessionMin: d.time,
      ...(d.finisher ? { finisher: d.finisher } : {}), exercises: d.exercises,
    })),
  })),
};

// "3–4 min" → 210 s; "90 s entre rounds" → 90
export function parseRest(txt) {
  const n = String(txt).match(/(\d+)(?:[–-](\d+))?\s*(min|s)/);
  if (!n) return 90;
  const v = n[2] ? (Number(n[1]) + Number(n[2])) / 2 : Number(n[1]);
  return Math.round(n[3] === 'min' ? v * 60 : v);
}

// "4×6–8 + hold 20 s" → { sets: 4, reps: '6-8', extra: '+ hold 20 s' }; "3 rounds" → { sets: 3, reps: '1', extra: 'rounds' }
export function parseRx(txt) {
  const t = String(txt).trim();
  const r = t.match(/^(\d+)\s*rounds?/i);
  if (r) return { sets: Number(r[1]), reps: '1', extra: 'round = circuito completo' };
  const m = t.match(/^(\d+)\s*[×x]\s*(\d+)(?:[–-](\d+))?\s*(m|s)?\b\s*(.*)$/);
  if (!m) return { sets: 3, reps: '8-12', extra: t };
  const reps = m[3] ? `${m[2]}-${m[3]}` : m[2];
  return { sets: Number(m[1]), reps: m[4] ? `${reps}${m[4]}` : reps, extra: m[5].trim() };
}

// Exercício do modelo → exercício do treino.
const toExercise = (e, b) => (Array.isArray(e)
  ? { exId: e[0], sets: e[1], reps: e[2], rest: e[5] ?? 90, note: e[3], prog: e[4] ?? b.progression }
  : { ...e, prog: e.prog ?? b.progression, rest: e.rest ?? 90 });

const workoutFields = (w, b) => ({
  type: 'strength', name: w.name,
  ...(w.warmup ? { warmup: w.warmup } : {}), ...(w.short ? { short: w.short } : {}), ...(w.sessionMin ? { sessionMin: w.sessionMin } : {}),
  ...(w.finisher ? { finisher: w.finisher } : {}),
  exercises: w.exercises.map((e) => toExercise(e, b)),
});

const blockFields = (b) => ({
  name: b.name, goal: b.goal, weeks: b.weeks, progression: b.progression, weekPlan: b.weekPlan ?? null,
  objective: b.objective ?? '', criteria: b.criteria ?? '', volumeTargets: b.volumeTargets ?? null, ...(b.wave ? { wave: b.wave } : {}),
});

const programFields = (key, t) => ({
  template: key, name: t.name, desc: t.desc, rules: t.rules, sections: t.sections ?? [], schedule: t.schedule ?? null,
  meta: { author: t.author, cover: t.cover, level: t.level, days: t.days, sessionMin: t.sessionMin, goals: t.goals, equipment: t.equipment, tagline: t.tagline },
  templateVersion: t.version ?? 1,
});

// Instancia um modelo: pasta + treinos + programa (ids novos). Não toca no estado.
export function instantiateProgram(key, uid, template = PROGRAM_TEMPLATES[key]) {
  const t = template;
  const folder = { id: uid(), name: t.name };
  const workouts = [];
  const blocks = t.blocks.map((b) => {
    const ids = b.workouts.map((w) => {
      const id = uid();
      workouts.push({ id, folderId: folder.id, ...workoutFields(w, b) });
      return id;
    });
    return { id: uid(), ...blockFields(b), workoutIds: ids, perWeek: ids.length };
  });
  const program = {
    id: uid(), ...programFields(key, t),
    blocks, blockIndex: 0, blockStartedAt: null, status: 'ready', createdAt: Date.now(), history: [],
  };
  return { folder, workouts, program };
}

// "B2 · A — ..." → "B2·A" (código do treino dentro do programa)
const wCode = (name) => { const m = String(name ?? '').match(/^B(\d+)\s*·\s*([A-Z])\b/); return m ? `B${m[1]}·${m[2]}` : null; };

/**
 * Atualiza (no lugar) um programa instalado para a versão nova do modelo, sem perder o progresso:
 * mantém ids do programa, dos blocos e dos treinos (o histórico e a semana atual continuam valendo),
 * blockIndex, blockStartedAt, status e history. Treinos que sumiram são readotados pela pasta do
 * programa (mesmo código "B1 · A") ou recriados com id determinístico. Retorna true se mudou algo.
 */
export function upgradeProgram(s, p, template = PROGRAM_TEMPLATES[p.template]) {
  const t = template;
  if (!t || (p.templateVersion ?? 1) >= (t.version ?? 1)) return false;
  const byId = new Map(s.workouts.map((w) => [w.id, w]));
  const usedElsewhere = new Set((s.programs ?? []).filter((x) => x.id !== p.id).flatMap((x) => x.blocks.flatMap((b) => b.workoutIds)));
  // pasta do programa: a dos treinos existentes, ou a pasta com o mesmo nome
  const own = p.blocks.flatMap((b) => b.workoutIds).map((id) => byId.get(id)).filter(Boolean);
  let folderId = own.find((w) => w.folderId && w.folderId !== 'archive')?.folderId
    ?? (s.workoutFolders ?? []).find((f) => f.name === p.name || f.name === t.name)?.id;
  if (!folderId) {
    folderId = `${p.id}-f`;
    (s.workoutFolders ??= []).push({ id: folderId, name: t.name });
  }
  const pool = s.workouts.filter((w) => w.folderId === folderId && !usedElsewhere.has(w.id));
  const taken = new Set();
  const blocks = t.blocks.map((b, i) => {
    const old = p.blocks[i];
    const ids = b.workouts.map((w, j) => {
      let cur = old?.workoutIds?.[j] && byId.get(old.workoutIds[j]);
      if (!cur) cur = pool.find((x) => !taken.has(x.id) && wCode(x.name) && wCode(x.name) === wCode(w.name));
      const data = workoutFields(w, b);
      if (cur) {
        taken.add(cur.id);
        const keep = { id: cur.id, folderId: cur.folderId && cur.folderId !== 'archive' ? cur.folderId : folderId };
        for (const k of Object.keys(cur)) delete cur[k];
        Object.assign(cur, keep, data);
        return cur.id;
      }
      const id = `${p.id}-b${i}w${j}`;
      const exist = byId.get(id);
      if (exist) Object.assign(exist, data, { folderId });
      else s.workouts.push({ id, folderId, ...data });
      taken.add(id);
      return id;
    });
    // treinos do bloco antigo que não existem mais no modelo vão para o arquivo (sem apagar)
    for (const id of old?.workoutIds ?? []) if (!ids.includes(id) && byId.get(id)) byId.get(id).folderId = 'archive';
    return { id: old?.id ?? `${p.id}-b${i}`, ...blockFields(b), workoutIds: ids, perWeek: ids.length };
  });
  Object.assign(p, programFields(p.template, t), { blocks, blockIndex: Math.min(p.blockIndex ?? 0, blocks.length - 1) });
  return true;
}

// Atualiza todos os programas instalados de modelos embutidos.
export function upgradePrograms(s) {
  let changed = false;
  for (const p of s.programs ?? []) if (p.template && PROGRAM_TEMPLATES[p.template]) changed = upgradeProgram(s, p) || changed;
  return changed;
}

/**
 * Instala um modelo no estado sem duplicar: se já existe uma pasta com o nome do programa
 * (ex.: o programa foi excluído e os treinos ficaram na pasta), os treinos dela são
 * reaproveitados pelo código "B1 · A"; só o que faltar é criado. Retorna o id do programa.
 */
export function installInto(st, key, uid, template = PROGRAM_TEMPLATES[key]) {
  const t = template;
  const folder = (st.workoutFolders ?? []).find((f) => f.name === t.name);
  const made = instantiateProgram(key, uid, t);
  if (folder && st.workouts.some((w) => w.folderId === folder.id)) {
    const p = { ...made.program, templateVersion: 0, blocks: made.program.blocks.map((b) => ({ ...b, workoutIds: [] })) };
    (st.programs ??= []).push(p);
    upgradeProgram(st, p, { ...t, version: Math.max(1, t.version ?? 1) });
    return p.id;
  }
  (st.workoutFolders ??= []).push(made.folder);
  st.workouts.push(...made.workouts);
  (st.programs ??= []).push(made.program);
  return made.program.id;
}
