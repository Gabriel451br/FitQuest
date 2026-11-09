// Modelos de programa em blocos. Exercício: [id, séries, reps, nota, progressão?, descanso?]
// Progressão: topset | double | linear | rpe | explosive (padrão: a do bloco).
// "Top set + back-off" (ex.: 1×4–6 + 2×4–6) vira 3 séries com prog 'topset':
// a 1ª é marcada como top set e as demais como back-off ao iniciar o treino.

const WEEKS_7 = [
  { from: 1, to: 2, rpe: '6-7', text: 'Adaptação técnica, RPE 6–7: encontre as cargas de trabalho.' },
  { from: 3, to: 4, rpe: '7-8', text: 'Progressão gradual de reps/carga, RPE 7–8.' },
  { from: 5, to: 6, rpe: '8', text: 'Maior estímulo do bloco, sem falha nos básicos.' },
  { from: 7, to: 7, rpe: '5-6', deload: true, text: 'Deload: séries reduzidas em ~40–50%, cargas 5–15% menores se necessário, RPE 5–6.' },
  { from: 8, to: 8, rpe: '7-8', text: 'Opcional: consolidação / teste submáximo técnico ou transição, se estiver recuperado.' },
];

export const PROGRAM_TEMPLATES = {
  'dad-strength': {
    name: 'Dad Strength — War Machine',
    author: 'FitQuest', tagline: 'Build the body. Build the strength. Protect the family.', cover: '#d9772f',
    level: 'Intermediário', days: 3, sessionMin: 70, goals: ['forca', 'hipertrofia', 'potencia', 'jiu-jitsu'], equipment: 'Academia completa',
    schedule: ['Jiu', 'A', 'Jiu', 'B', 'Jiu?', 'C', 'Off'],
    desc: 'Build the body. Build the strength. Protect the family. Ciclo de 18–24 semanas: 3 musculações/semana (A ter, B qui, C sáb) + 2–3 Jiu-Jitsu + cardio leve. Shape de tanque de guerra, força de powerlifter, capacidades úteis no Jiu-Jitsu e joelho preparado para carga.',
    rules: [
      'Qualidade antes de quantidade: aquecimentos não contam como volume efetivo.',
      'RIR/RPE: manter 1–3 reps em reserva nos básicos. Sem falha em agachamento, terra, supino e explosivos.',
      'Progressão sustentável: aumentar reps dentro da faixa antes de subir a carga.',
      'Jiu-Jitsu também é carga de treino: sessões intensas pedem ajuste de volume na musculação.',
      'Regra do joelho: dor crescente, inchaço, falseio ou perda de amplitude → interromper o estímulo e reavaliar.',
      'Consistência supera heroísmo: não perseguir recordes com sinais de alerta.',
    ],
    blocks: [
      {
        name: 'Bloco 1 — Preparação & Strength', goal: 'forca', weeks: 7, progression: 'topset', weekPlan: WEEKS_7,
        objective: 'Reestabelecer consistência, consolidar padrões básicos, desenvolver força geral e tolerância progressiva do joelho. Volume enxuto; foco em técnica e progressão.',
        criteria: 'Avançar: execução consistente dos básicos, boa tolerância ao volume, joelho sem sinais de piora e recuperação compatível com o Jiu-Jitsu.',
        workouts: [
          { name: 'B1 · A — Power & Strength', exercises: [
            ['spanish-squat', 2, '12-15', 'Prehab: controle e tolerância do quadríceps; sem dor relevante.', 'double', 60],
            ['power-clean', 3, '2-3', 'Explosivo, carga leve/moderada; parar se a velocidade cair. Power clean só com técnica e recepção liberadas — senão clean pull.', 'explosive', 120],
            ['zercher', 3, '5-6', 'RPE 6–8; postura sólida e amplitude tolerada.', 'topset', 150],
            ['supino-pausado', 3, '4-6', 'Top set + 2 back-offs (1×4–6 + 2×4–6). RPE 7–8 no top set; pausa de 2–3 s.', 'topset', 180],
            ['desenvolvimento', 2, '6-8', 'RPE 7–8; sem falha.', 'double', 120],
            ['rosca-scott', 2, '8-12', 'RPE 8–9.', 'double', 75],
            ['triceps-polia', 2, '8-12', 'RPE 8–9.', 'double', 75],
          ] },
          { name: 'B1 · B — Deadlift & Grip', exercises: [
            ['cadeira-extensora', 2, '12-15', 'Prehab: extensora leve (se indicada); amplitude e carga conforme avaliação/tolerância.', 'double', 60],
            ['levantamento-terra', 3, '3-5', 'Top set + 2 back-offs (1×3–5 + 2×3–5). Top set RPE 7–8; back-offs 8–12% mais leves.', 'topset', 180],
            ['barra-neutra', 3, '5-8', 'Assistida ou com carga para manter técnica.', 'double', 120],
            ['chest-press', 2, '8-12', 'RPE 7–9.', 'double', 90],
            ['encolhimento', 3, '8-12', 'Com halteres; pausa breve no topo; sem girar os ombros.', 'double', 75],
            ['elevacao-lateral', 3, '10-15', 'Controle e amplitude confortável.', 'double', 60],
            ['plate-pinch', 2, '20-30', 'Segundos. Pinça forte, sem dor nos dedos/punhos.', 'double', 60],
          ] },
          { name: 'B1 · C — Hypertrophy & Armor', exercises: [
            ['step-down', 2, '6-8', 'Prehab, por perna. Somente se liberado e sem sintomas; controle do joelho.', 'double', 60],
            ['agachamento', 3, '6-8', 'Top set + 2 back-offs (1×6–8 + 2×6–8). Top set RPE 7; back-offs mais leves.', 'topset', 180],
            ['supino-inclinado-halter', 3, '6-10', 'RPE 7–9.', 'double', 120],
            ['puxada-neutra', 2, '8-12', 'Controle escapular.', 'double', 90],
            ['hip-thrust', 2, '8-12', 'Pausa no topo, sem hiperextensão lombar.', 'double', 90],
            ['mesa-flexora', 2, '10-15', 'Leg curl: controle excêntrico.', 'double', 75],
            ['rosca-inversa', 2, '10-15', 'Punhos neutros.', 'double', 60],
            ['panturrilha-pe', 3, '8-15', 'Amplitude tolerada, pausa no alongamento.', 'double', 60],
            ['rosca-punho', 2, '12-20', 'Wrist curl, sem irritação de punho/cotovelo.', 'double', 60],
          ] },
        ],
      },
      {
        name: 'Bloco 2 — Hypertrophy & Armor', goal: 'hipertrofia', weeks: 7, progression: 'double', weekPlan: WEEKS_7,
        objective: 'Aumentar massa muscular com prioridade estética em antebraços, braços, trapézio, glúteos e panturrilhas. Manter os básicos com volume suficiente para não perder força. Comece pela parte inferior das faixas e suba se recuperação e desempenho estiverem bons.',
        criteria: 'Avançar: ganhos ou manutenção de força, volume de hipertrofia bem tolerado e liberação/avaliação para as atividades explosivas planejadas.',
        volumeTargets: 'Séries/semana — Peitoral 8–12 · Costas 10–14 · Deltoides 8–12 · Bíceps 6–10 · Tríceps 6–10 · Antebraço 8–14 · Trapézio 6–10 · Quadríceps 6–10 · Posteriores 6–10 · Glúteos 8–12 · Panturrilhas 8–12.',
        workouts: [
          { name: 'B2 · A — Upper strength + braços', exercises: [
            ['prehab-joelho', 1, '5-8', 'Minutos. Exercício 1 + exercício 2 conforme avaliação e resposta do joelho.', 'double', 0],
            ['zercher', 2, '6-8', 'Manutenção, RPE 6–7.', 'rpe', 150],
            ['supino-pausado', 3, '5-6', 'RPE 7–8; manter padrão de força.', 'rpe', 180],
            ['desenvolvimento', 2, '6-10', 'RPE 7–8.', 'double', 120],
            ['remada-apoio', 3, '8-12', 'Remada com apoio ou remada baixa (puxada horizontal).', 'double', 90],
            ['rosca-scott', 3, '8-12', 'RPE 8–9.', 'double', 75],
            ['triceps-polia', 3, '8-12', 'RPE 8–9.', 'double', 75],
            ['elevacao-lateral', 2, '12-20', 'RPE 8–9.', 'double', 60],
          ] },
          { name: 'B2 · B — Posterior, costas, trapézio e pegada', exercises: [
            ['prehab-joelho', 1, '5-8', 'Minutos. Dose leve; não gerar fadiga.', 'double', 0],
            ['levantamento-terra', 2, '3-5', 'Manutenção, RPE 6–7; reduzir se atrapalhar o Jiu-Jitsu.', 'rpe', 180],
            ['barra-neutra', 3, '6-10', 'Progressão por reps/carga.', 'double', 120],
            ['remada-curvada', 3, '8-12', 'Priorizar meio das costas.', 'double', 90],
            ['encolhimento', 3, '8-12', 'Trapézio.', 'double', 75],
            ['rosca-martelo', 3, '8-12', 'Braquial/braquiorradial.', 'double', 75],
            ['plate-pinch', 3, '20-40', 'Segundos. Plate pinch ou pegada de toalha: alternar a cada bloco; não exagerar no volume.', 'double', 60],
            ['panturrilha-sentado', 3, '10-20', 'Ênfase em sóleo.', 'double', 60],
          ] },
          { name: 'B2 · C — Lower & Armor', exercises: [
            ['prehab-joelho', 1, '5-8', 'Minutos. Selecionar variações toleradas.', 'double', 0],
            ['agachamento', 3, '6-10', 'RPE 7–8.', 'double', 150],
            ['supino-inclinado-halter', 3, '8-12', 'RPE 8.', 'double', 120],
            ['puxada-neutra', 2, '8-12', 'RPE 8.', 'double', 90],
            ['hip-thrust', 3, '8-12', 'Glúteos.', 'double', 90],
            ['mesa-flexora', 3, '10-15', 'Leg curl — posteriores.', 'double', 75],
            ['rosca-inversa', 3, '10-15', 'Antebraço/braquiorradial.', 'double', 60],
            ['triceps-frances', 2, '10-15', 'Tríceps acima da cabeça ou polia (2–3 séries): longa porção, variante confortável.', 'double', 75],
            ['panturrilha-pe', 4, '8-15', 'Progressão dupla.', 'double', 60],
            ['rosca-punho', 2, '12-20', 'Wrist curl ou extensão de punho; alternar ênfase flexores/extensores.', 'double', 60],
          ] },
        ],
      },
      {
        name: 'Bloco 3 — Power & Combat Athlete', goal: 'potencia', weeks: 7, progression: 'rpe', weekPlan: WEEKS_7,
        objective: 'Converter força em produção rápida de força, mantendo massa e força geral. Baixo volume de explosivos, execução descansada e técnica impecável. Exige liberação para saltos, aterrissagens, sprints, pivôs e mudanças de direção (histórico de LCA/menisco: não introduzir impacto só porque o joelho está sem dor no dia a dia).',
        criteria: 'Fim do bloco 3: revisar medidas, força submáxima, qualidade dos movimentos rápidos e desempenho no tatame; escolher novo ciclo com base nos dados.',
        workouts: [
          { name: 'B3 · A — Power', exercises: [
            ['prehab-joelho', 1, '5-8', 'Minutos. Prehab antes do principal.', 'double', 0],
            ['power-clean', 4, '2-3', 'Clean pull ou power clean (só com técnica e recepção liberadas).', 'explosive', 150],
            ['zercher', 3, '3-5', 'Força submáxima, sem falha.', 'rpe', 180],
            ['supino-pausado', 3, '3-5', 'Manter força.', 'rpe', 180],
            ['desenvolvimento', 2, '5-6', 'RPE 7–8.', 'rpe', 120],
          ] },
          { name: 'B3 · B — Deadlift & Grip', exercises: [
            ['prehab-joelho', 1, '5-8', 'Minutos.', 'double', 0],
            ['levantamento-terra', 3, '2-3', 'Carga submáxima; intenção de acelerar mantendo controle.', 'explosive', 180],
            ['barra-neutra', 3, '4-6', 'Pode adicionar carga se forte e tecnicamente sólido.', 'double', 150],
            ['remada-baixa', 2, '6-10', 'Remada ou puxada: manter costas.', 'double', 90],
            ['plate-pinch', 3, '15-30', 'Segundos. Plate pinch / pegada de kimono — isometria de alta qualidade.', 'double', 60],
          ] },
          { name: 'B3 · C — Squat & Armor', exercises: [
            ['prehab-joelho', 1, '5-8', 'Minutos.', 'double', 0],
            ['agachamento', 3, '3-5', 'Força submáxima; amplitude tolerada.', 'rpe', 180],
            ['hip-thrust', 3, '5-8', 'Intenção de acelerar a subida, sem perder posição.', 'explosive', 120],
            ['supino-inclinado-halter', 2, '6-10', 'Manutenção de hipertrofia.', 'double', 120],
            ['mesa-flexora', 2, '8-12', 'Leg curl — posterior e controle do joelho.', 'double', 75],
          ] },
        ],
      },
    ],
  },
};


