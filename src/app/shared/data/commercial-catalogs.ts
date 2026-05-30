import {CommercialCatalog} from '@shared/models/commercial-catalog';

export const COMMERCIAL_CATALOGS: CommercialCatalog[] = [
  {
    id: 'sinotruk-howo-24m',
    i18nKey: 'commercialCatalog.catalogs.sinotruk24m',
    title: 'Sinotruk HOWO 24m3',
    vehicleName: 'Sinotruk HOWO',
    vehicleModel: '24m3',
    audience: 'Estaleiros, fabricas de blocos e construcao civil',
    volume: '24m',
    volumeM3: 24,
    wheelbarrows: 122,
    equivalent4mTrucks: 6,
    equivalent7mTrucks: 3,
    heroImageUrl: '/catalogs/sinotruk-24m/areia-grossa-hero.png',
    vehicleImageUrl: '/catalogs/sinotruk-24m/areia-grossa-detail.png',
    productionImageUrl: '/catalogs/sinotruk-24m/yard-production.png',
    wheelbarrowImageUrl: '/catalogs/sinotruk-24m/wheelbarrow.svg',
    contactImageUrl: '/catalogs/sinotruk-24m/areia-vermelha-hero.png',
    heroLine: 'Solucoes para estaleiros, fabricas de blocos e construcao civil',
    promise: 'Uma unica viagem pode abastecer dias de producao.',
    materials: [
      {
        i18nKey: 'commercialCatalog.materials.coarseSand',
        materialName: 'Areia Grossa',
        title: 'Areia Grossa',
        subtitle: 'A base da construcao estrutural.',
        originNote: 'A areia grossa e um dos materiais mais importantes da construcao civil. A sua granulometria elevada ajuda a dar resistencia e estabilidade ao betao, sendo indicada para obras que exigem durabilidade.',
        imageTone: 'sand',
        imageUrl: '/catalogs/sinotruk-24m/areia-grossa-hero.png',
        secondaryImageUrl: '/catalogs/sinotruk-24m/areia-grossa-detail.png',
        fallbackPrice: 26000,
        applications: ['Producao de blocos', 'Producao de paves', 'Producao de lancis', 'Fabricacao de betao', 'Fundacoes', 'Vigas e pilares', 'Lajes'],
        benefits: ['Boa resistencia nas misturas', 'Abastecimento em grande volume', 'Menos interrupcoes no estaleiro']
      },
      {
        i18nKey: 'commercialCatalog.materials.stone34',
        materialName: 'Pedra 3/4',
        title: 'Pedra 3/4',
        subtitle: 'Resistencia para grandes obras.',
        originNote: 'A pedra 3/4 e um agregado graudo usado no betao estrutural. Contribui para resistencia mecanica, estabilidade e durabilidade em varias fases da obra.',
        imageTone: 'stone',
        imageUrl: '/catalogs/sinotruk-24m/pedra-34-hero.png',
        secondaryImageUrl: '/catalogs/sinotruk-24m/pedra-34-detail.png',
        fallbackPrice: 26000,
        applications: ['Producao de betao', 'Lajes', 'Fundacoes', 'Vigas', 'Pilares', 'Pisos industriais', 'Estruturas de grande porte'],
        benefits: ['Maior resistencia a compressao', 'Melhor desempenho estrutural', 'Maior durabilidade']
      },
      {
        i18nKey: 'commercialCatalog.materials.fineSand',
        materialName: 'Areia Fina',
        title: 'Areia Fina',
        subtitle: 'Qualidade no acabamento.',
        originNote: 'A areia fina, tambem conhecida como areia branca, possui granulometria reduzida e e ideal para rebocos, acabamentos e argamassas que exigem superficies mais lisas.',
        imageTone: 'sand',
        imageUrl: '/catalogs/sinotruk-24m/areia-fina-hero.png',
        fallbackPrice: 18000,
        applications: ['Reboco', 'Emboco', 'Assentamento de blocos', 'Assentamento de tijolos', 'Acabamentos finos', 'Rejuntes'],
        benefits: ['Melhor acabamento', 'Maior aderencia', 'Superficies mais uniformes']
      },
      {
        i18nKey: 'commercialCatalog.materials.redSand',
        materialName: 'Areia Vermelha',
        title: 'Areia Vermelha',
        subtitle: 'Solucao para aterros e nivelamentos.',
        originNote: 'A areia vermelha e usada em aterros, enchimentos, chao, estradas e regularizacao de terrenos. Ajuda a criar bases solidas para construcao e pavimentacao.',
        imageTone: 'red',
        imageUrl: '/catalogs/sinotruk-24m/areia-vermelha-hero.png',
        fallbackPrice: 13000,
        applications: ['Aterros', 'Chao', 'Estradas', 'Enchimentos', 'Nivelamento de terrenos', 'Preparacao de plataformas', 'Bases para construcao'],
        benefits: ['Boa compactacao', 'Custo acessivel', 'Rapida preparacao do terreno']
      },
      {
        i18nKey: 'commercialCatalog.materials.sarrisca',
        materialName: 'Pedra Sarrisca',
        title: 'Sarrisca',
        subtitle: 'Compactacao, lajes e estabilidade.',
        originNote: 'A sarrisca e um material granular versatil para compactacao, producao, bases e trabalhos de betao em zonas que precisam de estabilidade.',
        imageTone: 'stone',
        imageUrl: '/catalogs/sinotruk-24m/pedra-34-hero.png',
        fallbackPrice: 26000,
        applications: ['Compactacao', 'Lajes', 'Vigas', 'Preparacao de pisos', 'Producao de blocos', 'Producao de paves', 'Bases rodoviarias'],
        benefits: ['Excelente compactacao', 'Boa estabilidade estrutural', 'Boa drenagem']
      },
      {
        i18nKey: 'commercialCatalog.materials.rockfill',
        materialName: 'Pedra Enrocamento',
        title: 'Enrocamento',
        subtitle: 'Protecao, chao e betao de limpeza.',
        originNote: 'O enrocamento e composto por pedras maiores, usado em chao, betao de limpeza, protecao, drenagem e estabilizacao de areas que precisam de corpo.',
        imageTone: 'dark',
        imageUrl: '/catalogs/sinotruk-24m/pedra-34-detail.png',
        fallbackPrice: 26000,
        applications: ['Chao', 'Betao de limpeza', 'Muros de contencao', 'Protecao contra erosao', 'Drenagem', 'Estabilizacao de taludes', 'Obras rodoviarias'],
        benefits: ['Elevada resistencia', 'Longa durabilidade', 'Excelente capacidade de contencao']
      }
    ],
    production: [
      {
        title: 'Bloco 15',
        measure: '40cm x 20cm x 15cm',
        ratio: '1 saco de cimento + 5 carrinhos',
        output: 'Ate 920 blocos por carga de 24m3'
      },
      {
        title: 'Bloco 10',
        measure: '40cm x 20cm x 10cm',
        ratio: '1 saco de cimento + 5 carrinhos',
        output: 'Ate 1.104 blocos por carga de 24m3'
      }
    ]
  },
  {
    id: 'tata-signa-22m',
    i18nKey: 'commercialCatalog.catalogs.tata22m',
    title: 'Tata Signa 22m3',
    vehicleName: 'Tata Signa',
    vehicleModel: '22m3',
    audience: 'Estaleiros, fabricas de blocos e obras de medio e grande porte',
    volume: '22m',
    volumeM3: 22,
    wheelbarrows: 112,
    equivalent4mTrucks: 5,
    equivalent7mTrucks: 3,
    heroImageUrl: '/catalogs/tata-22m/truck-hero.png',
    vehicleImageUrl: '/catalogs/tata-22m/truck-site.png',
    productionImageUrl: '/catalogs/tata-22m/production-hero.png',
    wheelbarrowImageUrl: '/catalogs/tata-22m/wheelbarrow.svg',
    contactImageUrl: '/catalogs/tata-22m/red-sand-detail.png',
    heroLine: 'Entrega forte para estaleiros, obras e fabricas de blocos',
    promise: 'Uma carga equilibrada para abastecer a producao com rapidez e controlo de custo.',
    materials: [
      {
        i18nKey: 'commercialCatalog.materials.coarseSand',
        materialName: 'Areia Grossa',
        title: 'Areia Grossa',
        subtitle: 'A base da construcao estrutural.',
        originNote: 'A areia grossa e um dos materiais mais importantes da construcao civil. A sua granulometria elevada ajuda a dar resistencia e estabilidade ao betao, sendo indicada para obras que exigem durabilidade.',
        imageTone: 'sand',
        imageUrl: '/catalogs/tata-22m/coarse-sand-hero.png',
        secondaryImageUrl: '/catalogs/tata-22m/sand-detail.png',
        fallbackPrice: 26000,
        applications: ['Producao de blocos', 'Producao de paves', 'Producao de lancis', 'Fabricacao de betao', 'Fundacoes', 'Vigas e pilares', 'Lajes'],
        benefits: ['Boa resistencia nas misturas', 'Abastecimento em grande volume', 'Menos interrupcoes no estaleiro']
      },
      {
        i18nKey: 'commercialCatalog.materials.stone34',
        materialName: 'Pedra 3/4',
        title: 'Pedra 3/4',
        subtitle: 'Resistencia para grandes obras.',
        originNote: 'A pedra 3/4 e um agregado graudo usado no betao estrutural. Contribui para resistencia mecanica, estabilidade e durabilidade em varias fases da obra.',
        imageTone: 'stone',
        imageUrl: '/catalogs/tata-22m/stone-from-fine.png',
        secondaryImageUrl: '/catalogs/tata-22m/stone-detail.png',
        fallbackPrice: 26000,
        applications: ['Producao de betao', 'Lajes', 'Fundacoes', 'Vigas', 'Pilares', 'Pisos industriais', 'Estruturas de grande porte'],
        benefits: ['Maior resistencia a compressao', 'Melhor desempenho estrutural', 'Maior durabilidade']
      },
      {
        i18nKey: 'commercialCatalog.materials.fineSand',
        materialName: 'Areia Fina',
        title: 'Areia Fina',
        subtitle: 'Qualidade no acabamento.',
        originNote: 'A areia fina, tambem conhecida como areia branca, possui granulometria reduzida e e ideal para rebocos, acabamentos e argamassas que exigem superficies mais lisas.',
        imageTone: 'sand',
        imageUrl: '/catalogs/tata-22m/fine-sand-hero.png',
        fallbackPrice: 18000,
        applications: ['Reboco', 'Emboco', 'Assentamento de blocos', 'Assentamento de tijolos', 'Acabamentos finos', 'Rejuntes'],
        benefits: ['Melhor acabamento', 'Maior aderencia', 'Superficies mais uniformes']
      },
      {
        i18nKey: 'commercialCatalog.materials.redSand',
        materialName: 'Areia Vermelha',
        title: 'Areia Vermelha',
        subtitle: 'Solucao para aterros e nivelamentos.',
        originNote: 'A areia vermelha e usada em aterros, enchimentos, chao, estradas e regularizacao de terrenos. Ajuda a criar bases solidas para construcao e pavimentacao.',
        imageTone: 'red',
        imageUrl: '/catalogs/tata-22m/red-sand-hero.png',
        secondaryImageUrl: '/catalogs/tata-22m/red-sand-detail.png',
        fallbackPrice: 13000,
        applications: ['Aterros', 'Chao', 'Estradas', 'Enchimentos', 'Nivelamento de terrenos', 'Preparacao de plataformas', 'Bases para construcao'],
        benefits: ['Boa compactacao', 'Custo acessivel', 'Rapida preparacao do terreno']
      },
      {
        i18nKey: 'commercialCatalog.materials.sarrisca',
        materialName: 'Pedra Sarrisca',
        title: 'Sarrisca',
        subtitle: 'Compactacao, lajes e estabilidade.',
        originNote: 'A sarrisca e um material granular versatil para compactacao, producao, bases e trabalhos de betao em zonas que precisam de estabilidade.',
        imageTone: 'stone',
        imageUrl: '/catalogs/tata-22m/stone-detail.png',
        fallbackPrice: 26000,
        applications: ['Compactacao', 'Lajes', 'Vigas', 'Preparacao de pisos', 'Producao de blocos', 'Producao de paves', 'Bases rodoviarias'],
        benefits: ['Excelente compactacao', 'Boa estabilidade estrutural', 'Boa drenagem']
      },
      {
        i18nKey: 'commercialCatalog.materials.rockfill',
        materialName: 'Pedra Enrocamento',
        title: 'Enrocamento',
        subtitle: 'Protecao, chao e betao de limpeza.',
        originNote: 'O enrocamento e composto por pedras maiores, usado em chao, betao de limpeza, protecao, drenagem e estabilizacao de areas que precisam de corpo.',
        imageTone: 'dark',
        imageUrl: '/catalogs/tata-22m/stone-hero.png',
        fallbackPrice: 26000,
        applications: ['Chao', 'Betao de limpeza', 'Muros de contencao', 'Protecao contra erosao', 'Drenagem', 'Estabilizacao de taludes', 'Obras rodoviarias'],
        benefits: ['Elevada resistencia', 'Longa durabilidade', 'Excelente capacidade de contencao']
      }
    ],
    production: [
      {
        title: 'Bloco 15',
        measure: '40cm x 20cm x 15cm',
        ratio: '1 saco de cimento + 5 carrinhos',
        output: 'Ate 1.120 blocos por carga de 22m3'
      },
      {
        title: 'Bloco 10',
        measure: '40cm x 20cm x 10cm',
        ratio: '1 saco de cimento + 5 carrinhos',
        output: 'Ate 1.344 blocos por carga de 22m3'
      }
    ]
  }
];
