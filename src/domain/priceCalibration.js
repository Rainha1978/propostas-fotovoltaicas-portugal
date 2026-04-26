export const PRICE_DATABASE = {
  source: "Base de precos definida por regras de negocio. Sem inventar precos: valores em falta devem ser marcados como a confirmar ou visita tecnica.",
  vat: {
    rate: 0.23
  },
  panels: {
    standard460w: {
      label: "Painel standard 460W",
      powerW: 460,
      unitPrice: 72,
      useWhen: "Regra geral para telha lusa, estrutura triangular, terreo ou instalacoes sem condicao simples para painel grande."
    },
    large595w: {
      label: "Painel grande 595W",
      powerW: 595,
      unitPrice: 93,
      useWhen: "Apenas em telhado sanduiche com instalacao simples/res do chao."
    }
  },
  inverters: {
    manualPriceRule: "Usar preco_manual quando existir; caso contrario usar preco_tabela_goodwe.",
    goodwe: [
      { brand: "GoodWe", model: "GoodWe XS 3kW", type: "ongrid", phase: "monofasico", powerKw: 3, limitKwp: 3, tablePrice: 505, manualPrice: null, useManualPrice: false },
      { brand: "GoodWe", model: "GoodWe DNS 3.6kW", type: "ongrid", phase: "monofasico", powerKw: 3.6, limitKwp: 4, tablePrice: 590, manualPrice: null, useManualPrice: false },
      { brand: "GoodWe", model: "GoodWe DNS 5kW", type: "ongrid", phase: "monofasico", powerKw: 5, limitKwp: 99, tablePrice: 735, manualPrice: null, useManualPrice: false },
      { brand: "GoodWe", model: "GW3600-ES-20-G2", type: "hibrido", phase: "monofasico", powerKw: 3.6, limitKwp: 3.6, tablePrice: 1271.88, manualPrice: null, useManualPrice: false },
      { brand: "GoodWe", model: "GW5000-ES-20-G2", type: "hibrido", phase: "monofasico", powerKw: 5, limitKwp: 5, tablePrice: 1349.03, manualPrice: null, useManualPrice: false },
      { brand: "GoodWe", model: "GW6000-ES-20-G2", type: "hibrido", phase: "monofasico", powerKw: 6, limitKwp: 6, tablePrice: 1373.28, manualPrice: null, useManualPrice: false },
      { brand: "GoodWe", model: "GW8000-ES-C10", type: "hibrido", phase: "monofasico", powerKw: 8, limitKwp: 8, tablePrice: 1710.54, manualPrice: null, useManualPrice: false },
      { brand: "GoodWe", model: "GW10K-ES-C10", type: "hibrido", phase: "monofasico", powerKw: 10, limitKwp: 10, tablePrice: 1886.88, manualPrice: null, useManualPrice: false },
      { brand: "GoodWe", model: "GW12K-ES-C10", type: "hibrido", phase: "monofasico", powerKw: 12, limitKwp: 12, tablePrice: 2054.41, manualPrice: null, useManualPrice: false },
      { brand: "GoodWe", model: "GW4000-SDT-30", type: "ongrid", phase: "trifasico", powerKw: 4, limitKwp: 4, tablePrice: 773.71, manualPrice: null, useManualPrice: false },
      { brand: "GoodWe", model: "GW10K-SDT-30", type: "ongrid", phase: "trifasico", powerKw: 10, limitKwp: 10, tablePrice: 1155.05, manualPrice: null, useManualPrice: false },
      { brand: "GoodWe", model: "GW15K-SDT-30", type: "ongrid", phase: "trifasico", powerKw: 15, limitKwp: 15, tablePrice: 1236.61, manualPrice: null, useManualPrice: false },
      { brand: "GoodWe", model: "GW20K-SDT-30", type: "ongrid", phase: "trifasico", powerKw: 20, limitKwp: 20, tablePrice: 1309.35, manualPrice: null, useManualPrice: false },
      { brand: "GoodWe", model: "GW30K-SDT-30", type: "ongrid", phase: "trifasico", powerKw: 30, limitKwp: 30, tablePrice: 1637.8, manualPrice: null, useManualPrice: false },
      { brand: "GoodWe", model: "GW5K-ET", type: "hibrido", phase: "trifasico", powerKw: 5, limitKwp: 5, tablePrice: 2188.43, manualPrice: null, useManualPrice: false },
      { brand: "GoodWe", model: "GW8K-ET", type: "hibrido", phase: "trifasico", powerKw: 8, limitKwp: 8, tablePrice: 2360.8, manualPrice: null, useManualPrice: false },
      { brand: "GoodWe", model: "GW10K-ET", type: "hibrido", phase: "trifasico", powerKw: 10, limitKwp: 10, tablePrice: 2107.31, manualPrice: null, useManualPrice: false },
      { brand: "GoodWe", model: "GW15K-ET", type: "hibrido", phase: "trifasico", powerKw: 15, limitKwp: 15, tablePrice: 3678.71, manualPrice: null, useManualPrice: false },
      { brand: "GoodWe", model: "GW20K-ET", type: "hibrido", phase: "trifasico", powerKw: 20, limitKwp: 20, tablePrice: 3855.32, manualPrice: null, useManualPrice: false },
      { brand: "GoodWe", model: "GW25K-ET", type: "hibrido", phase: "trifasico", powerKw: 25, limitKwp: 25, tablePrice: 3985.38, manualPrice: null, useManualPrice: false }
    ],
    deye: [
      { brand: "DEYE", model: "DEYE trifasico hibrido", type: "hibrido", phase: "trifasico", powerKw: null, limitKwp: 99, tablePrice: 1800, manualPrice: null, useManualPrice: false }
    ]
  },
  batteries: {
    goodweLynxUG3: {
      brand: "GoodWe",
      model: "Lynx U G3 / LX U5.0-30",
      type: "LV",
      capacityPerUnitKwh: 5.12,
      unitPrice: 1320,
      positioning: "premium GoodWe",
      use: "monofasico premium",
      typicalCapacitiesKwh: [5.12, 10.24, 15.36]
    },
    gslLv16: {
      brand: "GSL",
      model: "GSL 16kWh",
      type: "LV",
      capacityPerUnitKwh: 16,
      unitPrice: 2600,
      positioning: "economico, grande capacidade",
      maxParallelUnits: 6,
      typicalCapacitiesKwh: [16, 32, 48, 64, 80, 96]
    },
    goodweHvLynxD: {
      brand: "GoodWe",
      model: "Lynx D HV",
      type: "HV modular",
      capacityPerModuleKwh: 5,
      modulePrice: 1475,
      basePrice: 156.83,
      bmsPrice: 0,
      minimumRecommendedModules: 2,
      positioning: "premium GoodWe",
      notes: ["Nao existe BMS separado.", "Nunca recomendar 1 modulo isolado."]
    },
    gslHv: {
      brand: "GSL",
      model: "GSL HV",
      type: "HV modular",
      use: "DEYE trifasico",
      baseAndBmsPrice: 600,
      capacityPerModuleKwh: 5,
      modulePrice: 625,
      minCapacityKwh: 10,
      maxCapacityKwh: 60
    },
    bydHvs: {
      brand: "BYD",
      model: "HVS",
      type: "HV modular",
      capacityPerModuleKwh: 2.55,
      modulePrice: 1000,
      baseAndBcuPrice: 885.26,
      positioning: "premium"
    },
    bydHvm: {
      brand: "BYD",
      model: "HVM",
      type: "HV modular",
      capacityPerModuleKwh: 2.76,
      modulePrice: 1100,
      baseAndBcuPrice: 885.26,
      positioning: "premium alta capacidade"
    },
    pylontechForce: {
      brand: "Pylontech",
      models: ["Force L", "Force H"],
      baseAndBmsPrice: 700,
      modulePrice: 737.5,
      disabledModels: ["US2000", "US3000", "US5000"]
    },
    dynessTower: {
      brand: "Dyness",
      model: "Tower",
      baseAndBmsPrice: 700,
      modulePrice: 737.5,
      disabledModels: ["Powerbox", "DL5.0"]
    },
    disabledModels: ["BYD LVL 15.4", "BYD LVS", "Pylontech US2000", "Pylontech US3000", "Pylontech US5000", "Dyness Powerbox", "Dyness DL5.0"]
  },
  structures: {
    coplanarPerTwoPanels: 70,
    triangularPerTwoPanels: 105,
    groundMount: {
      status: "visita_tecnica",
      note: "Instalacao em terreo deve ficar sujeita a visita tecnica."
    }
  },
  labor: {
    byPanelCount: [
      { maxPanels: 4, price: 360 },
      { maxPanels: 6, price: 400 },
      { maxPanels: 8, price: 440 },
      { maxPanels: 10, price: 480 },
      { maxPanels: 12, price: 520 }
    ],
    aboveTwelve: {
      basePrice: 520,
      extraPerTwoPanels: 40
    },
    hybridLvExtraPerBattery: 100,
    hybridHvExtraPerSystem: 100,
    difficultTileExtraPerTwoPanels: 10,
    sandwichSimpleExtra: 0
  },
  electrical: {
    monofasico: {
      baseProtections: 150,
      hybridProtectionsExtra: 75,
      backupManualExtra: 55,
      backupAutomatico: "visita_tecnica"
    },
    trifasico: {
      baseProtections: 225,
      hybridProtectionsExtra: 135,
      backupManualExtra: 150,
      backupAutomatico: "visita_tecnica"
    },
    cables: {
      dcPerMeter: 3.3,
      acMonoPerMeter: 3,
      acTriPerMeter: 6
    },
    connectorsPerString: 2.6,
    strings: [
      { maxPanels: 8, strings: 1 },
      { maxPanels: 16, strings: 2 },
      { maxPanels: 24, strings: 3 },
      { maxPanels: Infinity, strings: null, status: "analise_tecnica" }
    ]
  },
  extras: {
    realTimeMeter: 560,
    realTimeMeterRule: "Adicionar se inversor > 4kW.",
    evCharger: 550,
    evProtection: 135,
    travelPerKmFromMaceira: 1,
    backupAutomatico: "visita_tecnica"
  }
};

