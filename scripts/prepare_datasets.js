const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const PROV_TO_ASL = {
  BA: 'ASL BARI',
  BT: 'ASL BT',
  BR: 'ASL BRINDISI',
  FG: 'ASL FOGGIA',
  LE: 'ASL LECCE',
  TA: 'ASL TARANTO'
};

// Mappatura specifica distretti socio-sanitari noti per i comuni pugliesi principali
const COMUNE_DISTRICTS = {
  // BA
  'CORATO': { dss: 'Distretto 1 - Corato/Ruvo/Terlizzi', code: 'DSS-BA-01' },
  'RUVO DI PUGLIA': { dss: 'Distretto 1 - Corato/Ruvo/Terlizzi', code: 'DSS-BA-01' },
  'TERLIZZI': { dss: 'Distretto 1 - Corato/Ruvo/Terlizzi', code: 'DSS-BA-01' },
  'MOLFETTA': { dss: 'Distretto 2 - Molfetta/Giovinazzo', code: 'DSS-BA-02' },
  'GIOVINAZZO': { dss: 'Distretto 2 - Molfetta/Giovinazzo', code: 'DSS-BA-02' },
  'BITONTO': { dss: 'Distretto 3 - Bitonto/Palo del Colle', code: 'DSS-BA-03' },
  'PALO DEL COLLE': { dss: 'Distretto 3 - Bitonto/Palo del Colle', code: 'DSS-BA-03' },
  'MODUGNO': { dss: 'Distretto 4 - Modugno/Bitetto/Bitritto', code: 'DSS-BA-04' },
  'BITETTO': { dss: 'Distretto 4 - Modugno/Bitetto/Bitritto', code: 'DSS-BA-04' },
  'BITRITTO': { dss: 'Distretto 4 - Modugno/Bitetto/Bitritto', code: 'DSS-BA-04' },
  'BARI': { dss: 'Distretto Unico di Bari', code: 'DSS-BA-05' },
  'TRIGGIANO': { dss: 'Distretto 6 - Triggiano/Capurso/Valenzano', code: 'DSS-BA-06' },
  'CAPURSO': { dss: 'Distretto 6 - Triggiano/Capurso/Valenzano', code: 'DSS-BA-06' },
  'CELLAMARE': { dss: 'Distretto 6 - Triggiano/Capurso/Valenzano', code: 'DSS-BA-06' },
  'VALENZANO': { dss: 'Distretto 6 - Triggiano/Capurso/Valenzano', code: 'DSS-BA-06' },
  'NOICATTARO': { dss: 'Distretto 7 - Noicattaro/Rutigliano/Mola', code: 'DSS-BA-07' },
  'RUTIGLIANO': { dss: 'Distretto 7 - Noicattaro/Rutigliano/Mola', code: 'DSS-BA-07' },
  'MOLA DI BARI': { dss: 'Distretto 7 - Noicattaro/Rutigliano/Mola', code: 'DSS-BA-07' },
  'CONVERSANO': { dss: 'Distretto 8 - Conversano/Monopoli/Polignano', code: 'DSS-BA-08' },
  'POLIGNANO A MARE': { dss: 'Distretto 8 - Conversano/Monopoli/Polignano', code: 'DSS-BA-08' },
  'MONOPOLI': { dss: 'Distretto 8 - Conversano/Monopoli/Polignano', code: 'DSS-BA-08' },
  'CASTELLANA GROTTE': { dss: 'Distretto 9 - Castellana/Putignano/Noci/Locorotondo', code: 'DSS-BA-09' },
  'LOCOROTONDO': { dss: 'Distretto 9 - Castellana/Putignano/Noci/Locorotondo', code: 'DSS-BA-09' },
  'NOCI': { dss: 'Distretto 9 - Castellana/Putignano/Noci/Locorotondo', code: 'DSS-BA-09' },
  'PUTIGNANO': { dss: 'Distretto 9 - Castellana/Putignano/Noci/Locorotondo', code: 'DSS-BA-09' },
  'ALBEROBELLO': { dss: 'Distretto 9 - Castellana/Putignano/Noci/Locorotondo', code: 'DSS-BA-09' },
  'GIOIA DEL COLLE': { dss: 'Distretto 10 - Gioia del Colle/Casamassima/Turi', code: 'DSS-BA-10' },
  'CASAMASSIMA': { dss: 'Distretto 10 - Gioia del Colle/Casamassima/Turi', code: 'DSS-BA-10' },
  'SAMMICHELE DI BARI': { dss: 'Distretto 10 - Gioia del Colle/Casamassima/Turi', code: 'DSS-BA-10' },
  'TURI': { dss: 'Distretto 10 - Gioia del Colle/Casamassima/Turi', code: 'DSS-BA-10' },
  'ACQUAVIVA DELLE FONTI': { dss: 'Distretto 11 - Acquaviva/Cassano/Sannicandro', code: 'DSS-BA-11' },
  'CASSANO DELLE MURGE': { dss: 'Distretto 11 - Acquaviva/Cassano/Sannicandro', code: 'DSS-BA-11' },
  'SANNICANDRO DI BARI': { dss: 'Distretto 11 - Acquaviva/Cassano/Sannicandro', code: 'DSS-BA-11' },
  'ALTAMURA': { dss: 'Distretto 12 - Altamura/Gravina/Santeramo', code: 'DSS-BA-12' },
  'GRAVINA IN PUGLIA': { dss: 'Distretto 12 - Altamura/Gravina/Santeramo', code: 'DSS-BA-12' },
  'POGGIORSINI': { dss: 'Distretto 12 - Altamura/Gravina/Santeramo', code: 'DSS-BA-12' },
  'SANTERAMO IN COLLE': { dss: 'Distretto 12 - Altamura/Gravina/Santeramo', code: 'DSS-BA-12' },
  'GRUMO APPULA': { dss: 'Distretto 13 - Grumo Appula/Binetto/Toritto', code: 'DSS-BA-13' },
  'BINETTO': { dss: 'Distretto 13 - Grumo Appula/Binetto/Toritto', code: 'DSS-BA-13' },
  'TORITTO': { dss: 'Distretto 13 - Grumo Appula/Binetto/Toritto', code: 'DSS-BA-13' },
  'ADELFIA': { dss: 'Distretto 6 - Triggiano/Capurso/Valenzano', code: 'DSS-BA-06' },

  // BT
  'MARGHERITA DI SAVOIA': { dss: 'Distretto 1 - Margherita/S.Ferdinando/Trinitapoli', code: 'DSS-BT-01' },
  'SAN FERDINANDO DI PUGLIA': { dss: 'Distretto 1 - Margherita/S.Ferdinando/Trinitapoli', code: 'DSS-BT-01' },
  'TRINITAPOLI': { dss: 'Distretto 1 - Margherita/S.Ferdinando/Trinitapoli', code: 'DSS-BT-01' },
  'ANDRIA': { dss: 'Distretto 2 - Andria/Minervino/Spinazzola', code: 'DSS-BT-02' },
  'MINERVINO MURGE': { dss: 'Distretto 2 - Andria/Minervino/Spinazzola', code: 'DSS-BT-02' },
  'SPINAZZOLA': { dss: 'Distretto 2 - Andria/Minervino/Spinazzola', code: 'DSS-BT-02' },
  'CANOSA DI PUGLIA': { dss: 'Distretto 3 - Canosa di Puglia', code: 'DSS-BT-03' },
  'BARLETTA': { dss: 'Distretto 4 - Barletta', code: 'DSS-BT-04' },
  'TRANI': { dss: 'Distretto 5 - Trani/Bisceglie', code: 'DSS-BT-05' },
  'BISCEGLIE': { dss: 'Distretto 5 - Trani/Bisceglie', code: 'DSS-BT-05' },

  // BR
  'BRINDISI': { dss: 'Distretto 1 - Brindisi/San Vito dei Normanni', code: 'DSS-BR-01' },
  'SAN VITO DEI NORMANNI': { dss: 'Distretto 1 - Brindisi/San Vito dei Normanni', code: 'DSS-BR-01' },
  'FASANO': { dss: 'Distretto 2 - Fasano/Ostuni/Cisternino', code: 'DSS-BR-02' },
  'CISTERNINO': { dss: 'Distretto 2 - Fasano/Ostuni/Cisternino', code: 'DSS-BR-02' },
  'OSTUNI': { dss: 'Distretto 2 - Fasano/Ostuni/Cisternino', code: 'DSS-BR-02' },
  'CAROVIGNO': { dss: 'Distretto 2 - Fasano/Ostuni/Cisternino', code: 'DSS-BR-02' },
  'FRANCAVILLA FONTANA': { dss: 'Distretto 3 - Francavilla Fontana/Oria/Ceglie', code: 'DSS-BR-03' },
  'ORIA': { dss: 'Distretto 3 - Francavilla Fontana/Oria/Ceglie', code: 'DSS-BR-03' },
  'CEGLIE MESSAPICA': { dss: 'Distretto 3 - Francavilla Fontana/Oria/Ceglie', code: 'DSS-BR-03' },
  'VILLA CASTELLI': { dss: 'Distretto 3 - Francavilla Fontana/Oria/Ceglie', code: 'DSS-BR-03' },
  'MESAGNE': { dss: 'Distretto 4 - Mesagne/Latiano/San Pietro', code: 'DSS-BR-04' },
  'LATIANO': { dss: 'Distretto 4 - Mesagne/Latiano/San Pietro', code: 'DSS-BR-04' },
  'SAN PANCRAZIO SALENTINO': { dss: 'Distretto 4 - Mesagne/Latiano/San Pietro', code: 'DSS-BR-04' },
  'SAN DONACI': { dss: 'Distretto 4 - Mesagne/Latiano/San Pietro', code: 'DSS-BR-04' },
  'CELLINO SAN MARCO': { dss: 'Distretto 4 - Mesagne/Latiano/San Pietro', code: 'DSS-BR-04' },
  'TORCHIAROLO': { dss: 'Distretto 4 - Mesagne/Latiano/San Pietro', code: 'DSS-BR-04' },
  'TORRE SANTA SUSANNA': { dss: 'Distretto 4 - Mesagne/Latiano/San Pietro', code: 'DSS-BR-04' },
  'ERCHIE': { dss: 'Distretto 4 - Mesagne/Latiano/San Pietro', code: 'DSS-BR-04' },

  // FG
  'FOGGIA': { dss: 'Distretto 1 - Foggia', code: 'DSS-FG-01' },
  'SAN SEVERO': { dss: 'Distretto 2 - San Severo/Torremaggiore/Apricena', code: 'DSS-FG-02' },
  'TORREMAGGIORE': { dss: 'Distretto 2 - San Severo/Torremaggiore/Apricena', code: 'DSS-FG-02' },
  'APRICENA': { dss: 'Distretto 2 - San Severo/Torremaggiore/Apricena', code: 'DSS-FG-02' },
  'SAN PAOLO DI CIVITATE': { dss: 'Distretto 2 - San Severo/Torremaggiore/Apricena', code: 'DSS-FG-02' },
  'CHIEUTI': { dss: 'Distretto 2 - San Severo/Torremaggiore/Apricena', code: 'DSS-FG-02' },
  'SERRACAPRIOLA': { dss: 'Distretto 2 - San Severo/Torremaggiore/Apricena', code: 'DSS-FG-02' },
  'LESINA': { dss: 'Distretto 2 - San Severo/Torremaggiore/Apricena', code: 'DSS-FG-02' },
  'POGGIO IMPERIALE': { dss: 'Distretto 2 - San Severo/Torremaggiore/Apricena', code: 'DSS-FG-02' },
  'MANFREDONIA': { dss: 'Distretto 3 - Manfredonia/Monte Sant\'Angelo', code: 'DSS-FG-03' },
  'MONTE SANT\'ANGELO': { dss: 'Distretto 3 - Manfredonia/Monte Sant\'Angelo', code: 'DSS-FG-03' },
  'SAN GIOVANNI ROTONDO': { dss: 'Distretto 3 - San Giovanni Rotondo/San Marco in Lamis', code: 'DSS-FG-03' },
  'SAN MARCO IN LAMIS': { dss: 'Distretto 3 - San Giovanni Rotondo/San Marco in Lamis', code: 'DSS-FG-03' },
  'MATTINATA': { dss: 'Distretto 3 - Manfredonia/Monte Sant\'Angelo', code: 'DSS-FG-03' },
  'ZAPPONETA': { dss: 'Distretto 3 - Manfredonia/Monte Sant\'Angelo', code: 'DSS-FG-03' },
  'VIESTE': { dss: 'Distretto 4 - Gargano Nord', code: 'DSS-FG-04' },
  'VICO DEL GARGANO': { dss: 'Distretto 4 - Gargano Nord', code: 'DSS-FG-04' },
  'PESCHICI': { dss: 'Distretto 4 - Gargano Nord', code: 'DSS-FG-04' },
  'RODI GARGANICO': { dss: 'Distretto 4 - Gargano Nord', code: 'DSS-FG-04' },
  'CAGNANO VARANO': { dss: 'Distretto 4 - Gargano Nord', code: 'DSS-FG-04' },
  'CARPINO': { dss: 'Distretto 4 - Gargano Nord', code: 'DSS-FG-04' },
  'ISCHITELLA': { dss: 'Distretto 4 - Gargano Nord', code: 'DSS-FG-04' },
  'CERIGNOLA': { dss: 'Distretto 5 - Cerignola e Reali Siti', code: 'DSS-FG-05' },
  'ORTA NOVA': { dss: 'Distretto 5 - Cerignola e Reali Siti', code: 'DSS-FG-05' },
  'STORNARA': { dss: 'Distretto 5 - Cerignola e Reali Siti', code: 'DSS-FG-05' },
  'STORNARELLA': { dss: 'Distretto 5 - Cerignola e Reali Siti', code: 'DSS-FG-05' },
  'CARAPELLE': { dss: 'Distretto 5 - Cerignola e Reali Siti', code: 'DSS-FG-05' },
  'ORDONA': { dss: 'Distretto 5 - Cerignola e Reali Siti', code: 'DSS-FG-05' },
  'LUCERA': { dss: 'Distretto 6 - Subappennino Dauno Nord/Lucera', code: 'DSS-FG-06' },
  'TROIA': { dss: 'Distretto 7 - Subappennino Dauno Sud/Troia', code: 'DSS-FG-07' },
  'BOVINO': { dss: 'Distretto 7 - Subappennino Dauno Sud/Troia', code: 'DSS-FG-07' },
  'ASCOLI SATRIANO': { dss: 'Distretto 7 - Subappennino Dauno Sud/Troia', code: 'DSS-FG-07' },

  // LE
  'LECCE': { dss: 'Distretto Socio Sanitario di Lecce', code: 'DSS-LE-01' },
  'SURBO': { dss: 'Distretto Socio Sanitario di Lecce', code: 'DSS-LE-01' },
  'CAVALLINO': { dss: 'Distretto Socio Sanitario di Lecce', code: 'DSS-LE-01' },
  'MONTERONI DI LECCE': { dss: 'Distretto Socio Sanitario di Lecce', code: 'DSS-LE-01' },
  'LIZZANELLO': { dss: 'Distretto Socio Sanitario di Lecce', code: 'DSS-LE-01' },
  'CAMPI SALENTINA': { dss: 'Distretto Socio Sanitario di Campi Salentina', code: 'DSS-LE-02' },
  'SQUINZANO': { dss: 'Distretto Socio Sanitario di Campi Salentina', code: 'DSS-LE-02' },
  'TREPUZZI': { dss: 'Distretto Socio Sanitario di Campi Salentina', code: 'DSS-LE-02' },
  'VEGLIE': { dss: 'Distretto Socio Sanitario di Campi Salentina', code: 'DSS-LE-02' },
  'CARMIANO': { dss: 'Distretto Socio Sanitario di Campi Salentina', code: 'DSS-LE-02' },
  'NOVOLI': { dss: 'Distretto Socio Sanitario di Campi Salentina', code: 'DSS-LE-02' },
  'NARDO\'': { dss: 'Distretto Socio Sanitario di Nardò', code: 'DSS-LE-03' },
  'NARDO': { dss: 'Distretto Socio Sanitario di Nardò', code: 'DSS-LE-03' },
  'COPERTINO': { dss: 'Distretto Socio Sanitario di Nardò', code: 'DSS-LE-03' },
  'GALATONE': { dss: 'Distretto Socio Sanitario di Nardò', code: 'DSS-LE-03' },
  'LEVERANO': { dss: 'Distretto Socio Sanitario di Nardò', code: 'DSS-LE-03' },
  'PORTO CESAREO': { dss: 'Distretto Socio Sanitario di Nardò', code: 'DSS-LE-03' },
  'GALATINA': { dss: 'Distretto Socio Sanitario di Galatina', code: 'DSS-LE-04' },
  'ARADEO': { dss: 'Distretto Socio Sanitario di Galatina', code: 'DSS-LE-04' },
  'MAGLIE': { dss: 'Distretto Socio Sanitario di Maglie', code: 'DSS-LE-05' },
  'OTRANTO': { dss: 'Distretto Socio Sanitario di Maglie', code: 'DSS-LE-05' },
  'GALLIPOLI': { dss: 'Distretto Socio Sanitario di Gallipoli', code: 'DSS-LE-06' },
  'CASARANO': { dss: 'Distretto Socio Sanitario di Casarano', code: 'DSS-LE-07' },
  'MATINO': { dss: 'Distretto Socio Sanitario di Casarano', code: 'DSS-LE-07' },
  'TAURISANO': { dss: 'Distretto Socio Sanitario di Casarano', code: 'DSS-LE-07' },
  'TRICASE': { dss: 'Distretto Socio Sanitario di Gagliano/Tricase', code: 'DSS-LE-08' },
  'UGENTO': { dss: 'Distretto Socio Sanitario di Ugento', code: 'DSS-LE-09' },
  'TAVIANO': { dss: 'Distretto Socio Sanitario di Ugento', code: 'DSS-LE-09' },
  'RACALE': { dss: 'Distretto Socio Sanitario di Ugento', code: 'DSS-LE-09' },

  // TA
  'TARANTO': { dss: 'Distretto 1 - Unico di Taranto', code: 'DSS-TA-01' },
  'MASSAFRA': { dss: 'Distretto 2 - Massafra/Mottola/Palagiano/Statte', code: 'DSS-TA-02' },
  'MOTTOLA': { dss: 'Distretto 2 - Massafra/Mottola/Palagiano/Statte', code: 'DSS-TA-02' },
  'PALAGIANO': { dss: 'Distretto 2 - Massafra/Mottola/Palagiano/Statte', code: 'DSS-TA-02' },
  'STATTE': { dss: 'Distretto 2 - Massafra/Mottola/Palagiano/Statte', code: 'DSS-TA-02' },
  'MANDURIA': { dss: 'Distretto 3 - Manduria/Avetrana/Sava/Maruggio', code: 'DSS-TA-03' },
  'AVETRANA': { dss: 'Distretto 3 - Manduria/Avetrana/Sava/Maruggio', code: 'DSS-TA-03' },
  'SAVA': { dss: 'Distretto 3 - Manduria/Avetrana/Sava/Maruggio', code: 'DSS-TA-03' },
  'MARUGGIO': { dss: 'Distretto 3 - Manduria/Avetrana/Sava/Maruggio', code: 'DSS-TA-03' },
  'LIZZANO': { dss: 'Distretto 3 - Manduria/Avetrana/Sava/Maruggio', code: 'DSS-TA-03' },
  'GROTTAGLIE': { dss: 'Distretto 4 - Grottaglie e Versante Orientale', code: 'DSS-TA-04' },
  'SAN GIORGIO IONICO': { dss: 'Distretto 4 - Grottaglie e Versante Orientale', code: 'DSS-TA-04' },
  'PULSANO': { dss: 'Distretto 4 - Grottaglie e Versante Orientale', code: 'DSS-TA-04' },
  'LEPORANO': { dss: 'Distretto 4 - Grottaglie e Versante Orientale', code: 'DSS-TA-04' },
  'CASTELLANETA': { dss: 'Distretto 5 - Castellaneta/Ginosa/Laterza', code: 'DSS-TA-05' },
  'GINOSA': { dss: 'Distretto 5 - Castellaneta/Ginosa/Laterza', code: 'DSS-TA-05' },
  'LATERZA': { dss: 'Distretto 5 - Castellaneta/Ginosa/Laterza', code: 'DSS-TA-05' },
  'MARTINA FRANCA': { dss: 'Distretto 6 - Martina Franca/Crispiano', code: 'DSS-TA-06' },
  'CRISPIANO': { dss: 'Distretto 6 - Martina Franca/Crispiano', code: 'DSS-TA-06' }
};

