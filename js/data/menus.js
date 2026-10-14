// Base de cardápios: refeições brasileiras do dia a dia, montadas a partir do
// Guia Alimentar para a População Brasileira (comida de verdade, arroz + feijão,
// frutas, pouca coisa ultraprocessada) e dos padrões usados em planos de
// nutrição esportiva. O gerador só AJUSTA as quantidades para bater as metas.
//
// Item: [idAlimento, papel, gramasBase, min, max]
//   papel: 'p' = fonte de proteína (ajustável), 'c' = carboidrato (ajustável),
//          'f' = gordura (ajustável), 'x' = fixo (salada, fruta, bebida, tempero)
// slots: em quais refeições a opção pode aparecer.

export const MENU_TEMPLATES = [
  // ---------------- Café da manhã ----------------
  { id: 'cafe-pao-ovos', slots: ['cafe'], name: 'Pão francês com ovos mexidos e mamão', items: [[53, 'c', 50, 50, 150], [488, 'p', 100, 50, 200], [260, 'f', 3, 0, 8], [225, 'x', 150, 100, 200], [471, 'x', 150, 150, 150]] },
  { id: 'cafe-tapioca-queijo', slots: ['cafe', 'lanche'], name: 'Tapioca com ovo e queijo minas', items: [[9005, 'c', 60, 30, 120], [488, 'p', 100, 50, 150], [461, 'f', 30, 0, 50], [471, 'x', 150, 150, 150]] },
  { id: 'cafe-iogurte-aveia', slots: ['cafe', 'lanche', 'ceia'], name: 'Iogurte grego com aveia, banana e castanha', items: [[9006, 'p', 170, 100, 350], [7, 'c', 30, 10, 80], [182, 'x', 70, 70, 70], [589, 'f', 10, 0, 25], [507, 'x', 10, 10, 10]] },
  { id: 'cafe-cuscuz-ovo', slots: ['cafe'], name: 'Cuscuz nordestino com ovo e café com leite', items: [[533, 'c', 150, 80, 350], [488, 'p', 100, 50, 200], [262, 'f', 5, 0, 12], [9001, 'x', 100, 100, 100], [471, 'x', 100, 100, 100]] },
  { id: 'cafe-pao-peru', slots: ['cafe', 'lanche'], name: 'Sanduíche de pão integral, peito de peru e requeijão + laranja', items: [[52, 'c', 50, 25, 125], [9010, 'p', 40, 20, 120], [468, 'f', 20, 0, 40], [157, 'x', 30, 30, 30], [214, 'x', 150, 150, 150]] },
  { id: 'cafe-panqueca', slots: ['cafe', 'lanche'], name: 'Panqueca de banana com aveia e mel', items: [[488, 'p', 100, 50, 200], [7, 'c', 30, 15, 80], [182, 'x', 70, 70, 70], [507, 'x', 10, 10, 10], [9004, 'f', 10, 0, 25]] },
  { id: 'cafe-vitamina-whey', slots: ['cafe', 'lanche'], name: 'Vitamina de banana com whey, aveia e pasta de amendoim', items: [[9002, 'x', 250, 250, 250], [9003, 'p', 30, 15, 50], [7, 'c', 30, 10, 80], [182, 'x', 70, 70, 70], [9004, 'f', 10, 0, 30]] },
  { id: 'cafe-crepioca', slots: ['cafe', 'lanche', 'ceia'], name: 'Crepioca com mussarela e tomate', items: [[488, 'p', 100, 50, 200], [9005, 'c', 30, 15, 80], [463, 'f', 20, 0, 40], [157, 'x', 50, 50, 50]] },
  { id: 'cafe-ovos-batata', slots: ['cafe'], name: 'Ovos mexidos com batata-doce e café', items: [[488, 'p', 150, 50, 200], [88, 'c', 150, 80, 300], [260, 'f', 3, 0, 8], [471, 'x', 150, 150, 150]] },
  { id: 'cafe-tofu', slots: ['cafe'], name: 'Tofu mexido com pão integral e mamão', items: [[584, 'p', 150, 80, 300], [52, 'c', 50, 25, 125], [260, 'f', 5, 0, 12], [225, 'x', 150, 150, 150]] },
  { id: 'cafe-mingau-soja', slots: ['cafe', 'ceia'], name: 'Mingau de aveia com bebida de soja, banana e pasta de amendoim', items: [[582, 'p', 250, 200, 400], [7, 'c', 40, 20, 90], [182, 'x', 70, 70, 70], [9004, 'f', 15, 0, 30], [9016, 'x', 5, 5, 5]] },
  { id: 'cafe-tapioca-vegana', slots: ['cafe', 'lanche'], name: 'Tapioca com pasta de amendoim e banana + shake de soja', items: [[9005, 'c', 50, 30, 100], [583, 'p', 25, 15, 50], [9004, 'f', 15, 0, 30], [182, 'x', 70, 70, 70]] },
  { id: 'cafe-pao-queijo-iog', slots: ['cafe'], name: 'Pão francês com queijo minas + iogurte e morango', items: [[53, 'c', 50, 50, 100], [461, 'f', 30, 0, 50], [449, 'p', 170, 100, 340], [239, 'x', 100, 100, 100]] },

  // ---------------- Lanches ----------------
  { id: 'lan-iogurte-granola', slots: ['lanche', 'ceia'], name: 'Iogurte natural com granola e morango', items: [[449, 'p', 170, 100, 400], [9011, 'c', 30, 10, 60], [239, 'x', 100, 100, 100], [9016, 'f', 5, 0, 15]] },
  { id: 'lan-sanduiche-frango', slots: ['lanche'], name: 'Sanduíche natural de frango com cenoura', items: [[52, 'c', 50, 25, 100], [408, 'p', 60, 30, 150], [468, 'f', 15, 0, 30], [110, 'x', 30, 30, 30], [78, 'x', 15, 15, 15]] },
  { id: 'lan-shake-whey', slots: ['lanche'], name: 'Shake de whey com banana e pasta de amendoim', items: [[9003, 'p', 30, 15, 50], [182, 'c', 70, 70, 210], [9004, 'f', 10, 0, 25], [9002, 'x', 200, 200, 200]] },
  { id: 'lan-ovos-fruta', slots: ['lanche', 'ceia'], name: 'Ovos cozidos com maçã e castanha-do-pará', items: [[488, 'p', 100, 50, 200], [222, 'c', 130, 130, 260], [589, 'f', 10, 0, 20]] },
  { id: 'lan-tapioca-frango', slots: ['lanche'], name: 'Tapioca recheada com frango e requeijão', items: [[9005, 'c', 40, 20, 100], [408, 'p', 60, 30, 150], [468, 'f', 15, 0, 30]] },
  { id: 'lan-torrada-pasta', slots: ['lanche'], name: 'Pão integral com pasta de amendoim e banana', items: [[52, 'c', 50, 25, 100], [9004, 'f', 20, 10, 40], [182, 'x', 70, 70, 70], [583, 'p', 20, 0, 40]] },
  { id: 'lan-cottage-kiwi', slots: ['lanche', 'ceia'], name: 'Cottage com kiwi e linhaça', items: [[9014, 'p', 150, 80, 300], [207, 'c', 75, 75, 225], [594, 'f', 10, 0, 20]] },
  { id: 'lan-fruta-iogurte-grego', slots: ['lanche'], name: 'Iogurte grego com manga e aveia', items: [[9006, 'p', 170, 100, 400], [231, 'c', 120, 80, 250], [7, 'x', 15, 15, 15], [9016, 'f', 5, 0, 15]] },
  { id: 'lan-atum-cracker', slots: ['lanche'], name: 'Patê de atum com biscoito cream cracker e tomate', items: [[277, 'p', 60, 30, 120], [13, 'c', 30, 15, 60], [449, 'x', 30, 30, 30], [157, 'x', 50, 50, 50]] },
  { id: 'lan-graodebico', slots: ['lanche'], name: 'Pasta de grão-de-bico (homus) com cenoura e pão integral', items: [[9012, 'p', 100, 60, 250], [52, 'c', 25, 0, 75], [260, 'f', 5, 0, 15], [110, 'x', 60, 60, 60]] },
  { id: 'lan-vitamina-vegana', slots: ['lanche', 'ceia'], name: 'Vitamina de bebida de soja com banana e aveia', items: [[582, 'p', 300, 200, 450], [182, 'c', 70, 70, 140], [7, 'c', 20, 0, 50], [9004, 'f', 10, 0, 25]] },
  { id: 'lan-frango-batata', slots: ['lanche'], name: 'Frango desfiado com batata-doce', items: [[408, 'p', 80, 40, 180], [88, 'c', 100, 50, 250], [260, 'f', 3, 0, 10]] },
  { id: 'lan-atum-batata', slots: ['lanche'], name: 'Atum com batata-doce e tomate', items: [[277, 'p', 60, 30, 150], [88, 'c', 100, 50, 250], [157, 'x', 50, 50, 50]] },
  { id: 'lan-ovos-tapioca', slots: ['lanche', 'ceia'], name: 'Ovos mexidos com tapioca', items: [[488, 'p', 100, 50, 200], [9005, 'c', 30, 0, 80], [260, 'f', 3, 0, 8]] },
  { id: 'lan-pao-queijo-cafe', slots: ['lanche'], name: 'Pão de queijo com café e iogurte', items: [[140, 'c', 50, 30, 100], [449, 'p', 170, 100, 340], [471, 'x', 100, 100, 100]] },

  // ---------------- Ceia ----------------
  { id: 'ceia-iogurte-chia', slots: ['ceia'], name: 'Iogurte grego com chia e morango', items: [[9006, 'p', 170, 100, 340], [9016, 'f', 10, 0, 20], [239, 'x', 80, 80, 80]] },
  { id: 'ceia-ovos', slots: ['ceia'], name: 'Omelete simples com tomate', items: [[488, 'p', 100, 50, 200], [260, 'f', 3, 0, 8], [157, 'x', 60, 60, 60]] },
  { id: 'ceia-leite-aveia', slots: ['ceia'], name: 'Leite morno com aveia e canela', items: [[9002, 'p', 250, 200, 400], [7, 'c', 20, 0, 50], [9016, 'f', 5, 0, 10]] },
  { id: 'ceia-cottage', slots: ['ceia'], name: 'Cottage com castanhas', items: [[9014, 'p', 150, 80, 300], [588, 'f', 10, 0, 20]] },
  { id: 'ceia-frango', slots: ['ceia'], name: 'Frango desfiado com salada', items: [[408, 'p', 80, 40, 180], [78, 'x', 40, 40, 40], [157, 'x', 50, 50, 50], [260, 'f', 5, 0, 12]] },
  { id: 'ceia-tofu', slots: ['ceia'], name: 'Tofu grelhado com gergelim', items: [[584, 'p', 150, 80, 300], [593, 'f', 5, 0, 15], [260, 'x', 3, 3, 3]] },

  // ---------------- Almoço / Jantar ----------------
  { id: 'pf-frango-arroz-feijao', slots: ['almoco', 'jantar'], name: 'Arroz, feijão, frango grelhado e salada', items: [[3, 'c', 150, 60, 500], [561, 'c', 100, 80, 200], [410, 'p', 120, 80, 300], [78, 'x', 40, 40, 40], [157, 'x', 60, 60, 60], [260, 'f', 5, 0, 15]] },
  { id: 'pf-carne-moida', slots: ['almoco', 'jantar'], name: 'Arroz integral, feijão preto, carne moída e legumes', items: [[1, 'c', 150, 60, 500], [567, 'c', 100, 80, 200], [9018, 'p', 120, 80, 280], [109, 'x', 60, 60, 60], [72, 'x', 80, 80, 80], [260, 'f', 3, 0, 10]] },
  { id: 'pf-batatadoce-frango', slots: ['almoco', 'jantar'], name: 'Batata-doce, frango grelhado e brócolis', items: [[88, 'c', 200, 100, 500], [410, 'p', 130, 80, 300], [100, 'x', 100, 100, 100], [260, 'f', 5, 0, 15]] },
  { id: 'pf-macarrao-bolonhesa', slots: ['almoco', 'jantar'], name: 'Macarrão à bolonhesa com salada verde', items: [[9013, 'c', 150, 80, 400], [9018, 'p', 120, 80, 250], [159, 'x', 60, 60, 60], [78, 'x', 40, 40, 40], [260, 'f', 5, 0, 12]] },
  { id: 'pf-peixe-pure', slots: ['almoco', 'jantar'], name: 'Merluza assada com batata cozida e cenoura', items: [[301, 'p', 150, 100, 300], [91, 'c', 200, 100, 500], [109, 'x', 80, 80, 80], [260, 'f', 8, 0, 20]] },
  { id: 'pf-tilapia', slots: ['almoco', 'jantar'], name: 'Tilápia grelhada, arroz, feijão e vinagrete', items: [[9009, 'p', 150, 100, 300], [3, 'c', 130, 60, 350], [561, 'c', 80, 60, 160], [157, 'x', 60, 60, 60], [142, 'x', 40, 40, 40], [260, 'f', 5, 0, 15]] },
  { id: 'pf-salmao', slots: ['almoco', 'jantar'], name: 'Salmão grelhado com arroz e legumes', items: [[317, 'p', 120, 80, 220], [3, 'c', 130, 60, 350], [100, 'x', 80, 80, 80], [72, 'x', 80, 80, 80]] },
  { id: 'pf-escondidinho', slots: ['almoco', 'jantar'], name: 'Escondidinho de mandioca com carne e couve', items: [[129, 'c', 180, 80, 400], [371, 'p', 120, 80, 250], [116, 'x', 50, 50, 50], [262, 'f', 5, 0, 12]] },
  { id: 'pf-strogonoff', slots: ['almoco', 'jantar'], name: 'Strogonoff fit de frango com arroz e salada', items: [[408, 'p', 130, 80, 280], [3, 'c', 130, 60, 350], [448, 'x', 50, 50, 50], [159, 'x', 30, 30, 30], [78, 'x', 40, 40, 40], [260, 'f', 3, 0, 10]] },
  { id: 'pf-lombo', slots: ['almoco', 'jantar'], name: 'Lombo suíno assado, mandioca, feijão e couve', items: [[432, 'p', 120, 80, 250], [129, 'c', 150, 60, 350], [561, 'c', 80, 60, 160], [116, 'x', 50, 50, 50]] },
  { id: 'pf-coxao', slots: ['almoco', 'jantar'], name: 'Bife de coxão mole, arroz, feijão e salada de tomate', items: [[351, 'p', 120, 80, 250], [3, 'c', 150, 60, 400], [561, 'c', 100, 80, 200], [157, 'x', 80, 80, 80], [260, 'f', 3, 0, 10]] },
  { id: 'pf-cuscuz-frango', slots: ['almoco', 'jantar'], name: 'Cuscuz com frango desfiado e salada', items: [[533, 'c', 150, 80, 400], [408, 'p', 120, 80, 280], [78, 'x', 40, 40, 40], [157, 'x', 60, 60, 60], [260, 'f', 5, 0, 15]] },
  { id: 'pf-omelete', slots: ['almoco', 'jantar'], name: 'Omelete de queijo com arroz, feijão e salada', items: [[488, 'p', 150, 100, 250], [463, 'f', 20, 0, 40], [3, 'c', 120, 60, 350], [561, 'c', 80, 60, 160], [78, 'x', 40, 40, 40], [157, 'x', 60, 60, 60]] },
  { id: 'pf-lentilha-ovo', slots: ['almoco', 'jantar'], name: 'Lentilha com arroz, ovo cozido e abóbora', items: [[577, 'p', 150, 80, 300], [488, 'p', 50, 50, 150], [3, 'c', 120, 60, 300], [64, 'x', 80, 80, 80], [260, 'f', 5, 0, 15]] },
  { id: 'pf-tofu-arroz', slots: ['almoco', 'jantar'], name: 'Tofu grelhado, arroz, feijão e legumes', items: [[584, 'p', 200, 100, 400], [3, 'c', 130, 60, 350], [567, 'c', 100, 80, 250], [100, 'x', 80, 80, 80], [260, 'f', 5, 0, 15]] },
  { id: 'pf-graodebico', slots: ['almoco', 'jantar'], name: 'Grão-de-bico ensopado com arroz integral e couve', items: [[9012, 'p', 150, 80, 350], [1, 'c', 120, 60, 300], [116, 'x', 50, 50, 50], [159, 'x', 40, 40, 40], [260, 'f', 5, 0, 12]] },
  { id: 'pf-pts-bolonhesa', slots: ['almoco', 'jantar'], name: 'Macarrão com bolonhesa de proteína de soja', items: [[9015, 'p', 150, 80, 350], [9013, 'c', 150, 80, 400], [159, 'x', 80, 80, 80], [260, 'f', 5, 0, 15]] },
  { id: 'pf-frango-mandioca', slots: ['almoco', 'jantar'], name: 'Coxa de frango assada, mandioca cozida e salada', items: [[398, 'p', 130, 80, 280], [129, 'c', 150, 60, 350], [78, 'x', 40, 40, 40], [142, 'x', 40, 40, 40], [260, 'f', 3, 0, 10]] },
  { id: 'pf-sardinha', slots: ['almoco', 'jantar'], name: 'Sardinha assada, arroz, feijão e beterraba', items: [[318, 'p', 120, 80, 220], [3, 'c', 130, 60, 350], [561, 'c', 80, 60, 160], [97, 'x', 60, 60, 60]] },
  { id: 'pf-jantar-leve', slots: ['jantar'], name: 'Frango grelhado com purê de abóbora e salada (leve)', items: [[410, 'p', 140, 80, 300], [64, 'c', 200, 100, 400], [78, 'x', 40, 40, 40], [157, 'x', 60, 60, 60], [260, 'f', 8, 0, 20]] },
  { id: 'pf-jantar-sopa', slots: ['jantar'], name: 'Sopa de legumes com carne e batata', items: [[371, 'p', 120, 80, 250], [91, 'c', 150, 80, 350], [109, 'x', 60, 60, 60], [112, 'x', 60, 60, 60], [70, 'x', 60, 60, 60], [260, 'f', 5, 0, 15]] },
];

