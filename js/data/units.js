// Medidas caseiras (unidade, fatia, colher, concha…) → gramas.
// Não altera a tabela TACO: os valores nutricionais continuam por 100 g; aqui só
// dizemos quantos gramas tem "1 ovo", "1 fatia", "1 concha" etc. (valores médios de
// tabelas brasileiras de medidas caseiras — o app sempre mostra os gramas equivalentes).
//
// Cada regra: [regex no nome normalizado (sem acento, minúsculo), [[singular, plural, gramas], ...], padrão?]
// padrão = true → ao adicionar, já abre na 1ª medida (ex.: 1 ovo) em vez de gramas.
import { normalize } from '../util.js';

const U = (s, p, g) => [s, p, g];
const colherSopa = (g) => U('colher de sopa', 'colheres de sopa', g);
const colherCha = (g) => U('colher de chá', 'colheres de chá', g);
const copo = U('copo (200 ml)', 'copos (200 ml)', 200);
const xicara = U('xícara (240 ml)', 'xícaras (240 ml)', 240);
const fatia = (g) => U('fatia', 'fatias', g);
const unid = (s, p, g) => U(s, p, g);

const RULES = [
  // ovos
  [/^ovo, de codorna/, [unid('ovo', 'ovos', 10)], true],
  [/^ovo, de galinha, clara/, [unid('clara', 'claras', 30)], true],
  [/^ovo, de galinha, gema/, [unid('gema', 'gemas', 17)], true],
  [/^ovo, de galinha/, [unid('ovo', 'ovos', 50)], true],
  [/^omelete/, [unid('omelete (2 ovos)', 'omeletes', 120)], true],
  [/clara de ovo pasteurizada/, [unid('clara', 'claras', 30), colherSopa(15)], true],
  // pães, biscoitos, bolos
  [/^pao, trigo, frances|^pao, trigo, sovado/, [unid('pão', 'pães', 50)], true],
  [/^pao, .*forma|^pao, de soja/, [fatia(25)], true],
  [/^pao, de queijo/, [unid('pão de queijo', 'pães de queijo', 25)], true],
  [/^torrada/, [unid('torrada', 'torradas', 10)], true],
  [/^biscoito, salgado|^biscoito, doce, maisena/, [unid('biscoito', 'biscoitos', 6)], true],
  [/^biscoito, doce, recheado/, [unid('biscoito', 'biscoitos', 15)], true],
  [/^biscoito, doce, wafer/, [unid('wafer', 'wafers', 8)], true],
  [/^bolo, pronto/, [fatia(60)], true],
  [/^tapioca, goma/, [unid('tapioca média', 'tapiocas médias', 60), colherSopa(20)]],
  [/^tapioca, com manteiga/, [unid('tapioca', 'tapiocas', 100)], true],
  [/^cuscuz/, [unid('pedaço', 'pedaços', 100), colherSopa(30)]],
  [/^pamonha/, [unid('pamonha', 'pamonhas', 150)], true],
  // grãos e preparações
  [/^arroz.*cozido|^arroz carreteiro|^baiao de dois|^bolinho de arroz/, [colherSopa(25), U('escumadeira', 'escumadeiras', 90)]],
  [/^feijao, .*cozido|^feijoada|^lentilha, cozida|^grao-de-bico, cozido/, [U('concha', 'conchas', 140), colherSopa(20)]],
  [/^feijao tropeiro|^farofa|^mandioca, farofa/, [U('colher de servir', 'colheres de servir', 45), colherSopa(16)]],
  [/^macarrao.*cozid|^macarrao, molho|^yakisoba|^lasanha.*cozida/, [U('pegador', 'pegadores', 110), U('colher de servir', 'colheres de servir', 45)]],
  [/^estrogonofe|^vaca atolada|^salpicao|^quibebe|^salada/, [U('colher de servir', 'colheres de servir', 45), colherSopa(25)]],
  [/^aveia/, [colherSopa(15)]],
  [/granola/, [colherSopa(10)]],
  [/^creme de arroz/, [colherSopa(15)]],
  [/^farinha, de mandioca/, [colherSopa(16)]],
  [/^farinha|^fecula|^polvilho|^milho, amido|^milho, fuba/, [colherSopa(10), U('xícara', 'xícaras', 120)]],
  [/^cereal matinal|^cereais, milho, flocos/, [U('xícara', 'xícaras', 30)]],
  [/^pipoca/, [U('xícara', 'xícaras', 10)]],
  [/^milho, verde, enlatado|^ervilha, enlatada/, [colherSopa(20)]],
  [/proteina texturizada de soja/, [colherSopa(25)]],
  // tubérculos e legumes
  [/^batata, (inglesa|doce), cozida/, [unid('batata média', 'batatas médias', 130), colherSopa(30)]],
  [/^batata, inglesa, sauté|^mandioca, cozida|^inhame|^cara, cozido/, [unid('pedaço', 'pedaços', 60), colherSopa(30)]],
  [/^tomate, com semente/, [unid('tomate', 'tomates', 100), fatia(15)]],
  [/^alface/, [U('folha', 'folhas', 10)]],
  [/^cenoura/, [unid('cenoura média', 'cenouras médias', 120), colherSopa(12)]],
  [/^cebola, crua/, [unid('cebola média', 'cebolas médias', 80), colherSopa(15)]],
  [/^alho, cru/, [U('dente', 'dentes', 4)], true],
  [/^brocolis/, [U('ramo', 'ramos', 30)]],
  [/^beterraba/, [unid('beterraba média', 'beterrabas médias', 110), colherSopa(15)]],
  [/^abobrinha|^berinjela|^chuchu/, [colherSopa(25)]],
  // frutas
  [/^banana, nanica/, [unid('banana', 'bananas', 100)], true],
  [/^banana, da terra/, [unid('banana', 'bananas', 150)], true],
  [/^banana, ouro/, [unid('banana', 'bananas', 40)], true],
  [/^banana, (prata|maca|pacova|figo)/, [unid('banana', 'bananas', 70)], true],
  [/^maca, .*crua/, [unid('maçã', 'maçãs', 130)], true],
  [/^laranja, .*crua/, [unid('laranja', 'laranjas', 180)], true],
  [/^mexerica|^tangerina, ponca, crua/, [unid('tangerina', 'tangerinas', 135)], true],
  [/^pera, /, [unid('pera', 'peras', 150)], true],
  [/^pessego, aurora/, [unid('pêssego', 'pêssegos', 100)], true],
  [/^goiaba, .*crua/, [unid('goiaba', 'goiabas', 170)], true],
  [/^kiwi/, [unid('kiwi', 'kiwis', 75)], true],
  [/^caqui/, [unid('caqui', 'caquis', 110)], true],
  [/^ameixa, crua/, [unid('ameixa', 'ameixas', 30)], true],
  [/^morango/, [unid('morango', 'morangos', 12)], true],
  [/^uva, .*crua/, [unid('uva', 'uvas', 6), U('cacho pequeno', 'cachos pequenos', 150)], true],
  [/^mamao, papaia/, [U('metade', 'metades', 155), fatia(100)], true],
  [/^mamao, formosa/, [fatia(170)], true],
  [/^manga, .*crua/, [unid('manga', 'mangas', 300)], true],
  [/^melancia/, [fatia(200)], true],
  [/^melao/, [fatia(115)], true],
  [/^abacaxi, cru/, [fatia(75)], true],
  [/^abacate/, [colherSopa(30)]],
  [/^acai, polpa|polpa, congelada/, [U('pacote de polpa', 'pacotes de polpa', 100)]],
  // gorduras
  [/^azeite|^oleo/, [colherSopa(13), colherCha(4)]],
  [/^manteiga|^margarina/, [colherCha(5), colherSopa(12)]],
  [/^maionese/, [colherSopa(12)]],
  // laticínios
  [/requeijao/, [colherSopa(30)]],
  [/^queijo, (mozarela|prato|pasteurizado)/, [fatia(20)], true],
  [/^queijo, minas/, [fatia(30)], true],
  [/^queijo, ricota/, [fatia(30)]],
  [/^queijo, parmesao/, [colherSopa(10)]],
  [/queijo cottage/, [colherSopa(25)]],
  [/^queijo, petit suisse/, [U('pote', 'potes', 45)], true],
  [/iogurte grego/, [U('pote', 'potes', 100)], true],
  [/^iogurte|^bebida lactea/, [U('pote', 'potes', 170), copo]],
  [/^leite, fermentado/, [U('frasco', 'frascos', 80)], true],
  [/^leite, (de vaca, (integral|desnatado), fluido|de cabra|de vaca, achocolatado)|bebida vegetal|^soja, extrato soluvel, natural/, [copo, xicara]],
  [/^leite, .*po|^soja, extrato soluvel, po/, [colherSopa(16)]],
  [/^leite, condensado/, [colherSopa(20)]],
  [/^creme de leite/, [colherSopa(15)]],
  [/^leite, de coco/, [colherSopa(15)]],
  // carnes, peixes, frios
  [/^frango, (peito|file)|tilapia|^merluza, file|^pescada, file|^salmao|^abadejo/, [U('filé médio', 'filés médios', 100)]],
  [/^frango, (coxa|sobrecoxa)/, [unid('unidade', 'unidades', 100)]],
  [/carne moida|moido, cozido/, [colherSopa(25)]],
  [/^carne, bovina.*(grelhad|cozid|assad)|^bife a cavalo|^porco, (bisteca|lombo)/, [U('bife médio', 'bifes médios', 100)]],
  [/^hamburguer/, [unid('hambúrguer', 'hambúrgueres', 90)], true],
  [/^linguica/, [U('gomo', 'gomos', 60)], true],
  [/^presunto|^apresuntado|^mortadela|peito de peru/, [fatia(15)], true],
  [/^salame/, [fatia(5)], true],
  [/^atum, conserva/, [U('lata (drenado)', 'latas (drenado)', 120)]],
  [/^sardinha, conserva/, [U('lata (drenado)', 'latas (drenado)', 84)]],
  [/^soja, queijo/, [fatia(30)]],
  // salgados
  [/^coxinha/, [unid('coxinha', 'coxinhas', 80)], true],
  [/^empada/, [unid('empada', 'empadas', 60)], true],
  [/^pastel, .*frito/, [unid('pastel', 'pastéis', 60)], true],
  [/^quibe, (frito|assado)|^croquete, de carne, frito/, [unid('unidade', 'unidades', 80)], true],
  [/^acaraje/, [unid('acarajé', 'acarajés', 120)], true],
  // doces, açúcares
  [/^acucar|^achocolatado, po|^capuccino/, [colherSopa(12), colherCha(4)]],
  [/^mel, |^melado/, [colherSopa(20), colherCha(7)]],
  [/^doce, de leite|^doce, de abobora|^geleia/, [colherSopa(20)]],
  [/^chocolate/, [U('quadradinho', 'quadradinhos', 5), U('barra pequena (25 g)', 'barras pequenas', 25)]],
  [/^pacoca|^pe-de-moleque/, [unid('unidade', 'unidades', 20)], true],
  // oleaginosas, sementes, suplementos
  [/whey protein/, [U('scoop', 'scoops', 30)], true],
  [/pasta de amendoim/, [colherSopa(15)]],
  [/^amendoim/, [colherSopa(15)]],
  [/^castanha-do-brasil/, [unid('castanha', 'castanhas', 4)], true],
  [/^castanha-de-caju/, [unid('castanha', 'castanhas', 2.5)], true],
  [/^amendoa/, [unid('amêndoa', 'amêndoas', 1.2)], true],
  [/^noz, /, [unid('noz', 'nozes', 5)], true],
  [/chia, semente|^linhaca|^gergelim/, [colherSopa(10)]],
  // bebidas
  [/^cafe, infusao/, [U('xícara de café (50 ml)', 'xícaras de café', 50), copo]],
  [/^cha, /, [U('xícara (200 ml)', 'xícaras', 200)]],
  [/^refrigerante|^cerveja/, [U('lata (350 ml)', 'latas (350 ml)', 350), copo]],
  [/^bebida isotonica/, [U('garrafa (500 ml)', 'garrafas', 500), copo]],
  [/suco|^coco, agua de|^cana, caldo/, [copo]],
  [/^shoyu/, [colherSopa(15)]],
];

const cache = new Map();

/**
 * Medidas disponíveis para um alimento: [{ label, plural, g }], e se a 1ª é o padrão.
 * Alimentos personalizados com "serving" (porção do rótulo ou refeição transformada
 * em alimento) ganham a medida "porção".
 */
export function unitsFor(food) {
  if (!food) return { units: [], preferred: false };
  if (food.custom) {
    if (!food.serving) return { units: [], preferred: false };
    return { units: [{ label: food.servingLabel ?? 'porção', plural: food.servingPlural ?? 'porções', g: food.serving }], preferred: true };
  }
  if (cache.has(food.id)) return cache.get(food.id);
  const n = normalize(food.name);
  let out = { units: [], preferred: false };
  for (const [re, list, pref] of RULES) {
    if (re.test(n)) {
      out = { units: list.map(([label, plural, g]) => ({ label, plural, g })), preferred: !!pref };
      break;
    }
  }
  cache.set(food.id, out);
  return out;
}

// "2 ovos", "½ banana", "1,5 colher de sopa"
export function unitText(q, u) {
  const n = Number(q) || 0;
  const qs = n === 0.5 ? '½' : String(+n.toFixed(2)).replace('.', ',');
  return `${qs} ${n > 1 ? u.plural : u.label}`;
}