// --- Tronco de Árvore — Strongman × Jiu-Jítsu -------------------------------------------
// Cada item: [exId, nota, [rx bloco 1, bloco 2, bloco 3], descanso, opções]
// rx no formato do protocolo: "4×6–8", "3×30 m", "2×15–20 /direção", "3 rounds"…
const RIR_WEEKS = (last) => [
  { from: 1, to: 1, rpe: '7', text: 'RIR 3: termine cada série com 3 reps na reserva.' },
  { from: 2, to: 2, rpe: '8', text: 'RIR 2: progressão de carga/reps.' },
  { from: 3, to: 3, rpe: '9', text: 'RIR 1: semana mais dura do bloco — séries duras, mas limpas.' },
  last === 'test'
    ? { from: 4, to: 4, rpe: '9', test: true, text: 'Semana 12 — testes de 3–5RM sem falha absoluta: terra, agachamento (só se o joelho estiver ok), militar, barra fixa com carga, farmer walk 40 m e medidas.' }
    : { from: 4, to: 4, rpe: '6', deload: true, text: 'Deload: metade das séries nos básicos e acessórios, RIR 4, mantendo os movimentos.' },
];

const TRONCO_DAYS = {
  A: {
    name: 'Puxada pesada + Trapézio', time: 75,
    short: '60 min: mantenha os básicos, tire 1 série dos acessórios e o superset de braço pela metade.',
    warmup: ['5 min bike ou remo leve', 'Ponte de glúteo 2×10, gato-camelo, rotação torácica no chão 8/lado', 'Dead hang 2×20 s e rotação externa de ombro com banda 2×15', 'Rampa do terra: barra vazia, 40%, 60%, 80%, depois o peso de trabalho'],
    sections: [
      ['Força principal', [
        ['levantamento-terra', 'Do chão, reiniciando a cada rep (sem quicar). Coluna neutra.', ['4×6–8', '4×4–6', '5×3–5'], '3–4 min'],
        ['supino-reto', 'Escápulas travadas, pausa curta no peito.', ['3×8–10', '4×5–7', '4×4–6'], '3 min'],
      ]],
      ['Hipertrofia · costas, trapézio, ombros', [
        ['remada-curvada', 'Pronada, tronco a ~45°, puxa até o umbigo. Sem ioiô de quadril.', ['3×8–10', '3×6–8', '4×5–7'], '2–3 min'],
        ['encolhimento', 'Com barra. Pausa de 2 s no topo; sobe os ombros reto, sem rodar.', ['4×10–12', '4×8–10', '4×6–8 + hold 20 s'], '2 min'],
        ['elevacao-lateral', 'Cotovelo levemente flexionado, descida de 2–3 s.', ['3×12–15', '3×12–15', '3×10–12'], '90 s'],
      ]],
      ['Funcional · jiu', [
        ['farmer-walk', 'Halteres pesados. Postura alta, passos curtos. Trapézio, antebraço e core.', ['3×30 m', '4×30 m (mais pesado)', '4×40 m (máx. técnico)'], '2 min'],
      ]],
      ['Tronco de árvore', [
        ['rosca-direta', 'Superset com tríceps testa. Sem balanço; pare 1–2 reps antes da falha técnica.', ['3×8–12', '3×8–10', '3×6–10'], '90 s', { opt: true, ss: 'S1' }],
        ['triceps-testa', 'Superset com rosca direta.', ['3×8–12', '3×8–10', '3×6–10'], '90 s', { opt: true, ss: 'S1' }],
        ['panturrilha-pe', 'Alonga 2 s embaixo, pausa 1 s em cima.', ['4×12–15', '4×10–12', '4×8–10 pausa 2 s'], '90 s'],
        ['pescoco', 'Anilha, banda ou manual. Flexão, extensão e laterais. Movimento lento, nunca falha.', ['2×15–20 /direção', '2×15–20 /direção', '2×12–15 + isometria 20 s'], '60 s'],
      ]],
    ],
  },
  B: {
    name: 'Pernas + Ombros + Puxada vertical', time: 80,
    short: '65 min: tire o encolhimento com halteres e o superset de braço, mantenha os 3 básicos.',
    warmup: ['5 min bike leve', 'Ponte de glúteo 2×10, agachamento no peso corporal com pausa 2×8, mobilidade de tornozelo', 'Rotação externa de ombro com banda 2×15, dead hang 2×20 s', 'Rampa do agachamento: barra vazia, 40%, 60%, 80%, depois o peso de trabalho'],
    sections: [
      ['Força principal', [
        ['agachamento', 'Profundidade onde o joelho está 100% confortável. Excêntrico de 3 s no Bloco 1. Joelhos na linha dos pés, sem torção.', ['4×6–8', '4×5–6', '5×3–5'], '3–4 min'],
        ['desenvolvimento', 'Militar em pé. Glúteo e abdômen travados; cabeça passa à frente da barra no topo.', ['4×6–8', '4×4–6', '5×3–5'], '3 min'],
        ['barra-fixa', 'Com carga, pronada. Peito à barra, descida controlada, sem kipping. Use cinto.', ['4×5–8', '4×4–6', '5×3–5'], '3 min'],
      ]],
      ['Hipertrofia · posterior, ombro, trapézio', [
        ['rdl', 'Stiff/RDL: quadril para trás, barra rente à perna.', ['3×8–10', '3×6–8', '3×6–8'], '2–3 min'],
        ['face-pull', 'Corda; rotação externa no fim. Ombro saudável para o jiu.', ['3×15–20', '3×15–20', '3×12–15'], '60 s'],
        ['encolhimento', 'Com halteres, pegada neutra. Pausa 1 s no topo.', ['3×12–15', '3×10–12', '3×8–10'], '90 s', { opt: true }],
      ]],
      ['Funcional · jiu', [
        ['pallof', 'Pallof press + prancha lateral (s). Anti-rotação: aguenta o torque do adversário.', ['3×10/lado + 30 s', '3×12/lado + 40 s', '3×12/lado + 45 s'], '60 s'],
      ]],
      ['Tronco de árvore', [
        ['rosca-martelo', 'Superset com tríceps corda. Martelo pega braquial e antebraço.', ['3×10–12', '3×8–12', '3×8–10'], '90 s', { opt: true, ss: 'S1' }],
        ['triceps-corda', 'Superset com rosca martelo.', ['3×10–12', '3×8–12', '3×8–10'], '90 s', { opt: true, ss: 'S1' }],
        ['panturrilha-sentado', 'Sóleo: volume na parte de baixo da panturrilha.', ['4×12–20', '4×10–15', '4×8–12'], '90 s'],
        ['pescoco-iso', 'Isometria de 10 s por direção + extensão, sem dor cervical.', ['4×10 s /direção', '4×10 s /direção', '5×10 s /direção'], '45 s'],
      ]],
    ],
  },
  C: {
    name: 'Strongman funcional + Hipertrofia', time: 85,
    short: '65 min: tire a remada unilateral, o leg curl e o superset de braço.',
    warmup: ['5 min remo ou bike', 'Ponte de glúteo 2×12, rotação torácica, mobilidade de quadril sem torcer o joelho', 'Rampa do push press: barra vazia, 40%, 60%, 80%', 'Dead hang 2×20 s'],
    sections: [
      ['Força principal', [
        ['push-press', 'Dip curto de joelho, explosão de pernas, trava em cima. Estilo strongman.', ['4×6–8', '4×4–6', '5×3–4'], '3 min'],
        ['rack-pull', 'Pesado, tensão nas dorsais. Se o jiu de sexta foi pesado, deixe 3 reps na reserva.', ['3×6–8', '4×4–6', '4×3–5'], '3 min'],
      ]],
      ['Hipertrofia · peito, pernas, glúteo', [
        ['paralelas', 'Com carga. Tronco levemente inclinado para o peito; desce até 90°.', ['3×8–10', '4×6–8', '4×5–7'], '2–3 min'],
        ['leg-press', 'ROM controlado, sem travar o joelho no topo, sem torção.', ['3×12–15', '3×10–12', '3×8–10'], '2 min'],
        ['hip-thrust', 'Pausa 1 s no topo. Glúteo grande e ponte do jiu.', ['3×8–12', '3×8–10', '4×6–8'], '2 min'],
        ['remada-unilateral', 'Apoio no banco, puxa até a cintura.', ['3×10–12', '3×8–10', '3×8–10'], '90 s', { opt: true }],
        ['mesa-flexora', 'Leg curl deitado: posterior protege o joelho. Excêntrico de 3 s.', ['3×10–15', '3×8–12', '3×8–10'], '90 s', { opt: true }],
      ]],
      ['Funcional · jiu', [
        ['suitcase-carry', 'Haltere unilateral; não deixa o tronco inclinar. Oblíquo e pegada.', ['3×30 m /lado', '4×30 m /lado', '4×40 m /lado'], '90 s'],
        ['circuito-antebraco', 'Dead hang 30–60 s, rosca de punho 15–20, rosca inversa 12–15.', ['3 rounds', '3 rounds', '4 rounds'], '60 s'],
      ]],
      ['Tronco de árvore', [
        ['rosca-inclinada', 'Superset com extensão de tríceps acima da cabeça. Posições de alongamento crescem mais.', ['3×10–15', '3×10–12', '3×8–12'], '90 s', { opt: true, ss: 'S1' }],
        ['triceps-frances', 'Extensão acima da cabeça no cabo, em superset com a rosca inclinada.', ['3×10–15', '3×10–12', '3×8–12'], '90 s', { opt: true, ss: 'S1' }],
        ['panturrilha-leg', 'Pausa de 1 s em cima, alongar embaixo.', ['4×15–20', '4×12–15', '4×10–12 pausa 2 s'], '75 s'],
        ['pescoco', 'Mesma técnica: lento, sem falha.', ['2×20 /direção', '2×15–20 /direção', '2×15 + isometria'], '60 s'],
      ]],
    ],
  },
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

function troncoBlock(i) {
  const names = ['Bloco 1 — Construção', 'Bloco 2 — Força e massa', 'Bloco 3 — Strongman'];
  const goals = ['hipertrofia', 'forca', 'forca'];
  const objectives = [
    'Reps 8–12 nos grandes, 12–20 nos acessórios. Excêntrico controlado no agachamento (3 s). Joelho recuperando carga, mantendo ROM. Pescoço e pegada: aprender a técnica com carga leve.',
    'Reps 4–7 nos básicos, 8–12 nos acessórios. Carregadas mais pesadas (4 séries). Reavaliação do joelho: se liberado, entra búlgaro/frontal no lugar do leg press. Pausas de 2 s no encolhimento e na panturrilha.',
    'Reps 3–5 nos básicos, 6–10 nos acessórios. Carregadas até 40 m com carga máxima técnica. Semana 12: teste de 3–5RM (sem falha absoluta). Depois: deload e novo ciclo com cargas maiores.',
  ];
  return {
    name: names[i], goal: goals[i], weeks: 4, progression: 'double', weekPlan: RIR_WEEKS(i === 2 ? 'test' : 'deload'), objective: objectives[i],
    criteria: i < 2 ? 'Avance após o deload se as cargas subiram ou ficaram estáveis, o joelho passa no teste das 24 h e o jiu está rendendo.' : 'Fim do ciclo: compare os testes e as medidas da semana 12 e comece um novo ciclo com cargas maiores.',
    workouts: Object.entries(TRONCO_DAYS).map(([k, d]) => ({
      name: `B${i + 1} · ${k} — ${d.name}`,
      warmup: d.warmup,
      short: d.short,
      sessionMin: d.time,
      exercises: d.sections.flatMap(([section, items]) => items.map(([exId, note, rx, rest, o = {}]) => {
        const p = parseRx(rx[i]);
        const strength = section === 'Força principal';
        return {
          exId, sets: p.sets, reps: p.reps, rest: parseRest(rest), section,
          note: [note, p.extra && `(${p.extra})`].filter(Boolean).join(' '),
          prog: strength && i === 2 ? 'rpe' : 'double',
          ...(o.opt ? { optional: true } : {}), ...(o.ss ? { superset: o.ss } : {}),
        };
      })),
    })),
  };
}

PROGRAM_TEMPLATES['tronco-arvore'] = {
  name: 'Tronco de Árvore — Strongman × Jiu-Jítsu',
  author: 'Protocolo · Nov 2026', tagline: 'Shape strongman estilo Pudzianowski, adaptado ao joelho e à rotina de jiu-jítsu.', cover: '#e0551f',
  level: 'Intermediário', days: 3, sessionMin: 80, goals: ['strongman', 'forca', 'hipertrofia', 'jiu-jitsu'], equipment: 'Academia + halteres pesados',
  schedule: ['Jiu', 'A', 'Jiu', 'B', 'Jiu?', 'C', 'Off'],
  desc: '3 full body por semana (ter · qui · sáb), 12 semanas em 3 blocos de 4: três semanas subindo (RIR 3 → 2 → 1) e uma de deload; a semana 12 é de teste. Pescoço, trapézio, antebraço e panturrilha 3× por semana.',
  rules: [
    'Básicos pesados primeiro, volume depois: cada dia abre com 2–3 levantamentos de força (3–8 reps) e termina com hipertrofia e funcional.',
    'Pescoço, trapézio, antebraço e panturrilha 3× por semana: músculos pequenos toleram e respondem à frequência.',
    'Progressão dupla: topo da faixa em todas as séries com o RIR previsto → +2,5 kg em cima, +5 kg em perna e terra na próxima sessão.',
    'Falha total só nos isoladores. Nos básicos, pare com 1–3 reps na reserva conforme a semana.',
    'Joelho manda — teste das 24 h: inchaço ou dor acima de 3/10 no dia seguinte → reduza 10% o agachamento ou troque por leg press. Nada de pivô ou torção sob carga.',
    'Cargas de partida: semana 1 com 3 reps na reserva; agachamento e leg press com 4, subindo só se o joelho passar no teste das 24 h. Anote tudo.',
  ],
  sections: [
    { title: 'Mapa do shape', items: ['Trapézio (3×): encolhimento com pausa, terra, rack pull, farmer walk', 'Pescoço (3×): 4 direções + isometria, progressão lenta', 'Peitoral (2×): supino reto + paralelas com carga', 'Ombros (3×): militar, push press, elevação lateral, face pull', 'Braço e antebraço (3×): supersets bi/tri + carregadas + rosca de punho', 'Pernas e glúteo (2–3×): agachamento, leg press, stiff, hip thrust, leg curl', 'Panturrilha (3×): em pé, sentada e no leg press, com pausa', 'Quer mais peito? Troque a remada unilateral do sábado por 3 séries de supino inclinado com halteres.'] },
    { title: 'Ponte com o jiu-jítsu', items: ['Terra / rack pull → levantar o oponente, defesa de queda, base na passagem', 'Hip thrust → ponte e fuga de montada, explosão de quadril', 'Remada / barra fixa → puxada de guarda, controle de gola e manga', 'Farmer / suitcase → pegada que não abre no fim do round', 'Pallof / prancha lateral → resistir à rotação, base lateral', 'Militar / push press → frames, empurrar, explosão', 'Pescoço → proteção em quedas, defesa de guilhotina', 'Sexta com sparring pesado: no sábado, rack pull com 3 reps na reserva e −1 série de leg press. Jiu pesado antes de perna: −1 série de agachamento.', 'Joelho no tatame: até a liberação, evite leg locks, heel hooks e joelho preso com corpo girando. Bata cedo.', 'Cotovelo doendo em extensões/roscas: −1 série. Face pull e rotação externa nunca saem.', 'Pescoço: no máximo +10% de carga por semana, lento, sem falha. Pare com formigamento ou dor cervical.'] },
    { title: 'Comida e recuperação', items: ['Manutenção ou superávit leve (+200 a 300 kcal) nos dias de treino; proteína ~190 g/dia; carboidrato ao redor da musculação; ganho máximo de 0,2–0,4 kg/semana.', 'Tudo certo: cargas subindo ou estáveis, sono bom, joelho sem inchaço, jiu rendendo.', 'Duas semanas sem progredir: coma e durma mais antes de mexer no treino.', 'Dor articular: reduza carga e volume do exercício culpado, não pare tudo. Cansaço acumulado: antecipe o deload.', 'Registrar: cargas e reps dos básicos, peso médio semanal em jejum, medidas e foto a cada 4 semanas, joelho 0–10 pós-treino.'] },
  ],
  blocks: [0, 1, 2].map(troncoBlock),
};

// Instancia um modelo: pasta + treinos + programa (ids novos). Não toca no estado.
export function instantiateProgram(key, uid, template = PROGRAM_TEMPLATES[key]) {
  const t = template;
  const folder = { id: uid(), name: t.name };
  const workouts = [];
  const blocks = t.blocks.map((b) => {
    const ids = b.workouts.map((w) => {
      const id = uid();
      workouts.push({
        id, type: 'strength', name: w.name, folderId: folder.id,
        ...(w.warmup ? { warmup: w.warmup } : {}), ...(w.short ? { short: w.short } : {}), ...(w.sessionMin ? { sessionMin: w.sessionMin } : {}),
        // exercício em lista ([exId, séries, reps, nota, prog, descanso]) ou objeto completo
        exercises: w.exercises.map((e) => (Array.isArray(e)
          ? { exId: e[0], sets: e[1], reps: e[2], rest: e[5] ?? 90, note: e[3], prog: e[4] ?? b.progression }
          : { ...e, prog: e.prog ?? b.progression, rest: e.rest ?? 90 })),
      });
      return id;
    });
    return {
      id: uid(), name: b.name, goal: b.goal, weeks: b.weeks, progression: b.progression, weekPlan: b.weekPlan,
      objective: b.objective, criteria: b.criteria, volumeTargets: b.volumeTargets ?? null, workoutIds: ids, perWeek: ids.length,
    };
  });
  const program = {
    id: uid(), template: key, name: t.name, desc: t.desc, rules: t.rules, sections: t.sections ?? [], schedule: t.schedule ?? null,
    meta: { author: t.author, cover: t.cover, level: t.level, days: t.days, sessionMin: t.sessionMin, goals: t.goals, equipment: t.equipment, tagline: t.tagline },
    blocks, blockIndex: 0, blockStartedAt: null, status: 'ready', createdAt: Date.now(), history: [],
  };
  return { folder, workouts, program };
}
