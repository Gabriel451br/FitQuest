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

// Instancia um modelo: pasta + treinos + programa (ids novos). Não toca no estado.
export function instantiateProgram(key, uid) {
  const t = PROGRAM_TEMPLATES[key];
  const folder = { id: uid(), name: t.name };
  const workouts = [];
  const blocks = t.blocks.map((b) => {
    const ids = b.workouts.map((w) => {
      const id = uid();
      workouts.push({
        id, type: 'strength', name: w.name, folderId: folder.id,
        exercises: w.exercises.map(([exId, sets, reps, note, prog, rest]) => ({ exId, sets, reps, rest: rest ?? 90, note, prog: prog ?? b.progression })),
      });
      return id;
    });
    return {
      id: uid(), name: b.name, goal: b.goal, weeks: b.weeks, progression: b.progression, weekPlan: b.weekPlan,
      objective: b.objective, criteria: b.criteria, volumeTargets: b.volumeTargets ?? null, workoutIds: ids, perWeek: ids.length,
    };
  });
  const program = { id: uid(), template: key, name: t.name, desc: t.desc, rules: t.rules, blocks, blockIndex: 0, blockStartedAt: null, status: 'ready', createdAt: Date.now(), history: [] };
  return { folder, workouts, program };
}
