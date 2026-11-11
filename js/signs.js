// Panneaux dessinés en SVG (viewBox 100x100)
const SIGNS = (() => {
  const R = '#d0021b', B = '#0b57a4', K = '#111';
  const T = i => `<polygon points="50,10 94,88 6,88" fill="#fff" stroke="${R}" stroke-width="8" stroke-linejoin="round"/>${i}`;
  const C = i => `<circle cx="50" cy="50" r="42" fill="#fff" stroke="${R}" stroke-width="9"/>${i}`;
  const BC = i => `<circle cx="50" cy="50" r="46" fill="${B}" stroke="#fff" stroke-width="2"/>${i}`;
  const BS = i => `<rect x="5" y="5" width="90" height="90" rx="8" fill="${B}" stroke="#fff" stroke-width="2"/>${i}`;
  const txt = (t, y, s, f, x = 50) => `<text x="${x}" y="${y}" font-size="${s}" font-weight="700" font-family="Arial,sans-serif" text-anchor="middle" fill="${f}">${t}</text>`;
  const arrow = (x, y1, y2, col, w = 7) => { // flèche verticale de y1 vers y2
    const d = y2 < y1 ? -1 : 1;
    return `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2 - d * 8}" stroke="${col}" stroke-width="${w}"/><polygon points="${x - w * 1.4},${y2 - d * 12} ${x + w * 1.4},${y2 - d * 12} ${x},${y2}" fill="${col}"/>`;
  };
  const diamond = `<rect x="22" y="22" width="56" height="56" fill="#fff" stroke="${K}" stroke-width="1.5" transform="rotate(45 50 50)"/><rect x="31" y="31" width="38" height="38" fill="#ffd200" transform="rotate(45 50 50)"/>`;
  const car = (x, col) => `<rect x="${x}" y="46" width="22" height="13" rx="3" fill="${col}"/><rect x="${x + 4}" y="38" width="14" height="10" rx="3" fill="${col}"/>`;
  const road = `<path d="M38 82 L45 22 M62 82 L55 22" stroke="#fff" stroke-width="6" fill="none"/><rect x="18" y="34" width="64" height="7" fill="#fff"/>`;
  const town = `<rect x="4" y="28" width="92" height="44" rx="5" fill="#fff" stroke="${R}" stroke-width="5"/>${txt('VILLE', 59, 24, K)}`;
  const S = {
    stop: ['Arrêt obligatoire (STOP)', "Marquer l'arrêt absolu à la limite de la chaussée abordée et céder le passage, même si personne n'arrive.",
      `<polygon points="31,5 69,5 95,31 95,69 69,95 31,95 5,69 5,31" fill="${R}" stroke="#fff" stroke-width="3"/>${txt('STOP', 60, 27, '#fff')}`],
    cedez: ['Cédez le passage', "Céder le passage aux usagers de l'autre route ; l'arrêt n'est obligatoire que si nécessaire.",
      `<polygon points="6,12 94,12 50,90" fill="#fff" stroke="${R}" stroke-width="8" stroke-linejoin="round"/>`],
    sensinterdit: ['Sens interdit', 'Interdiction de s\'engager dans cette rue dans ce sens, pour tout véhicule.',
      `<circle cx="50" cy="50" r="46" fill="${R}"/><rect x="18" y="41" width="64" height="18" fill="#fff"/>`],
    interdit: ['Circulation interdite dans les deux sens', 'Aucun véhicule ne peut circuler sur cette voie, dans un sens comme dans l\'autre.', C('')],
    prio: ['Route à caractère prioritaire', 'Vous êtes prioritaire à toutes les intersections jusqu\'au panneau de fin.', diamond],
    finprio: ['Fin de route prioritaire', 'La route perd son caractère prioritaire : la priorité à droite peut de nouveau s\'appliquer.',
      diamond + `<line x1="24" y1="76" x2="76" y2="24" stroke="${K}" stroke-width="7"/>`],
    priodroite: ['Intersection avec priorité à droite', 'À la prochaine intersection, vous devez céder le passage aux véhicules venant de droite.',
      T(`<path d="M36 46 L64 76 M64 46 L36 76" stroke="${K}" stroke-width="7"/>`)],
    prioponct: ['Intersection où vous êtes prioritaire', 'Priorité ponctuelle : vous êtes prioritaire à la prochaine intersection seulement.',
      T(arrow(50, 80, 34, K, 9) + `<line x1="32" y1="62" x2="68" y2="62" stroke="${K}" stroke-width="5"/>`)],
    v50: ['Vitesse limitée à 50 km/h', 'Interdiction de dépasser la vitesse indiquée, à partir du panneau.', C(txt('50', 64, 38, K))],
    finlimit: ['Fin de limitation de vitesse à 50 km/h', 'La limitation précédente prend fin ; la vitesse réglementaire de la route s\'applique.',
      `<circle cx="50" cy="50" r="45" fill="#fff" stroke="${K}" stroke-width="2"/>${txt('50', 64, 38, '#999')}<line x1="22" y1="78" x2="78" y2="22" stroke="${K}" stroke-width="7"/>`],
    fintout: ['Fin de toutes les interdictions', 'Fin de toutes les interdictions précédemment signalées pour les véhicules en mouvement.',
      `<circle cx="50" cy="50" r="45" fill="#fff" stroke="${K}" stroke-width="2"/><line x1="22" y1="78" x2="78" y2="22" stroke="${K}" stroke-width="9"/>`],
    min30: ['Vitesse minimale obligatoire 30 km/h', 'Panneau d\'obligation (rond bleu) : vous devez rouler au moins à 30 km/h si les conditions le permettent.',
      BC(txt('30', 64, 40, '#fff'))],
    nodep: ['Interdiction de dépasser', 'Interdiction de dépasser tous les véhicules à moteur autres que les deux-roues sans side-car.',
      C(car(24, R) + car(54, K))],
    nopark: ['Stationnement interdit', 'Stationnement interdit du côté du panneau ; l\'arrêt reste autorisé.',
      `<circle cx="50" cy="50" r="42" fill="${B}" stroke="${R}" stroke-width="9"/><line x1="21" y1="21" x2="79" y2="79" stroke="${R}" stroke-width="9"/>`],
    nostop: ['Arrêt et stationnement interdits', 'Ni arrêt ni stationnement du côté du panneau.',
      `<circle cx="50" cy="50" r="42" fill="${B}" stroke="${R}" stroke-width="9"/><line x1="21" y1="21" x2="79" y2="79" stroke="${R}" stroke-width="9"/><line x1="79" y1="21" x2="21" y2="79" stroke="${R}" stroke-width="9"/>`],
    toutdroit: ['Direction obligatoire : tout droit', 'À la prochaine intersection, obligation d\'aller tout droit.', BC(arrow(50, 80, 18, '#fff', 10))],
    contourne: ['Contournement obligatoire par la droite', 'Vous devez contourner l\'obstacle (îlot, terre-plein) par la droite.',
      BC(`<g transform="rotate(135 50 50)">${arrow(50, 78, 20, '#fff', 10)}</g>`)],
    b15: ['Cédez le passage à la circulation en sens inverse', 'Passage étroit : vous devez laisser passer les véhicules venant d\'en face (votre flèche est rouge).',
      C(arrow(38, 26, 76, K, 8) + arrow(62, 76, 26, R, 6))],
    c18: ['Priorité par rapport à la circulation en sens inverse', 'Passage étroit : vous êtes prioritaire sur les véhicules venant d\'en face.',
      BS(arrow(38, 26, 76, R, 6) + arrow(62, 78, 22, '#fff', 9))],
    sensunique: ['Circulation à sens unique', 'Panneau d\'indication : la voie est à sens unique, aucun véhicule n\'arrive en face.', BS(arrow(50, 82, 16, '#fff', 11))],
    parking: ['Lieu aménagé pour le stationnement', 'Panneau d\'indication : parking.', BS(txt('P', 74, 68, '#fff'))],
    impasse: ['Impasse', 'Voie sans issue.', BS(`<rect x="43" y="34" width="14" height="52" fill="#fff"/><rect x="28" y="20" width="44" height="14" fill="${R}"/>`)],
    passagepieton: ['Passage pour piétons', 'Panneau d\'indication signalant un passage pour piétons.',
      BS(`<polygon points="50,14 88,84 12,84" fill="#fff"/><circle cx="50" cy="40" r="5" fill="${K}"/><path d="M50 46 L50 64 M50 64 L42 78 M50 64 L58 78 M40 54 L60 54" stroke="${K}" stroke-width="4" fill="none"/>`)],
    autoroute: ['Début d\'autoroute', 'Les règles de l\'autoroute s\'appliquent : accès interdit aux piétons, cyclistes, cyclomoteurs, tracteurs…', BS(road)],
    finautoroute: ['Fin d\'autoroute', 'Fin de la section autoroutière : adaptez votre vitesse à la nouvelle limitation.',
      BS(road + `<line x1="12" y1="88" x2="88" y2="12" stroke="${R}" stroke-width="7"/>`)],
    agglo: ['Entrée d\'agglomération', 'Vitesse limitée à 50 km/h (sauf indication contraire) et usage de l\'avertisseur sonore interdit sauf danger immédiat.', town],
    finagglo: ['Sortie d\'agglomération', 'Fin des règles propres à l\'agglomération : la limitation hors agglomération s\'applique.',
      town + `<line x1="8" y1="70" x2="92" y2="30" stroke="${R}" stroke-width="6"/>`],
    virage: ['Virage à droite', 'Danger : virage à droite. Ralentissez avant le virage.',
      T(`<path d="M44 78 L44 62 Q44 48 60 44" stroke="${K}" stroke-width="7" fill="none"/><polygon points="58,34 72,42 58,52" fill="${K}"/>`)],
    cassis: ['Cassis ou dos-d\'âne', 'Danger : déformation de la chaussée. Ralentissez.',
      T(`<path d="M24 74 L38 74 Q44 58 50 74 Q56 58 62 74 L76 74 Z" fill="${K}"/>`)],
    retreci: ['Chaussée rétrécie', 'Danger : la chaussée se rétrécit, le croisement peut devenir difficile.',
      T(`<path d="M38 80 L38 64 L45 52 L45 38 M62 80 L62 64 L55 52 L55 38" stroke="${K}" stroke-width="6" fill="none"/>`)],
    doublesens: ['Circulation dans les deux sens', 'Danger : fin du sens unique, des véhicules peuvent arriver en face.',
      T(arrow(41, 44, 80, K, 6) + arrow(59, 80, 44, K, 6))],
    feux: ['Annonce de feux tricolores', 'Danger : feux tricolores à venir. Préparez-vous à vous arrêter.',
      T(`<circle cx="50" cy="42" r="6.5" fill="${R}"/><circle cx="50" cy="58" r="6.5" fill="#f5a400"/><circle cx="50" cy="74" r="6.5" fill="#1a9e3f"/>`)],
    danger: ['Autres dangers', 'Danger non précisé par un symbole : la nature du danger peut être indiquée par un panonceau.',
      T(`<rect x="46" y="38" width="8" height="26" rx="3" fill="${K}"/><circle cx="50" cy="74" r="5" fill="${K}"/>`)],
    descente: ['Descente dangereuse', 'Danger : forte pente. Utilisez le frein moteur en rétrogradant.', T(txt('10%', 76, 22, K))]
  };
  const out = {};
  for (const k in S) out[k] = { n: S[k][0], d: S[k][1], svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Panneau">${S[k][2]}</svg>` };
  return out;
})();