export const PRICE_CALIBRATION = {
  source: PRICE_DATABASE.source,
  vatRate: PRICE_DATABASE.vat.rate,
  historicalVatRate: 0.06,
  panels: {
    smallWattUnitPrice: PRICE_DATABASE.panels.standard460w.unitPrice,
    largeWattUnitPrice: PRICE_DATABASE.panels.large595w.unitPrice
  },
  structure: {
    telhaLusaPerPair: PRICE_DATABASE.structures.coplanarPerTwoPanels,
    sanduichePerPair: PRICE_DATABASE.structures.coplanarPerTwoPanels,
    triangularPerPair: PRICE_DATABASE.structures.triangularPerTwoPanels,
    minimum: 0
  },
  labor: {
    technicalMinimumHours: 20,
    onGridByPanelCount: PRICE_DATABASE.labor.byPanelCount,
    extraPerTwoPanelsAboveTwelve: PRICE_DATABASE.labor.aboveTwelve.extraPerTwoPanels,
    hybridBatterySetup: PRICE_DATABASE.labor.hybridLvExtraPerBattery,
    difficultTileExtraPerTwoPanels: PRICE_DATABASE.labor.difficultTileExtraPerTwoPanels
  },
  electrical: {
    baseProtections: PRICE_DATABASE.electrical.monofasico.baseProtections,
    hybridProtections: PRICE_DATABASE.electrical.monofasico.hybridProtectionsExtra,
    dcCablePerMeterPerString: PRICE_DATABASE.electrical.cables.dcPerMeter,
    acCableMonoPerMeter: PRICE_DATABASE.electrical.cables.acMonoPerMeter,
    acCableTriPerMeter: PRICE_DATABASE.electrical.cables.acTriPerMeter,
    connectorsPerString: PRICE_DATABASE.electrical.connectorsPerString
  },
  extras: {
    installationPerKwp: 0,
    travelPerKm: PRICE_DATABASE.extras.travelPerKmFromMaceira,
    realTimeMeter: PRICE_DATABASE.extras.realTimeMeter
  },
  inverters: {
    monoOnGrid: PRICE_DATABASE.inverters.goodwe
      .filter((inverter) => inverter.phase === "monofasico" && inverter.type === "ongrid")
      .map((inverter) => ({
        limitKwp: inverter.limitKwp,
        powerKw: inverter.powerKw,
        price: inverter.useManualPrice && inverter.manualPrice != null ? inverter.manualPrice : inverter.tablePrice
      })),
    monoHybrid: PRICE_DATABASE.inverters.goodwe
      .filter((inverter) => inverter.phase === "monofasico" && inverter.type === "hibrido")
      .map((inverter) => ({
        limitKwp: inverter.limitKwp,
        powerKw: inverter.powerKw,
        price: inverter.useManualPrice && inverter.manualPrice != null ? inverter.manualPrice : inverter.tablePrice
      })),
    trifasicoMultiplier: 1.55,
    deyeHybridTrifasico: PRICE_DATABASE.inverters.deye[0].tablePrice
  },
  batteries: {
    lynxG3FiveKwh: PRICE_DATABASE.batteries.goodweLynxUG3.unitPrice,
    lynxDFiveKwhHv: PRICE_DATABASE.batteries.goodweHvLynxD.modulePrice + PRICE_DATABASE.batteries.goodweHvLynxD.basePrice,
    gslHvBase: PRICE_DATABASE.batteries.gslHv.baseAndBmsPrice,
    gslHvModule: PRICE_DATABASE.batteries.gslHv.modulePrice,
    largeLowVoltage16Kwh: PRICE_DATABASE.batteries.gslLv16.unitPrice
  },
  benchmarksHistoricalGrossPerKwp: {
    onGridMedian: 713,
    hybridMedian: 1226
  },
  benchmarksGrossPerKwp: {
    onGridMedian: 827,
    hybridMedian: 1423
  },
  savings: {
    hybridSelfConsumptionRate: 0.85
  }
};
