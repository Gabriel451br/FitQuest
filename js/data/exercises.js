// Grupos musculares e biblioteca base de exercícios.
// Séries contam 1.0 para o grupo primário e 0.5 para cada secundário no volume semanal.

export const MUSCLES = {
  peito: 'Peito',
  costas: 'Costas',
  ombros: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  antebraco: 'Antebraço',
  trapezio: 'Trapézio',
  quadriceps: 'Quadríceps',
  posterior: 'Posterior',
  gluteos: 'Glúteos',
  panturrilha: 'Panturrilha',
  abdomen: 'Abdômen',
};

// Faixa de séries semanais de referência (MEV–MRV aproximados para hipertrofia).
export const WEEKLY_SET_TARGET = { min: 10, max: 20 };

// [id, nome, primário, [secundários]]
const RAW = [
  ['supino-reto', 'Supino reto (barra)', 'peito', ['triceps', 'ombros']],
  ['supino-reto-halter', 'Supino reto (halteres)', 'peito', ['triceps', 'ombros']],
  ['supino-inclinado', 'Supino inclinado (barra)', 'peito', ['ombros', 'triceps']],
  ['supino-inclinado-halter', 'Supino inclinado (halteres)', 'peito', ['ombros', 'triceps']],
  ['supino-declinado', 'Supino declinado', 'peito', ['triceps']],
  ['crucifixo', 'Crucifixo (halteres)', 'peito', []],
  ['crossover', 'Crossover (polia)', 'peito', []],
  ['peck-deck', 'Peck deck / voador', 'peito', []],
  ['flexao', 'Flexão de braço', 'peito', ['triceps', 'ombros']],
  ['paralelas', 'Paralelas (mergulho)', 'peito', ['triceps', 'ombros']],

  ['barra-fixa', 'Barra fixa (pronada)', 'costas', ['biceps']],
  ['barra-supinada', 'Barra fixa (supinada)', 'costas', ['biceps']],
  ['puxada-frente', 'Puxada frente (polia)', 'costas', ['biceps']],
  ['puxada-triangulo', 'Puxada triângulo', 'costas', ['biceps']],
  ['remada-curvada', 'Remada curvada (barra)', 'costas', ['biceps', 'posterior']],
  ['remada-unilateral', 'Remada unilateral (halter)', 'costas', ['biceps']],
  ['remada-baixa', 'Remada baixa (polia)', 'costas', ['biceps']],
  ['remada-cavalinho', 'Remada cavalinho (T-bar)', 'costas', ['biceps']],
  ['pulldown', 'Pulldown braços estendidos', 'costas', []],
  ['levantamento-terra', 'Levantamento terra', 'posterior', ['gluteos', 'costas', 'trapezio']],

  ['desenvolvimento', 'Desenvolvimento (barra)', 'ombros', ['triceps']],
  ['desenvolvimento-halter', 'Desenvolvimento (halteres)', 'ombros', ['triceps']],
  ['elevacao-lateral', 'Elevação lateral', 'ombros', []],
  ['elevacao-lateral-polia', 'Elevação lateral (polia)', 'ombros', []],
  ['elevacao-frontal', 'Elevação frontal', 'ombros', []],
  ['crucifixo-inverso', 'Crucifixo inverso', 'ombros', ['costas']],
  ['face-pull', 'Face pull', 'ombros', ['trapezio']],
  ['encolhimento', 'Encolhimento', 'trapezio', []],

  ['rosca-direta', 'Rosca direta (barra)', 'biceps', ['antebraco']],
  ['rosca-alternada', 'Rosca alternada (halteres)', 'biceps', ['antebraco']],
  ['rosca-martelo', 'Rosca martelo', 'biceps', ['antebraco']],
  ['rosca-scott', 'Rosca Scott', 'biceps', []],
  ['rosca-polia', 'Rosca na polia', 'biceps', []],
  ['rosca-inclinada', 'Rosca inclinada', 'biceps', []],

  ['triceps-polia', 'Tríceps na polia (barra)', 'triceps', []],
  ['triceps-corda', 'Tríceps corda', 'triceps', []],
  ['triceps-frances', 'Tríceps francês', 'triceps', []],
  ['triceps-testa', 'Tríceps testa', 'triceps', []],
  ['supino-fechado', 'Supino fechado', 'triceps', ['peito']],
  ['mergulho-banco', 'Mergulho no banco', 'triceps', []],

  ['rosca-punho', 'Rosca de punho', 'antebraco', []],

  ['agachamento', 'Agachamento livre', 'quadriceps', ['gluteos', 'posterior']],
  ['agachamento-frontal', 'Agachamento frontal', 'quadriceps', ['gluteos']],
  ['agachamento-smith', 'Agachamento no Smith', 'quadriceps', ['gluteos']],
  ['hack', 'Agachamento hack', 'quadriceps', ['gluteos']],
  ['leg-press', 'Leg press 45°', 'quadriceps', ['gluteos']],
  ['cadeira-extensora', 'Cadeira extensora', 'quadriceps', []],
  ['afundo', 'Afundo / passada', 'quadriceps', ['gluteos']],
  ['bulgaro', 'Agachamento búlgaro', 'quadriceps', ['gluteos']],

  ['stiff', 'Stiff', 'posterior', ['gluteos']],
  ['rdl', 'Levantamento terra romeno', 'posterior', ['gluteos']],
  ['mesa-flexora', 'Mesa flexora', 'posterior', []],
  ['cadeira-flexora', 'Cadeira flexora', 'posterior', []],
  ['good-morning', 'Good morning', 'posterior', ['gluteos']],

  ['hip-thrust', 'Elevação pélvica (hip thrust)', 'gluteos', ['posterior']],
  ['abducao', 'Cadeira abdutora', 'gluteos', []],
  ['gluteo-polia', 'Glúteo na polia (coice)', 'gluteos', []],

  ['panturrilha-pe', 'Panturrilha em pé', 'panturrilha', []],
  ['panturrilha-sentado', 'Panturrilha sentado', 'panturrilha', []],
  ['panturrilha-leg', 'Panturrilha no leg press', 'panturrilha', []],

  ['abdominal-crunch', 'Abdominal crunch', 'abdomen', []],
  ['abdominal-polia', 'Abdominal na polia', 'abdomen', []],
  ['elevacao-pernas', 'Elevação de pernas', 'abdomen', []],
  ['prancha', 'Prancha (segundos)', 'abdomen', []],
  ['roda', 'Roda abdominal', 'abdomen', []],
];