// Medidas caseiras para mostrar e arredondar porções.
export const HOUSE_UNITS = {
  488: [50, 'ovo', 'ovos'], 489: [50, 'ovo', 'ovos'], 490: [50, 'ovo', 'ovos'],
  53: [50, 'pão francês', 'pães franceses'], 52: [25, 'fatia', 'fatias'],
  182: [70, 'banana', 'bananas'], 222: [130, 'maçã', 'maçãs'], 207: [75, 'kiwi', 'kiwis'],
  140: [25, 'pão de queijo', 'pães de queijo'], 13: [6, 'biscoito', 'biscoitos'],
  9003: [30, 'scoop', 'scoops'],
};

// Tags para restrições (o que cada alimento contém).
export const FOOD_TAGS = {
  // carnes
  410: ['carne'], 408: ['carne'], 398: ['carne'], 9018: ['carne'], 371: ['carne'], 432: ['carne', 'porco'], 351: ['carne'], 9010: ['carne'],
  // peixes
  301: ['peixe'], 9009: ['peixe'], 317: ['peixe'], 318: ['peixe'], 277: ['peixe'],
  // ovos
  488: ['ovo'], 489: ['ovo'], 490: ['ovo'], 140: ['ovo', 'lactose'],
  // laticínios
  9006: ['lactose'], 449: ['lactose'], 448: ['lactose'], 461: ['lactose'], 463: ['lactose'], 468: ['lactose'], 9014: ['lactose'], 9001: ['lactose'], 9002: ['lactose'], 262: ['lactose'], 9003: ['lactose', 'suplemento'],
  // glúten
  53: ['gluten'], 52: ['gluten'], 7: ['gluten'], 9011: ['gluten'], 9013: ['gluten'], 13: ['gluten'],
  // oleaginosas
  589: ['castanha'], 588: ['castanha'], 9004: ['amendoim'],
  // soja
  584: ['soja'], 582: ['soja'], 583: ['soja', 'suplemento'], 9015: ['soja'],
};