function normalizeComune(c) {
  return (c || '').trim().toUpperCase();
}

function normalizeTitle(s) {
  if (!s) return '';
  return s
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function processAll() {
  console.log('--- Elaborazione Dataset Ufficiali Puglia ---');

  // 1. Lettura Farmacie
  const farmacieCsv = fs.readFileSync(path.join(__dirname, '..', 'dataset', 'FRM_FARMA_5_20261124.csv'), 'latin1');
  const farmacieRows = parse(farmacieCsv, {
    delimiter: ';',
    columns: true,
    skip_empty_lines: true
  });

  // 2. Lettura Parafarmacie
  const parafarmacieCsv = fs.readFileSync(path.join(__dirname, '..', 'dataset', 'FRM_PFARMA_7_20261124.csv'), 'latin1');
  const parafarmacieRows = parse(parafarmacieCsv, {
    delimiter: ';',
    columns: true,
    skip_empty_lines: true
  });

  // 3. Estrazione Comuni e generazione Districts
  const comuniMap = new Map();

  function registerComune(comuneRaw, provRaw) {
    const comuneUpper = normalizeComune(comuneRaw);
    const provUpper = (provRaw || '').trim().toUpperCase();
    if (!comuneUpper || !provUpper) return;

    if (!comuniMap.has(comuneUpper)) {
      const asl = PROV_TO_ASL[provUpper] || `ASL ${provUpper}`;
      const dssInfo = COMUNE_DISTRICTS[comuneUpper] || {
        dss: `Distretto Socio Sanitario ${normalizeTitle(comuneUpper)}`,
        code: `DSS-${provUpper}-${comuneUpper.slice(0, 3)}`
      };

      comuniMap.set(comuneUpper, {
        comune: normalizeTitle(comuneUpper),
        comune_key: comuneUpper,
        provincia: provUpper,
        asl_name: asl,
        district_name: dssInfo.dss,
        district_code: dssInfo.code
      });
    }
  }

  // Registra da farmacie attive
  const pugliaFarmacie = farmacieRows.filter(r => r.regione === 'PUGLIA' && r.data_fine_validita === '-');
  for (const r of pugliaFarmacie) {
    registerComune(r.comune, r.sigla_provincia);
  }

  // Registra da parafarmacie attive
  const pugliaParafarmacie = parafarmacieRows.filter(r => r.regione === 'PUGLIA' && r.data_fine_validita === '-');
  for (const r of pugliaParafarmacie) {
    registerComune(r.comune, r.sigla_provincia);
  }

  const districtsList = Array.from(comuniMap.values()).sort((a, b) => a.comune.localeCompare(b.comune));
  console.log(`Distretti/Comuni generati: ${districtsList.length}`);

  // Mappa comune -> distretto index (per associazione)
  const comuneToDistrictMap = new Map();
  districtsList.forEach((d, idx) => {
    comuneToDistrictMap.set(d.comune_key, idx + 1); // 1-based per id DB
  });

  // 4. Normalizzazione Presidi (Farmacie e Parafarmacie)
  const pharmaciesList = [];
  const ministryCodesSeen = new Set();

  for (const r of pugliaFarmacie) {
    const code = (r.cod_farmacia || '').trim();
    if (!code || ministryCodesSeen.has(code)) continue;
    ministryCodesSeen.add(code);

    const comuneUpper = normalizeComune(r.comune);
    const latStr = (r.latitudine || '').replace(',', '.').trim();
    const lngStr = (r.longitudine || '').replace(',', '.').trim();
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    pharmaciesList.push({
      ministry_code: code,
      name: (r.descrizione_farmacia || 'Farmacia').trim(),
      type: 'farmacia',
      address: (r.indirizzo || '').trim(),
      comune: normalizeTitle(comuneUpper),
      provincia: (r.sigla_provincia || '').trim().toUpperCase(),
      cap: (r.cap || '').trim(),
      lat: !isNaN(lat) && lat > 39 && lat < 43 ? lat : null,
      lng: !isNaN(lng) && lng > 14 && lng < 19 ? lng : null,
      district_comune: normalizeTitle(comuneUpper)
    });
  }

  for (const r of pugliaParafarmacie) {
    const code = (r.codice_identificativo_sito || '').trim();
    if (!code || ministryCodesSeen.has(code)) continue;
    ministryCodesSeen.add(code);

    const comuneUpper = normalizeComune(r.comune);
    const latStr = (r.latitudine || '').replace(',', '.').trim();
    const lngStr = (r.longitudine || '').replace(',', '.').trim();
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    pharmaciesList.push({
      ministry_code: code,
      name: (r.sito_logistico || 'Parafarmacia').trim(),
      type: 'parafarmacia',
      address: (r.indirizzo || '').trim(),
      comune: normalizeTitle(comuneUpper),
      provincia: (r.sigla_provincia || '').trim().toUpperCase(),
      cap: (r.cap || '').trim(),
      lat: !isNaN(lat) && lat > 39 && lat < 43 ? lat : null,
      lng: !isNaN(lng) && lng > 14 && lng < 19 ? lng : null,
      district_comune: normalizeTitle(comuneUpper)
    });
  }

  console.log(`Presidi sanitari pugliesi validati: ${pharmaciesList.length} (${pugliaFarmacie.length} farmacie, ${pugliaParafarmacie.length} parafarmacie)`);

  // 5. Lettura e normalizzazione Farmaci
  const medicinesCsv = fs.readFileSync(path.join(__dirname, '..', 'dataset', 'Lista_farmaci_equivalenti.csv'), 'binary');
  // Usiamo iconv-lite o parse con encoding corretto
  const medicinesRows = parse(medicinesCsv, {
    delimiter: ';',
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true
  });

  const genericHolders = ['DOC GENERICI', 'EG', 'SANDOZ', 'TEVA', 'ZENTIVA', 'MYLAN', 'AUROBINDO', 'PENSA', 'KRKA', 'SUN', 'HEXAL', 'ACCORD', 'RANBAXY', 'ALMUS', 'EUMEDICA', 'GERMED'];

  const medicinesList = [];
  const aicSeen = new Set();

  for (const r of medicinesRows) {
    const aic = (r.AIC || '').trim();
    if (!aic || aicSeen.has(aic)) continue;
    aicSeen.add(aic);

    const priceRaw = (r['Prezzo Pubblico 16 novembre 2026'] || r['Prezzo riferimento SSN'] || '')
      .replace(/[^\d,\.]/g, '')
      .replace(',', '.');
    const price = parseFloat(priceRaw) || 0.0;

    const diffRaw = (r['Differenza'] || '').replace(/[^\d,\.]/g, '').replace(',', '.');
    const diff = parseFloat(diffRaw) || 0.0;

    const holder = (r.Ditta || '').trim();
    const commercialName = (r.Farmaco || '').trim();
    const activeIng = (r['Principio attivo'] || '').trim();

    // È generico se la differenza di prezzo SSN è zero oppure se il titolare / nome contiene indicatori di equivalente
    const isGeneric = (diff === 0.0 || genericHolders.some(h => holder.toUpperCase().includes(h) || commercialName.toUpperCase().includes(h))) ? 1 : 0;

    // Prescrizione richiesta (1 di default per farmaci SSN in lista di trasparenza)
    medicinesList.push({
      aic_code: aic,
      commercial_name: commercialName,
      active_ingredient: activeIng,
      atc_code: (r.ATC || '').trim(),
      holder: holder,
      price: Math.round(price * 100) / 100,
      is_generic: isGeneric,
      prescription_required: 1
    });
  }

  console.log(`Medicinali validati: ${medicinesList.length}`);

  // 6. Salvataggio in data/raw/
  const rawDir = path.join(__dirname, '..', 'data', 'raw');
  if (!fs.existsSync(rawDir)) {
    fs.mkdirSync(rawDir, { recursive: true });
  }

  // JSON files
  fs.writeFileSync(path.join(rawDir, 'districts.json'), JSON.stringify(districtsList, null, 2), 'utf8');
  fs.writeFileSync(path.join(rawDir, 'pharmacies.json'), JSON.stringify(pharmaciesList, null, 2), 'utf8');
  fs.writeFileSync(path.join(rawDir, 'medicines.json'), JSON.stringify(medicinesList, null, 2), 'utf8');

  // Sample CSVs for admin upload tests
  function toCsv(rows, headers) {
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(headers.map(h => {
        let val = r[h] === null || r[h] === undefined ? '' : String(r[h]);
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(','));
    }
    return lines.join('\n');
  }

  // Sample CSVs
  fs.writeFileSync(
    path.join(rawDir, 'sample_districts.csv'),
    toCsv(districtsList.slice(0, 5), ['comune', 'provincia', 'asl_name', 'district_name', 'district_code']),
    'utf8'
  );

  fs.writeFileSync(
    path.join(rawDir, 'sample_pharmacies.csv'),
    toCsv(pharmaciesList.slice(0, 5), ['ministry_code', 'name', 'type', 'address', 'comune', 'provincia', 'cap', 'lat', 'lng']),
    'utf8'
  );

  fs.writeFileSync(
    path.join(rawDir, 'sample_medicines.csv'),
    toCsv(medicinesList.slice(0, 5), ['aic_code', 'commercial_name', 'active_ingredient', 'atc_code', 'holder', 'price', 'is_generic', 'prescription_required']),
    'utf8'
  );

  console.log('--- File generati con successo in data/raw/ ---');
}

processAll();
