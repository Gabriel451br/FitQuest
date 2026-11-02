// Estilo, tempo de preparo e modo de preparo de cada cardápio (data/menus.js).
// tags: br (tradicional brasileiro), fit (fitness clássico), fitonly (só faz sentido no
// estilo fitness, ex.: batata-doce no lanche), quick (até 15 min), nocook (sem fogão),
// batch (bom para marmita), lowcarb, med (mediterrâneo), dense (calórico, ajuda no ganho
// de massa), light (leve e volumoso, bom para secar), sweet (doce).
// time: minutos de preparo ativos. recipe: passos curtos.

export const RECIPES = {
  // Café da manhã
  'cafe-pao-ovos': { tags: ['br', 'quick'], time: 10, recipe: ['Bata os ovos com uma pitada de sal e mexa em fogo baixo com um fio de azeite.', 'Abra o pão e recheie com os ovos.', 'Sirva com o mamão picado e café sem açúcar (ou adoçante).'] },
  'cafe-tapioca-queijo': { tags: ['br', 'quick'], time: 10, recipe: ['Espalhe a goma na frigideira antiaderente fria e ligue o fogo médio.', 'Quando soltar, vire e recheie com ovo mexido e queijo minas.', 'Dobre e sirva com café.'] },
  'cafe-iogurte-aveia': { tags: ['quick', 'nocook', 'sweet'], time: 3, recipe: ['Coloque o iogurte numa tigela.', 'Cubra com aveia, banana em rodelas, castanha picada e o mel.'] },
  'cafe-cuscuz-ovo': { tags: ['br'], time: 15, recipe: ['Hidrate a flocão com água e sal por 5 min e cozinhe no vapor (cuscuzeira) por 8–10 min.', 'Frite ou mexa os ovos com a manteiga.', 'Sirva com café com leite.'] },
  'cafe-pao-peru': { tags: ['quick', 'nocook'], time: 5, recipe: ['Passe o requeijão no pão.', 'Monte com o peito de peru e rodelas de tomate.', 'Acompanhe com a laranja.'] },
  'cafe-panqueca': { tags: ['fit', 'sweet', 'quick'], time: 12, recipe: ['Amasse a banana e misture com os ovos e a aveia.', 'Despeje em frigideira antiaderente untada, doure dos dois lados.', 'Finalize com mel e pasta de amendoim.'] },
  'cafe-vitamina-whey': { tags: ['fit', 'quick', 'nocook', 'dense', 'sweet'], time: 3, recipe: ['Bata no liquidificador o leite, a banana, o whey, a aveia e a pasta de amendoim.', 'Gelo a gosto.'] },
  'cafe-crepioca': { tags: ['fit', 'quick'], time: 8, recipe: ['Misture ovos e goma de tapioca com sal.', 'Despeje na frigideira, vire quando firmar.', 'Recheie com mussarela e tomate e dobre.'] },
  'cafe-ovos-batata': { tags: ['fit', 'fitonly', 'batch'], time: 10, recipe: ['Cozinhe batata-doce em quantidade no domingo e guarde na geladeira.', 'Mexa os ovos com azeite e sal.', 'Esquente a batata e sirva com café.'] },
  'cafe-tofu': { tags: ['quick'], time: 10, recipe: ['Esfarele o tofu na frigideira com azeite, cúrcuma, sal e pimenta (fica como ovo mexido).', 'Sirva no pão integral com mamão ao lado.'] },
  'cafe-mingau-soja': { tags: ['sweet', 'quick'], time: 8, recipe: ['Cozinhe a aveia na bebida de soja mexendo até engrossar (5 min).', 'Sirva com banana, pasta de amendoim e chia.'] },
  'cafe-tapioca-vegana': { tags: ['quick'], time: 8, recipe: ['Faça a tapioca e recheie com pasta de amendoim e banana.', 'Bata a proteína de soja com água gelada para o shake.'] },
  'cafe-pao-queijo-iog': { tags: ['br', 'quick', 'nocook'], time: 3, recipe: ['Pão francês com queijo minas (pode esquentar na chapa).', 'Iogurte com morango picado.'] },

  // Lanches
  'lan-iogurte-granola': { tags: ['quick', 'nocook', 'sweet'], time: 2, recipe: ['Iogurte na tigela, granola e morango por cima, chia a gosto.'] },
  'lan-sanduiche-frango': { tags: ['br', 'batch'], time: 5, recipe: ['Misture frango desfiado (cozido e temperado) com requeijão e cenoura ralada.', 'Monte no pão integral com alface. Dá para levar na marmita.'] },
  'lan-shake-whey': { tags: ['fit', 'fitonly', 'quick', 'nocook', 'dense'], time: 2, recipe: ['Bata o whey com leite, banana e pasta de amendoim.'] },
  'lan-ovos-fruta': { tags: ['fit', 'quick', 'batch'], time: 12, recipe: ['Cozinhe os ovos por 10 min (dá para deixar vários prontos na geladeira).', 'Leve com a maçã e as castanhas.'] },
  'lan-tapioca-frango': { tags: ['br', 'quick'], time: 10, recipe: ['Faça a tapioca e recheie com frango desfiado e requeijão.'] },
  'lan-torrada-pasta': { tags: ['quick', 'nocook', 'dense', 'sweet'], time: 3, recipe: ['Pasta de amendoim no pão integral, banana em rodelas por cima.', 'A proteína de soja/whey pode ir batida com água à parte.'] },
  'lan-cottage-kiwi': { tags: ['quick', 'nocook', 'light'], time: 3, recipe: ['Cottage na tigela com kiwi picado e linhaça.'] },
  'lan-fruta-iogurte-grego': { tags: ['quick', 'nocook', 'sweet'], time: 3, recipe: ['Iogurte grego com manga em cubos, aveia e chia.'] },
  'lan-atum-cracker': { tags: ['quick', 'nocook'], time: 5, recipe: ['Amasse o atum escorrido com o iogurte, sal, limão e cheiro-verde.', 'Sirva com o biscoito e rodelas de tomate.'] },
  'lan-graodebico': { tags: ['med', 'quick'], time: 8, recipe: ['Bata grão-de-bico cozido com azeite, limão, alho e sal até virar pasta (homus).', 'Sirva com palitos de cenoura e pão integral.'] },
  'lan-vitamina-vegana': { tags: ['quick', 'nocook', 'sweet'], time: 3, recipe: ['Bata a bebida de soja com banana, aveia e pasta de amendoim.'] },
  'lan-frango-batata': { tags: ['fit', 'fitonly', 'batch'], time: 5, recipe: ['Pote de marmita: frango desfiado e batata-doce cozidos no fim de semana.', 'Esquente 2 min no micro-ondas.'] },
  'lan-atum-batata': { tags: ['fit', 'fitonly', 'batch'], time: 5, recipe: ['Batata-doce cozida com atum escorrido e tomate picado, sal e limão.'] },
  'lan-ovos-tapioca': { tags: ['fit', 'quick'], time: 10, recipe: ['Mexa os ovos com azeite e sal.', 'Faça uma tapioca fina e recheie.'] },
  'lan-pao-queijo-cafe': { tags: ['br', 'quick'], time: 15, recipe: ['Asse os pães de queijo congelados (15 min na airfryer ou forno).', 'Café e iogurte ao lado.'] },

  // Ceia
  'ceia-iogurte-chia': { tags: ['quick', 'nocook', 'light', 'lowcarb'], time: 2, recipe: ['Iogurte grego com chia e morango.'] },
  'ceia-ovos': { tags: ['quick', 'light', 'lowcarb'], time: 8, recipe: ['Bata os ovos com sal e orégano, cozinhe em frigideira com azeite.', 'Tomate picado por cima.'] },
  'ceia-leite-aveia': { tags: ['quick', 'sweet'], time: 5, recipe: ['Aqueça o leite, junte a aveia e canela, mexa 2–3 min.'] },
  'ceia-cottage': { tags: ['quick', 'nocook', 'light', 'lowcarb'], time: 2, recipe: ['Cottage com castanhas picadas e uma pitada de sal ou canela.'] },
  'ceia-frango': { tags: ['light', 'lowcarb', 'batch'], time: 5, recipe: ['Frango desfiado pronto sobre folhas e tomate, fio de azeite e limão.'] },
  'ceia-tofu': { tags: ['light', 'lowcarb', 'quick'], time: 10, recipe: ['Corte o tofu em fatias, grelhe com shoyu e finalize com gergelim.'] },

  // Almoço / jantar
  'pf-frango-arroz-feijao': { tags: ['br', 'fit', 'batch'], time: 25, recipe: ['Tempere o frango com alho, limão, sal e páprica; grelhe 5 min de cada lado.', 'Arroz e feijão: faça em quantidade e congele em porções.', 'Salada de alface e tomate com azeite e limão.'] },
  'pf-carne-moida': { tags: ['br', 'batch'], time: 25, recipe: ['Refogue a carne moída com cebola, alho e tomate até secar a água.', 'Cozinhe a cenoura e a abobrinha no vapor ou refogue rapidamente.', 'Sirva com arroz integral e feijão preto.'] },
  'pf-batatadoce-frango': { tags: ['fit', 'fitonly', 'batch'], time: 30, recipe: ['Asse ou cozinhe a batata-doce em cubos (20 min).', 'Grelhe o frango temperado.', 'Brócolis no vapor 5 min, fio de azeite.'] },
  'pf-macarrao-bolonhesa': { tags: ['br', 'dense'], time: 25, recipe: ['Refogue a carne moída com alho e cebola, junte o molho de tomate e cozinhe 10 min.', 'Cozinhe o macarrão al dente e misture.', 'Salada verde ao lado.'] },
  'pf-peixe-pure': { tags: ['med', 'light'], time: 30, recipe: ['Tempere a merluza com limão, alho e ervas; asse a 200 °C por 15–20 min.', 'Cozinhe batata e cenoura e amasse com um fio de azeite.'] },
  'pf-tilapia': { tags: ['br', 'light'], time: 20, recipe: ['Grelhe a tilápia temperada com limão e sal (3–4 min de cada lado).', 'Vinagrete: tomate, cebola e pepino picados com vinagre, azeite e sal.', 'Arroz e feijão.'] },
  'pf-salmao': { tags: ['med'], time: 20, recipe: ['Grelhe o salmão com a pele para baixo 5 min, vire e faça mais 2–3 min.', 'Legumes no vapor. Arroz.'] },
  'pf-escondidinho': { tags: ['br', 'batch'], time: 40, recipe: ['Cozinhe a mandioca e amasse com a manteiga e sal.', 'Refogue a carne desfiada (músculo cozido na pressão) com tomate.', 'Monte em camadas e leve ao forno 10 min. Couve refogada ao lado.'] },
  'pf-strogonoff': { tags: ['br', 'batch'], time: 25, recipe: ['Doure o frango em cubos, junte molho de tomate e cozinhe 5 min.', 'Desligue o fogo e misture o creme de leite.', 'Arroz e salada.'] },
  'pf-lombo': { tags: ['br'], time: 50, recipe: ['Asse o lombo temperado (alho, limão, ervas) a 200 °C por ~40 min.', 'Mandioca cozida, feijão e couve refogada.'] },
  'pf-coxao': { tags: ['br', 'quick'], time: 15, recipe: ['Bife fino de coxão mole na frigideira bem quente, 2 min de cada lado.', 'Arroz, feijão e salada de tomate.'] },
  'pf-cuscuz-frango': { tags: ['br', 'batch'], time: 20, recipe: ['Cuscuz no vapor (10 min).', 'Frango desfiado refogado com tomate e cheiro-verde.', 'Salada ao lado.'] },
  'pf-omelete': { tags: ['br', 'quick'], time: 12, recipe: ['Omelete de ovos com queijo e orégano.', 'Arroz e feijão prontos + salada.'] },
  'pf-lentilha-ovo': { tags: ['med', 'batch'], time: 30, recipe: ['Cozinhe a lentilha (20 min, sem demolho) com louro e alho.', 'Abóbora assada ou cozida. Ovo cozido. Arroz.'] },
  'pf-tofu-arroz': { tags: ['br'], time: 20, recipe: ['Grelhe o tofu em fatias com shoyu e alho.', 'Arroz, feijão e brócolis no vapor.'] },
  'pf-graodebico': { tags: ['med', 'batch'], time: 25, recipe: ['Refogue cebola e alho, junte o grão-de-bico cozido e o molho de tomate, cozinhe 10 min.', 'Arroz integral e couve refogada.'] },
  'pf-pts-bolonhesa': { tags: ['batch'], time: 25, recipe: ['Hidrate a proteína de soja em água quente 10 min e esprema.', 'Refogue com alho, cebola e molho de tomate como uma bolonhesa.', 'Misture ao macarrão.'] },
  'pf-frango-mandioca': { tags: ['br'], time: 45, recipe: ['Asse as coxas temperadas (alho, limão, páprica) a 200 °C por 35–40 min.', 'Mandioca cozida e salada.'] },
  'pf-sardinha': { tags: ['br', 'med'], time: 30, recipe: ['Asse as sardinhas com limão, sal e azeite (20 min).', 'Arroz, feijão e beterraba cozida ralada.'] },
  'pf-jantar-leve': { tags: ['light', 'fit'], time: 25, recipe: ['Cozinhe a abóbora e amasse com sal e azeite.', 'Grelhe o frango. Salada verde à vontade.'] },
  'pf-jantar-sopa': { tags: ['br', 'light', 'batch'], time: 35, recipe: ['Na pressão: músculo em cubos selado com cebola e alho, água, batata, cenoura e chuchu (15 min após pegar pressão).', 'Abobrinha no fim. Congela muito bem.'] },

  'lan-shake-soja': { tags: ['quick', 'nocook', 'sweet'], time: 3, recipe: ['Bata a proteína de soja com a bebida de soja e as frutas vermelhas (podem ser congeladas).'] },
  'pf-tofu-legumes': { tags: ['batch', 'med'], time: 20, recipe: ['Doure o tofu em cubos no azeite, junte o grão-de-bico cozido.', 'Salteie brócolis e abobrinha na mesma frigideira com shoyu e alho.', 'Sirva com arroz integral.'] },

  // Low carb
  'lc-omelete-abacate': { tags: ['lowcarb', 'quick'], time: 10, recipe: ['Omelete com queijo e tomate.', 'Abacate fatiado com sal e limão ao lado.'] },
  'lc-ovos-presunto': { tags: ['lowcarb', 'quick'], time: 8, recipe: ['Mexa os ovos com presunto picado; desligue e junte o queijo minas em cubos.'] },
  'lc-iogurte-castanhas': { tags: ['lowcarb', 'quick', 'nocook'], time: 2, recipe: ['Iogurte grego com castanhas picadas, morango e chia.'] },
  'lc-frango-legumes': { tags: ['lowcarb', 'fit', 'light'], time: 20, recipe: ['Grelhe o frango em tiras.', 'Na mesma frigideira, salteie brócolis, abobrinha e couve-flor no azeite com alho por 5 min.'] },
  'lc-carne-abobora': { tags: ['lowcarb', 'br'], time: 30, recipe: ['Asse a abóbora em cubos com azeite e alecrim (25 min).', 'Grelhe o patinho. Couve refogada no alho.'] },
  'lc-salada-atum': { tags: ['lowcarb', 'quick', 'nocook', 'light'], time: 8, recipe: ['Monte folhas, tomate e pepino.', 'Cubra com atum escorrido, ovo cozido e abacate em cubos. Limão, sal e azeite.'] },
  'lc-salmao-legumes': { tags: ['lowcarb', 'med'], time: 20, recipe: ['Grelhe o salmão. Brócolis e abobrinha no vapor ou salteados no azeite.'] },
  'lc-omelete-espinafre': { tags: ['lowcarb', 'quick', 'light'], time: 12, recipe: ['Refogue o espinafre com alho, junte os ovos batidos e o queijo; tampe até firmar.', 'Salada ao lado.'] },
  'lc-frango-pure-couveflor': { tags: ['lowcarb', 'batch'], time: 25, recipe: ['Cozinhe a couve-flor até ficar macia e amasse com a manteiga e sal.', 'Frango desfiado no molho de tomate.'] },
  'lc-ovos-abacate': { tags: ['lowcarb', 'quick'], time: 10, recipe: ['Ovos cozidos com abacate, sal, pimenta e limão.'] },
  'lc-queijo-castanha': { tags: ['lowcarb', 'quick', 'nocook'], time: 2, recipe: ['Queijo minas em cubos, castanhas e tomate-cereja num pote.'] },

  // Mediterrânea
  'med-peixe-grao': { tags: ['med', 'light'], time: 25, recipe: ['Asse a merluza com limão e ervas.', 'Misture grão-de-bico cozido, tomate, pepino, cebola roxa, salsinha, azeite e limão.'] },
  'med-frango-legumes-integral': { tags: ['med', 'batch'], time: 35, recipe: ['Asse berinjela e abobrinha em cubos com azeite e orégano (25 min) junto com o frango temperado.', 'Arroz integral.'] },
  'med-lentilha-tabule': { tags: ['med', 'batch'], time: 25, recipe: ['Lentilha cozida temperada com azeite, limão e cominho.', 'Tabule: trigo hidratado com tomate, pepino, hortelã e limão. Ovo cozido ao lado.'] },
  'med-iogurte-mel-nozes': { tags: ['med', 'quick', 'nocook', 'sweet'], time: 2, recipe: ['Iogurte natural com nozes picadas e um fio de mel.'] },
  'med-pao-tomate-ovo': { tags: ['med', 'quick'], time: 8, recipe: ['Torre o pão, esfregue tomate maduro e regue com azeite.', 'Ovo cozido ou mexido e queijo branco por cima.'] },

  // Práticas
  'rap-overnight': { tags: ['quick', 'nocook', 'sweet', 'batch'], time: 3, recipe: ['À noite, misture num pote iogurte, aveia e chia.', 'De manhã, junte a banana em rodelas e coma gelado.'] },
  'rap-sanduiche-atum': { tags: ['quick', 'nocook'], time: 5, recipe: ['Atum escorrido com requeijão, sal e limão.', 'Monte no pão integral com tomate e alface.'] },
  'rap-misto-quente-frango': { tags: ['br', 'quick'], time: 8, recipe: ['Recheie o pão com frango desfiado e mussarela; doure na sanduicheira ou frigideira.', 'Salada de alface e tomate ao lado.'] },
  'rap-macarrao-atum': { tags: ['quick', 'med'], time: 15, recipe: ['Cozinhe o macarrão.', 'Aqueça o molho de tomate com alho, junte o atum escorrido e misture ao macarrão. Azeite por cima.'] },
  'rap-ovos-arroz': { tags: ['br', 'quick'], time: 10, recipe: ['Esquente arroz e feijão prontos (congelados em porções).', 'Mexa os ovos. Salada rápida de alface e tomate.'] },

  // Ganho de massa
  'gm-vitamina-hiper': { tags: ['dense', 'quick', 'nocook', 'sweet', 'fit'], time: 3, recipe: ['Bata tudo no liquidificador com gelo. Fácil de tomar mesmo sem fome.'] },
  'gm-granola-iogurte': { tags: ['dense', 'quick', 'nocook', 'sweet'], time: 2, recipe: ['Iogurte com granola, banana e mel.'] },
  'gm-macarrao-frango': { tags: ['dense', 'br', 'batch'], time: 25, recipe: ['Doure o frango em cubos, junte o molho de tomate.', 'Misture ao macarrão cozido e finalize com parmesão e azeite.'] },
};

// Alimentos mais caros (para o modo "econômico").
export const PRICEY_FOODS = new Set([317, 9003, 9014, 589, 588, 597, 587, 9006, 9010, 9009, 163, 464]);