export const BASE_EXERCISES = RAW.map(([id, name, primary, secondary]) => ({ id, name, primary, secondary }));

// Modelos de divisão prontos para começar rápido.
export const SPLIT_TEMPLATES = {
  fullbody: {
    name: 'Full body 3x',
    workouts: [
      { name: 'Full A', exercises: ['agachamento', 'supino-reto', 'remada-curvada', 'desenvolvimento-halter', 'rosca-direta', 'triceps-corda'] },
      { name: 'Full B', exercises: ['levantamento-terra', 'supino-inclinado-halter', 'puxada-frente', 'elevacao-lateral', 'panturrilha-pe', 'abdominal-polia'] },
    ],
  },
  upperlower: {
    name: 'Upper / Lower 4x',
    workouts: [
      { name: 'Upper A', exercises: ['supino-reto', 'remada-curvada', 'desenvolvimento-halter', 'puxada-frente', 'rosca-direta', 'triceps-polia'] },
      { name: 'Lower A', exercises: ['agachamento', 'rdl', 'leg-press', 'mesa-flexora', 'panturrilha-pe', 'abdominal-crunch'] },
      { name: 'Upper B', exercises: ['supino-inclinado-halter', 'barra-fixa', 'remada-baixa', 'elevacao-lateral', 'rosca-martelo', 'triceps-frances'] },
      { name: 'Lower B', exercises: ['levantamento-terra', 'hack', 'bulgaro', 'cadeira-flexora', 'hip-thrust', 'panturrilha-sentado'] },
    ],
  },
  ppl: {
    name: 'Push / Pull / Legs',
    workouts: [
      { name: 'Push', exercises: ['supino-reto', 'supino-inclinado-halter', 'desenvolvimento-halter', 'elevacao-lateral', 'crossover', 'triceps-corda'] },
      { name: 'Pull', exercises: ['barra-fixa', 'remada-curvada', 'remada-baixa', 'face-pull', 'rosca-direta', 'rosca-martelo'] },
      { name: 'Legs', exercises: ['agachamento', 'rdl', 'leg-press', 'cadeira-extensora', 'mesa-flexora', 'panturrilha-pe'] },
    ],
  },
  abc: {
    name: 'ABC clássico',
    workouts: [
      { name: 'A — Peito/Tríceps', exercises: ['supino-reto', 'supino-inclinado-halter', 'crucifixo', 'paralelas', 'triceps-polia', 'triceps-frances'] },
      { name: 'B — Costas/Bíceps', exercises: ['puxada-frente', 'remada-curvada', 'remada-unilateral', 'pulldown', 'rosca-direta', 'rosca-martelo'] },
      { name: 'C — Pernas/Ombros', exercises: ['agachamento', 'leg-press', 'mesa-flexora', 'desenvolvimento-halter', 'elevacao-lateral', 'panturrilha-pe'] },
    ],
  },
};
