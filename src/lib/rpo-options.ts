export const airwayOptions = [
    { value: 'Pérveas e livres', description: 'Vias aéreas limpas e desimpedidas; paciente respira ou fala sem obstrução.' },
    { value: 'Obstruídas por secreção/vômito', description: 'Realizada a limpeza e aspiração das vias aéreas no local.' },
    { value: 'Obstruídas por queda da língua', description: 'Realizada manobra manual de abertura das vias aéreas.' },
    { value: 'Obstrução total por corpo estranho', description: 'O corpo estranho foi removido com sucesso no local.' }
];

export const breathingOptions = [
    { value: 'Eupneico e estável', description: 'Respiração normal, sem esforço e pele de cor normal.' },
    { value: 'Taquipneico sem esforço', description: 'Respiração rápida, mas sem sinais de cansaço ou uso de músculos do pescoço/peito.' },
    { value: 'Dispneia com esforço', description: 'Respiração visivelmente difícil, rápida, com uso de musculatura acessória (esforço respiratório).' },
    { value: 'Respiração superficial/fraca', description: 'Expansão do peito muito reduzida, movimentos lentos ou ineficazes.' },
    { value: 'Apneia / Parada', description: 'Paciente não respira ou apresenta apenas gasping (suspiros agonizantes).' }
];

export const circulationOptions = [
    { value: 'Pulso presente, cheio e rítmico', description: 'Boa perfusão, pele de coloração normal e estável.' },
    { value: 'Pulso rápido (taquicardia) e pele pálida/fria', description: 'Sinais de alerta ou princípio de choque; monitorando atentamente.' },
    { value: 'Pulso fraco / filiforme', description: 'Circulação comprometida, perfusão periférica lentificada, Paciente aquecido, posicionado em decúbito dorsal.' },
    { value: 'Ausência de pulso / PCR', description: 'Parada cardiorrespiratória confirmada; iniciado protocolo de RCP.' }
];

export const neuroOptions = [
    { value: 'Alerta e orientado', description: 'Vítima responde prontamente, consciente e orientada no tempo e espaço.' },
    { value: 'Responde a estímulo verbal', description: 'Vítima sonolenta ou confusa, mas reage ao ser chamada pelo nome.' },
    { value: 'Responde apenas a estímulo doloroso', description: 'Vítima não responde à voz, reagindo apenas com movimento ou careta ao estímulo de dor.' },
    { value: 'Inconsciente (sem resposta)', description: 'Vítima irresponsiva a qualquer estímulo (quadro crítico).' }
];

export const exposureOptions = [
    { value: 'Exposto e protegido', description: 'Paciente totalmente examinado, sem lesões ocultas graves encontradas e aquecido (com manta/cobertor).' },
    { value: 'Lesões em membros', description: 'Presença de fraturas, deformidades ou ferimentos visíveis em braços/pernas; mantido aquecido.' },
    { value: 'Trauma em dorso/costas', description: 'Lesões ou dor na região posterior do corpo encontradas após rolamento em bloco.' },
    { value: 'Risco de Hipotermia', description: 'Paciente com a pele muito fria ou tremores; realizado o aquecimento imediato com mantas.' }
];

export const hemorrhageOptions = [
    { value: "Sem hemorragias graves aparentes", description: "Nenhuma hemorragia externa significativa foi identificada." },
    { value: "Contido com curativo compressivo", description: "Hemorragia controlada através da aplicação de curativo com pressão direta." },
    { value: "Contido com torniquete", description: "Uso de torniquete para controlar hemorragia grave em membro." },
];