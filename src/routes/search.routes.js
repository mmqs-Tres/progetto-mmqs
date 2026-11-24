const express = require('express');
const { getDb } = require('../db/database');

const router = express.Router();

// Coordinate di riferimento per i principali Comuni pugliesi (usate anche come fallback locale per Nominatim)
const PUGLIA_MUNICIPALITIES_COORDS = {
  bari: { lat: 41.1171, lng: 16.8719, display_name: 'Bari, Città Metropolitana di Bari, Puglia, Italia' },
  altamura: { lat: 40.8262, lng: 16.5545, display_name: 'Altamura, Città Metropolitana di Bari, Puglia, Italia' },
  molfetta: { lat: 41.2012, lng: 16.5983, display_name: 'Molfetta, Città Metropolitana di Bari, Puglia, Italia' },
  monopoli: { lat: 40.9519, lng: 17.2984, display_name: 'Monopoli, Città Metropolitana di Bari, Puglia, Italia' },
  bitonto: { lat: 41.1084, lng: 16.6914, display_name: 'Bitonto, Città Metropolitana di Bari, Puglia, Italia' },
  putignano: { lat: 40.8492, lng: 17.1225, display_name: 'Putignano, Città Metropolitana di Bari, Puglia, Italia' },
  lecce: { lat: 40.3515, lng: 18.175, display_name: 'Lecce, Provincia di Lecce, Puglia, Italia' },
  gallipoli: { lat: 40.0559, lng: 17.9926, display_name: 'Gallipoli, Provincia di Lecce, Puglia, Italia' },
  'nardò': { lat: 40.1797, lng: 18.0315, display_name: 'Nardò, Provincia di Lecce, Puglia, Italia' },
  nardo: { lat: 40.1797, lng: 18.0315, display_name: 'Nardò, Provincia di Lecce, Puglia, Italia' },
  maglie: { lat: 40.1194, lng: 18.2989, display_name: 'Maglie, Provincia di Lecce, Puglia, Italia' },
  taranto: { lat: 40.4644, lng: 17.247, display_name: 'Taranto, Provincia di Taranto, Puglia, Italia' },
  'martina franca': { lat: 40.7042, lng: 17.3347, display_name: 'Martina Franca, Provincia di Taranto, Puglia, Italia' },
  manduria: { lat: 40.4028, lng: 17.6331, display_name: 'Manduria, Provincia di Taranto, Puglia, Italia' },
  foggia: { lat: 41.4622, lng: 15.5446, display_name: 'Foggia, Provincia di Foggia, Puglia, Italia' },
  cerignola: { lat: 41.2656, lng: 15.8995, display_name: 'Cerignola, Provincia di Foggia, Puglia, Italia' },
  manfredonia: { lat: 41.6295, lng: 15.9158, display_name: 'Manfredonia, Provincia di Foggia, Puglia, Italia' },
  'san severo': { lat: 41.6858, lng: 15.3792, display_name: 'San Severo, Provincia di Foggia, Puglia, Italia' },
  brindisi: { lat: 40.6327, lng: 17.9418, display_name: 'Brindisi, Provincia di Brindisi, Puglia, Italia' },
  ostuni: { lat: 40.7289, lng: 17.5774, display_name: 'Ostuni, Provincia di Brindisi, Puglia, Italia' },
  fasano: { lat: 40.8347, lng: 17.3597, display_name: 'Fasano, Provincia di Brindisi, Puglia, Italia' },
  barletta: { lat: 41.3196, lng: 16.2829, display_name: 'Barletta, Provincia di Barletta-Andria-Trani, Puglia, Italia' },
  andria: { lat: 41.227, lng: 16.2957, display_name: 'Andria, Provincia di Barletta-Andria-Trani, Puglia, Italia' },
  trani: { lat: 41.2775, lng: 16.4189, display_name: 'Trani, Provincia di Barletta-Andria-Trani, Puglia, Italia' }
};

const REFERENCE_DISTRICTS = [
  { comune: 'Bari', provincia: 'BA', asl_name: 'ASL Bari', district_name: 'DSS Unico di Bari', district_code: 'BA-DSS07' },
  { comune: 'Altamura', provincia: 'BA', asl_name: 'ASL Bari', district_name: 'DSS 4 Altamura - Gravina', district_code: 'BA-DSS04' },
  { comune: 'Molfetta', provincia: 'BA', asl_name: 'ASL Bari', district_name: 'DSS 1 Molfetta - Giovinazzo', district_code: 'BA-DSS01' },
  { comune: 'Bitonto', provincia: 'BA', asl_name: 'ASL Bari', district_name: 'DSS 3 Bitonto - Palo del Colle', district_code: 'BA-DSS03' },
  { comune: 'Monopoli', provincia: 'BA', asl_name: 'ASL Bari', district_name: 'DSS 12 Conversano - Monopoli', district_code: 'BA-DSS12' },
  { comune: 'Putignano', provincia: 'BA', asl_name: 'ASL Bari', district_name: 'DSS 14 Putignano - Noci', district_code: 'BA-DSS14' },
  { comune: 'Lecce', provincia: 'LE', asl_name: 'ASL Lecce', district_name: 'DSS di Lecce', district_code: 'LE-DSS01' },
  { comune: 'Gallipoli', provincia: 'LE', asl_name: 'ASL Lecce', district_name: 'DSS di Gallipoli', district_code: 'LE-DSS06' },
  { comune: 'Nardò', provincia: 'LE', asl_name: 'ASL Lecce', district_name: 'DSS di Nardò', district_code: 'LE-DSS03' },
  { comune: 'Maglie', provincia: 'LE', asl_name: 'ASL Lecce', district_name: 'DSS di Maglie', district_code: 'LE-DSS08' },
  { comune: 'Taranto', provincia: 'TA', asl_name: 'ASL Taranto', district_name: 'DSS Unico di Taranto', district_code: 'TA-DSS03' },
  { comune: 'Martina Franca', provincia: 'TA', asl_name: 'ASL Taranto', district_name: 'DSS 5 Martina Franca', district_code: 'TA-DSS05' },
  { comune: 'Manduria', provincia: 'TA', asl_name: 'ASL Taranto', district_name: 'DSS 7 Manduria', district_code: 'TA-DSS07' },
  { comune: 'Foggia', provincia: 'FG', asl_name: 'ASL Foggia', district_name: 'DSS 60 Foggia', district_code: 'FG-DSS60' },
  { comune: 'Cerignola', provincia: 'FG', asl_name: 'ASL Foggia', district_name: 'DSS 56 Cerignola', district_code: 'FG-DSS56' },
  { comune: 'Manfredonia', provincia: 'FG', asl_name: 'ASL Foggia', district_name: 'DSS 54 Manfredonia', district_code: 'FG-DSS54' },
  { comune: 'Brindisi', provincia: 'BR', asl_name: 'ASL Brindisi', district_name: 'DSS 1 Brindisi', district_code: 'BR-DSS01' },
  { comune: 'Ostuni', provincia: 'BR', asl_name: 'ASL Brindisi', district_name: 'DSS 2 Fasano - Ostuni', district_code: 'BR-DSS02' },
  { comune: 'Barletta', provincia: 'BT', asl_name: 'ASL BT', district_name: 'DSS 4 Barletta', district_code: 'BT-DSS04' },
  { comune: 'Andria', provincia: 'BT', asl_name: 'ASL BT', district_name: 'DSS 2 Andria', district_code: 'BT-DSS02' },
  { comune: 'Trani', provincia: 'BT', asl_name: 'ASL BT', district_name: 'DSS 5 Trani - Bisceglie', district_code: 'BT-DSS05' }
];

const REFERENCE_PHARMACIES = [
  {
    ministry_code: 'MINSAL-BA-00101',
    name: 'Farmacia Centrale Sparano',
    type: 'farmacia',
    address: 'Via Sparano da Bari 112',
    comune: 'Bari',
    provincia: 'BA',
    cap: '70121',
    lat: 41.1228,
    lng: 16.8695
  },
  {
    ministry_code: 'MINSAL-BA-00102',
    name: 'Farmacia San Nicola Poggiofranco',
    type: 'farmacia',
    address: 'Viale Papa Giovanni XXIII 145',
    comune: 'Bari',
    provincia: 'BA',
    cap: '70124',
    lat: 41.1068,
    lng: 16.8576
  },
  {
    ministry_code: 'MINSAL-BA-00103',
    name: 'Parafarmacia Salus Stazione Centrale',
    type: 'parafarmacia',
    address: 'Piazza Aldo Moro 38',
    comune: 'Bari',
    provincia: 'BA',
    cap: '70122',
    lat: 41.1181,
    lng: 16.8701
  },
  {
    ministry_code: 'MINSAL-BA-00201',
    name: 'Farmacia Cattedrale Federiciana',
    type: 'farmacia',
    address: 'Corso Federico II di Svevia 64',
    comune: 'Altamura',
    provincia: 'BA',
    cap: '70022',
    lat: 40.8271,
    lng: 16.5532
  },
  {
    ministry_code: 'MINSAL-BA-00301',
    name: 'Farmacia del Porto',
    type: 'farmacia',
    address: 'Corso Dante Alighieri 42',
    comune: 'Molfetta',
    provincia: 'BA',
    cap: '70056',
    lat: 41.2041,
    lng: 16.5971
  },
  {
    ministry_code: 'MINSAL-BA-00401',
    name: 'Farmacia Adriatica Borgo Antico',
    type: 'farmacia',
    address: 'Via Giuseppe Garibaldi 28',
    comune: 'Monopoli',
    provincia: 'BA',
    cap: '70043',
    lat: 40.9527,
    lng: 17.3012
  },
  {
    ministry_code: 'MINSAL-BA-00501',
    name: 'Parafarmacia Ulivo Salute',
    type: 'parafarmacia',
    address: 'Via Matteotti 88',
    comune: 'Bitonto',
    provincia: 'BA',
    cap: '70032',
    lat: 41.1095,
    lng: 16.6902
  },
  {
    ministry_code: 'MINSAL-LE-00101',
    name: 'Farmacia Sant’Oronzo Centro',
    type: 'farmacia',
    address: 'Piazza Sant’Oronzo 19',
    comune: 'Lecce',
    provincia: 'LE',
    cap: '73100',
    lat: 40.3532,
    lng: 18.1724
  },
  {
    ministry_code: 'MINSAL-LE-00102',
    name: 'Parafarmacia Salento Care Mazzini',
    type: 'parafarmacia',
    address: 'Piazza Giuseppe Mazzini 51',
    comune: 'Lecce',
    provincia: 'LE',
    cap: '73100',
    lat: 40.3547,
    lng: 18.1791
  },
  {
    ministry_code: 'MINSAL-LE-00201',
    name: 'Farmacia Corso Roma Ionica',
    type: 'farmacia',
    address: 'Corso Roma 95',
    comune: 'Gallipoli',
    provincia: 'LE',
    cap: '73014',
    lat: 40.0558,
    lng: 17.9885
  },
  {
    ministry_code: 'MINSAL-LE-00301',
    name: 'Farmacia Piazza Salandra',
    type: 'farmacia',
    address: 'Via Duomo 14',
    comune: 'Nardò',
    provincia: 'LE',
    cap: '73048',
    lat: 40.1788,
    lng: 18.0309
  },
  {
    ministry_code: 'MINSAL-TA-00101',
    name: 'Farmacia Due Mari Borgo Umbertino',
    type: 'farmacia',
    address: 'Via Di Palma 74',
    comune: 'Taranto',
    provincia: 'TA',
    cap: '74123',
    lat: 40.4718,
    lng: 17.2432
  },
  {
    ministry_code: 'MINSAL-TA-00102',
    name: 'Parafarmacia Magna Grecia',
    type: 'parafarmacia',
    address: 'Viale Magna Grecia 180',
    comune: 'Taranto',
    provincia: 'TA',
    cap: '74121',
    lat: 40.4561,
    lng: 17.2624
  },
  {
    ministry_code: 'MINSAL-TA-00201',
    name: 'Farmacia Valle d’Itria',
    type: 'farmacia',
    address: 'Piazza XX Settembre 12',
    comune: 'Martina Franca',
    provincia: 'TA',
    cap: '74015',
    lat: 40.7039,
    lng: 17.3361
  },
  {
    ministry_code: 'MINSAL-FG-00101',
    name: 'Farmacia Capitanata Cavour',
    type: 'farmacia',
    address: 'Corso Giannone 33',
    comune: 'Foggia',
    provincia: 'FG',
    cap: '71121',
    lat: 41.4619,
    lng: 15.5468
  },
  {
    ministry_code: 'MINSAL-FG-00201',
    name: 'Farmacia Tavoliere Duomo',
    type: 'farmacia',
    address: 'Corso Aldo Moro 101',
    comune: 'Cerignola',
    provincia: 'FG',
    cap: '71042',
    lat: 41.2649,
    lng: 15.9012
  },
  {
    ministry_code: 'MINSAL-FG-00301',
    name: 'Parafarmacia Gargano Salute',
    type: 'parafarmacia',
    address: 'Corso Manfredi 156',
    comune: 'Manfredonia',
    provincia: 'FG',
    cap: '71043',
    lat: 41.6288,
    lng: 15.9165
  },
  {
    ministry_code: 'MINSAL-BR-00101',
    name: 'Farmacia Porto Regina Margherita',
    type: 'farmacia',
    address: 'Corso Garibaldi 58',
    comune: 'Brindisi',
    provincia: 'BR',
    cap: '72100',
    lat: 40.6382,
    lng: 17.9445
  },
  {
    ministry_code: 'MINSAL-BR-00201',
    name: 'Farmacia Città Bianca',
    type: 'farmacia',
    address: 'Piazza della Libertà 21',
    comune: 'Ostuni',
    provincia: 'BR',
    cap: '72017',
    lat: 40.7318,
    lng: 17.5778
  },
  {
    ministry_code: 'MINSAL-BT-00101',
    name: 'Farmacia Eraclio Centro',
    type: 'farmacia',
    address: 'Corso Vittorio Emanuele 89',
    comune: 'Barletta',
    provincia: 'BT',
    cap: '76121',
    lat: 41.3189,
    lng: 16.2814
  },
  {
    ministry_code: 'MINSAL-BT-00201',
    name: 'Farmacia Castel del Monte',
    type: 'farmacia',
    address: 'Via Regina Margherita 44',
    comune: 'Andria',
    provincia: 'BT',
    cap: '76123',
    lat: 41.2264,
    lng: 16.2968
  },
  {
    ministry_code: 'MINSAL-BT-00301',
    name: 'Parafarmacia Cattedrale Sul Mare',
    type: 'parafarmacia',
    address: 'Corso Vittorio Emanuele 130',
    comune: 'Trani',
    provincia: 'BT',
    cap: '76125',
    lat: 41.2784,
    lng: 16.4176
  }
];

const REFERENCE_MEDICINES = [
  // Paracetamolo 500mg (SOP/OTC)
  {
    aic_code: '012745018',
    commercial_name: 'Tachipirina 500 mg compresse (20 cpr)',
    active_ingredient: 'Paracetamolo 500 mg',
    atc_code: 'N02BE01',
    holder: 'Angelini Pharma S.p.A.',
    price: 5.9,
    is_generic: 0,
    prescription_required: 0
  },
  {
    aic_code: '034218015',
    commercial_name: 'Paracetamolo DOC Generici 500 mg compresse (20 cpr)',
    active_ingredient: 'Paracetamolo 500 mg',
    atc_code: 'N02BE01',
    holder: 'DOC Generici S.r.l.',
    price: 3.4,
    is_generic: 1,
    prescription_required: 0
  },
  {
    aic_code: '036912021',
    commercial_name: 'Paracetamolo Mylan 500 mg compresse (20 cpr)',
    active_ingredient: 'Paracetamolo 500 mg',
    atc_code: 'N02BE01',
    holder: 'Viatris Italia S.r.l.',
    price: 3.6,
    is_generic: 1,
    prescription_required: 0
  },
  {
    aic_code: '026608048',
    commercial_name: 'Efferalgan 500 mg compresse effervescenti (16 cpr)',
    active_ingredient: 'Paracetamolo 500 mg',
    atc_code: 'N02BE01',
    holder: 'UPSA Italy S.r.l.',
    price: 6.2,
    is_generic: 0,
    prescription_required: 0
  },
  // Paracetamolo 1000mg (Con ricetta)
  {
    aic_code: '012745184',
    commercial_name: 'Tachipirina 1000 mg compresse divisibili (16 cpr)',
    active_ingredient: 'Paracetamolo 1000 mg',
    atc_code: 'N02BE01',
    holder: 'Angelini Pharma S.p.A.',
    price: 6.5,
    is_generic: 0,
    prescription_required: 1
  },
  {
    aic_code: '038451024',
    commercial_name: 'Paracetamolo Sandoz 1000 mg compresse (16 cpr)',
    active_ingredient: 'Paracetamolo 1000 mg',
    atc_code: 'N02BE01',
    holder: 'Sandoz S.p.A.',
    price: 3.9,
    is_generic: 1,
    prescription_required: 1
  },
  // Ibuprofene 200mg (SOP/OTC)
  {
    aic_code: '025915024',
    commercial_name: 'Moment 200 mg compresse rivestite (12 cpr)',
    active_ingredient: 'Ibuprofene 200 mg',
    atc_code: 'M01AE01',
    holder: 'Angelini Pharma S.p.A.',
    price: 8.5,
    is_generic: 0,
    prescription_required: 0
  },
  {
    aic_code: '039112015',
    commercial_name: 'Ibuprofene Sandoz 200 mg compresse (12 cpr)',
    active_ingredient: 'Ibuprofene 200 mg',
    atc_code: 'M01AE01',
    holder: 'Sandoz S.p.A.',
    price: 4.5,
    is_generic: 1,
    prescription_required: 0
  },
  {
    aic_code: '035784015',
    commercial_name: 'Ibuprofene Zentiva 200 mg compresse (12 cpr)',
    active_ingredient: 'Ibuprofene 200 mg',
    atc_code: 'M01AE01',
    holder: 'Zentiva Italia S.r.l.',
    price: 4.8,
    is_generic: 1,
    prescription_required: 0
  },
  // Ibuprofene 400mg
  {
    aic_code: '022593127',
    commercial_name: 'Brufen 400 mg compresse rivestite (12 cpr)',
    active_ingredient: 'Ibuprofene 400 mg',
    atc_code: 'M01AE01',
    holder: 'Viatris Healthcare Limited',
    price: 9.2,
    is_generic: 0,
    prescription_required: 0
  },
  {
    aic_code: '041223011',
    commercial_name: 'Ibuprofene Teva 400 mg compresse (12 cpr)',
    active_ingredient: 'Ibuprofene 400 mg',
    atc_code: 'M01AE01',
    holder: 'Teva Italia S.r.l.',
    price: 4.9,
    is_generic: 1,
    prescription_required: 0
  },
  {
    aic_code: '040881027',
    commercial_name: 'Ibuprofene EG 400 mg compresse (12 cpr)',
    active_ingredient: 'Ibuprofene 400 mg',
    atc_code: 'M01AE01',
    holder: 'EG S.p.A.',
    price: 5.1,
    is_generic: 1,
    prescription_required: 0
  },
  // Amoxicillina + Acido Clavulanico (Con ricetta)
  {
    aic_code: '026089096',
    commercial_name: 'Augmentin 875 mg + 125 mg compresse rivestite (12 cpr)',
    active_ingredient: 'Amoxicillina + Acido Clavulanico 875 mg/125 mg',
    atc_code: 'J01CR02',
    holder: 'GlaxoSmithKline S.p.A.',
    price: 10.4,
    is_generic: 0,
    prescription_required: 1
  },
  {
    aic_code: '037614021',
    commercial_name: 'Amoxicillina e Acido Clavulanico Teva 875 mg + 125 mg (12 cpr)',
    active_ingredient: 'Amoxicillina + Acido Clavulanico 875 mg/125 mg',
    atc_code: 'J01CR02',
    holder: 'Teva Italia S.r.l.',
    price: 6.72,
    is_generic: 1,
    prescription_required: 1
  },
  {
    aic_code: '036988019',
    commercial_name: 'Amoxicillina e Acido Clavulanico Sandoz 875 mg + 125 mg (12 cpr)',
    active_ingredient: 'Amoxicillina + Acido Clavulanico 875 mg/125 mg',
    atc_code: 'J01CR02',
    holder: 'Sandoz S.p.A.',
    price: 6.72,
    is_generic: 1,
    prescription_required: 1
  },
  // Omeprazolo 20mg (Con ricetta)
  {
    aic_code: '026783047',
    commercial_name: 'Antra 20 mg capsule rigide gastroresistenti (14 cps)',
    active_ingredient: 'Omeprazolo 20 mg',
    atc_code: 'A02BC01',
    holder: 'Cheplapharm Arzneimittel GmbH',
    price: 8.65,
    is_generic: 0,
    prescription_required: 1
  },
  {
    aic_code: '037945011',
    commercial_name: 'Omeprazolo DOC Generici 20 mg capsule (14 cps)',
    active_ingredient: 'Omeprazolo 20 mg',
    atc_code: 'A02BC01',
    holder: 'DOC Generici S.r.l.',
    price: 4.94,
    is_generic: 1,
    prescription_required: 1
  },
  {
    aic_code: '038119022',
    commercial_name: 'Omeprazolo Mylan 20 mg capsule (14 cps)',
    active_ingredient: 'Omeprazolo 20 mg',
    atc_code: 'A02BC01',
    holder: 'Viatris Italia S.r.l.',
    price: 4.94,
    is_generic: 1,
    prescription_required: 1
  },
  // Acido Acetilsalicilico 500mg
  {
    aic_code: '004763039',
    commercial_name: 'Aspirina 500 mg compresse (20 cpr)',
    active_ingredient: 'Acido Acetilsalicilico 500 mg',
    atc_code: 'N02BA01',
    holder: 'Bayer S.p.A.',
    price: 7.4,
    is_generic: 0,
    prescription_required: 0
  },
  {
    aic_code: '034991013',
    commercial_name: 'Acido Acetilsalicilico Zentiva 500 mg compresse (20 cpr)',
    active_ingredient: 'Acido Acetilsalicilico 500 mg',
    atc_code: 'N02BA01',
    holder: 'Zentiva Italia S.r.l.',
    price: 3.9,
    is_generic: 1,
    prescription_required: 0
  },
  // Loratadina 10mg
  {
    aic_code: '027075011',
    commercial_name: 'Clarityn 10 mg compresse (7 cpr)',
    active_ingredient: 'Loratadina 10 mg',
    atc_code: 'R06AX13',
    holder: 'Bayer S.p.A.',
    price: 9.5,
    is_generic: 0,
    prescription_required: 0
  },
  {
    aic_code: '036115019',
    commercial_name: 'Loratadina Sandoz 10 mg compresse (7 cpr)',
    active_ingredient: 'Loratadina 10 mg',
    atc_code: 'R06AX13',
    holder: 'Sandoz S.p.A.',
    price: 4.6,
    is_generic: 1,
    prescription_required: 0
  },
  {
    aic_code: '035892014',
    commercial_name: 'Loratadina EG 10 mg compresse (7 cpr)',
    active_ingredient: 'Loratadina 10 mg',
    atc_code: 'R06AX13',
    holder: 'EG S.p.A.',
    price: 4.75,
    is_generic: 1,
    prescription_required: 0
  },
  // Atorvastatina 20mg
  {
    aic_code: '033007029',
    commercial_name: 'Torvast 20 mg compresse rivestite (30 cpr)',
    active_ingredient: 'Atorvastatina 20 mg',
    atc_code: 'C10AA05',
    holder: 'Viatris Italia S.r.l.',
    price: 11.2,
    is_generic: 0,
    prescription_required: 1
  },
  {
    aic_code: '040318024',
    commercial_name: 'Atorvastatina Teva 20 mg compresse (30 cpr)',
    active_ingredient: 'Atorvastatina 20 mg',
    atc_code: 'C10AA05',
    holder: 'Teva Italia S.r.l.',
    price: 5.58,
    is_generic: 1,
    prescription_required: 1
  }
];

function ensureReferenceData(db) {
  const districtCount = db.prepare('SELECT COUNT(*) AS count FROM districts').get().count;
  const pharmacyCount = db.prepare('SELECT COUNT(*) AS count FROM pharmacies').get().count;
  const medicineCount = db.prepare('SELECT COUNT(*) AS count FROM medicines').get().count;

  if (districtCount > 0 || pharmacyCount > 0 || medicineCount > 0) {
    return;
  }

  const insertDistrict = db.prepare(`
    INSERT OR IGNORE INTO districts (comune, provincia, asl_name, district_name, district_code)
    VALUES (?, ?, ?, ?, ?)
  `);

  const findDistrictId = db.prepare(`
    SELECT id FROM districts WHERE LOWER(comune) = LOWER(?) LIMIT 1
  `);

  const insertPharmacy = db.prepare(`
    INSERT OR IGNORE INTO pharmacies (
      ministry_code, name, type, address, comune, provincia, cap, lat, lng, district_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMedicine = db.prepare(`
    INSERT OR IGNORE INTO medicines (
      aic_code, commercial_name, active_ingredient, atc_code, holder, price, is_generic, prescription_required
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedTx = db.transaction(() => {
    for (const d of REFERENCE_DISTRICTS) {
      insertDistrict.run(d.comune, d.provincia, d.asl_name, d.district_name, d.district_code);
    }

    for (const p of REFERENCE_PHARMACIES) {
      const districtRow = findDistrictId.get(p.comune);
      const districtId = districtRow ? districtRow.id : null;
      insertPharmacy.run(
        p.ministry_code,
        p.name,
        p.type,
        p.address,
        p.comune,
        p.provincia,
        p.cap,
        p.lat,
        p.lng,
        districtId
      );
    }

    for (const m of REFERENCE_MEDICINES) {
      insertMedicine.run(
        m.aic_code,
        m.commercial_name,
        m.active_ingredient,
        m.atc_code,
        m.holder,
        m.price,
        m.is_generic,
        m.prescription_required
      );
    }
  });

  seedTx();
}

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

function calculateHaversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Raggio medio della Terra in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// GET /api/medicines?q=...&generic=...&prescription=...
router.get('/medicines', (req, res, next) => {
  try {
    const db = getDb();
    ensureReferenceData(db);

    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const genericFilter = req.query.generic;
    const prescriptionFilter = req.query.prescription;

    const conditions = [];
    const params = [];

    if (q) {
      const likeTerm = `%${q}%`;
      conditions.push(`(
        LOWER(commercial_name) LIKE LOWER(?)
        OR LOWER(active_ingredient) LIKE LOWER(?)
        OR LOWER(aic_code) LIKE LOWER(?)
        OR LOWER(COALESCE(atc_code, '')) LIKE LOWER(?)
        OR LOWER(COALESCE(holder, '')) LIKE LOWER(?)
      )`);
      params.push(likeTerm, likeTerm, likeTerm, likeTerm, likeTerm);
    }

    if (genericFilter === '1' || genericFilter === '0') {
      conditions.push('is_generic = ?');
      params.push(Number(genericFilter));
    }

    if (prescriptionFilter === '1' || prescriptionFilter === '0') {
      conditions.push('prescription_required = ?');
      params.push(Number(prescriptionFilter));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db.prepare(`
      SELECT
        id,
        aic_code,
        commercial_name,
        active_ingredient,
        atc_code,
        holder,
        price,
        is_generic,
        prescription_required
      FROM medicines
      ${whereClause}
      ORDER BY commercial_name ASC
      LIMIT 60
    `).all(...params);

    const findEquivalentsStmt = db.prepare(`
      SELECT
        id,
        aic_code,
        commercial_name,
        active_ingredient,
        atc_code,
        holder,
        price,
        is_generic,
        prescription_required
      FROM medicines
      WHERE LOWER(active_ingredient) = LOWER(?)
        AND id != ?
      ORDER BY price ASC, is_generic DESC, commercial_name ASC
    `);

    const medicines = rows.map((med) => {
      const equivalents = findEquivalentsStmt.all(med.active_ingredient, med.id);
      const validPrices = equivalents
        .map((eq) => eq.price)
        .filter((p) => typeof p === 'number' && !Number.isNaN(p));
      const cheapestEquivalentPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
      const potentialSaving =
        cheapestEquivalentPrice !== null && typeof med.price === 'number' && med.price > cheapestEquivalentPrice
          ? Number((med.price - cheapestEquivalentPrice).toFixed(2))
          : 0;

      return {
        ...med,
        cheapest_equivalent_price: cheapestEquivalentPrice,
        potential_saving: potentialSaving,
        equivalents
      };
    });

    res.json({
      query: q,
      count: medicines.length,
      medicines
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/districts?comune=...&provincia=...
router.get('/districts', (req, res, next) => {
  try {
    const db = getDb();
    ensureReferenceData(db);

    const comune = typeof req.query.comune === 'string' ? req.query.comune.trim() : '';
    const provincia = typeof req.query.provincia === 'string' ? req.query.provincia.trim() : '';

    const conditions = [];
    const params = [];

    if (comune) {
      conditions.push('LOWER(d.comune) LIKE LOWER(?)');
      params.push(`%${comune}%`);
    }

    if (provincia) {
      conditions.push('LOWER(d.provincia) = LOWER(?)');
      params.push(provincia);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const districts = db.prepare(`
      SELECT
        d.id,
        d.comune,
        d.provincia,
        d.asl_name,
        d.district_name,
        d.district_code,
        COUNT(p.id) AS pharmacies_count
      FROM districts d
      LEFT JOIN pharmacies p
        ON p.district_id = d.id OR LOWER(p.comune) = LOWER(d.comune)
      ${whereClause}
      GROUP BY d.id
      ORDER BY d.comune ASC
    `).all(...params);

    res.json({
      count: districts.length,
      districts
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/pharmacies?comune=...&type=...&lat=...&lng=...&radius_km=...
router.get('/pharmacies', (req, res, next) => {
  try {
    const db = getDb();
    ensureReferenceData(db);

    const comune = typeof req.query.comune === 'string' ? req.query.comune.trim() : '';
    const type = typeof req.query.type === 'string' ? req.query.type.trim().toLowerCase() : '';
    const hasLat = req.query.lat !== undefined && req.query.lat !== '';
    const hasLng = req.query.lng !== undefined && req.query.lng !== '';
    const hasRadius = req.query.radius_km !== undefined && req.query.radius_km !== '';

    let userLat = null;
    let userLng = null;
    let radiusKm = null;

    if (hasLat || hasLng) {
      userLat = Number(req.query.lat);
      userLng = Number(req.query.lng);
      if (
        Number.isNaN(userLat) ||
        Number.isNaN(userLng) ||
        userLat < -90 ||
        userLat > 90 ||
        userLng < -180 ||
        userLng > 180
      ) {
        return res.status(400).json({ error: 'Coordinate lat/lng non valide.' });
      }
    }

    if (hasRadius) {
      radiusKm = Number(req.query.radius_km);
      if (Number.isNaN(radiusKm) || radiusKm <= 0) {
        return res.status(400).json({ error: 'Parametro radius_km deve essere un numero positivo.' });
      }
    }

    const conditions = [];
    const params = [];

    if (comune) {
      conditions.push('LOWER(p.comune) LIKE LOWER(?)');
      params.push(`%${comune}%`);
    }

    if (type === 'farmacia' || type === 'parafarmacia') {
      conditions.push('p.type = ?');
      params.push(type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db.prepare(`
      SELECT
        p.id,
        p.ministry_code,
        p.name,
        p.type,
        p.address,
        p.comune,
        p.provincia,
        p.cap,
        p.lat,
        p.lng,
        p.district_id,
        COALESCE(d.asl_name, d2.asl_name) AS asl_name,
        COALESCE(d.district_name, d2.district_name) AS district_name,
        COALESCE(d.district_code, d2.district_code) AS district_code
      FROM pharmacies p
      LEFT JOIN districts d ON d.id = p.district_id
      LEFT JOIN districts d2 ON p.district_id IS NULL AND LOWER(d2.comune) = LOWER(p.comune)
      ${whereClause}
      ORDER BY p.comune ASC, p.name ASC
    `).all(...params);

    let pharmacies = rows.map((row) => {
      let distanceKm = null;
      if (
        userLat !== null &&
        userLng !== null &&
        typeof row.lat === 'number' &&
        typeof row.lng === 'number'
      ) {
        distanceKm = calculateHaversineKm(userLat, userLng, row.lat, row.lng);
      }
      return {
        ...row,
        distance_km: distanceKm
      };
    });

    if (userLat !== null && userLng !== null) {
      if (radiusKm !== null) {
        pharmacies = pharmacies.filter(
          (p) => typeof p.distance_km === 'number' && p.distance_km <= radiusKm
        );
      }
      pharmacies.sort((a, b) => {
        if (a.distance_km === null) return 1;
        if (b.distance_km === null) return -1;
        return a.distance_km - b.distance_km;
      });
    }

    res.json({
      count: pharmacies.length,
      pharmacies
    });
  } catch (err) {
    next(err);
  }
});

function resolveLocalPugliaGeocode(db, query) {
  const cleaned = query
    .toLowerCase()
    .replace(/,\s*(puglia|italia|italy|ba|le|ta|fg|br|bt)\b/gi, '')
    .trim();

  // 1. Ricerca diretta nel dizionario dei Comuni pugliesi
  if (PUGLIA_MUNICIPALITIES_COORDS[cleaned]) {
    return {
      ...PUGLIA_MUNICIPALITIES_COORDS[cleaned],
      source: 'local-puglia'
    };
  }

  for (const [key, coords] of Object.entries(PUGLIA_MUNICIPALITIES_COORDS)) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return {
        ...coords,
        source: 'local-puglia'
      };
    }
  }

  // 2. Ricerca per indirizzo, CAP o Comune tra i presidi nel database SQLite
  const likeTerm = `%${cleaned}%`;
  const row = db.prepare(`
    SELECT name, address, comune, provincia, cap, lat, lng
    FROM pharmacies
    WHERE lat IS NOT NULL AND lng IS NOT NULL
      AND (
        LOWER(comune) LIKE LOWER(?)
        OR LOWER(address) LIKE LOWER(?)
        OR LOWER(name) LIKE LOWER(?)
        OR COALESCE(cap, '') LIKE ?
      )
    LIMIT 1
  `).get(likeTerm, likeTerm, likeTerm, likeTerm);

  if (row) {
    return {
      lat: Number(row.lat),
      lng: Number(row.lng),
      display_name: `${row.address}, ${row.comune} (${row.provincia}), Puglia, Italia`,
      source: 'local-db'
    };
  }

  return null;
}

// GET /api/geocode?q=...
router.get('/geocode', async (req, res, next) => {
  try {
    const db = getDb();
    ensureReferenceData(db);

    const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!rawQuery) {
      return res.status(400).json({ error: "Il parametro di ricerca 'q' è obbligatorio." });
    }

    const userAgent =
      process.env.NOMINATIM_USER_AGENT || 'PharmaPugliaOpenCare/1.0 (progetto-accademico-mmqs)';
    const searchQuery = /puglia|italia/i.test(rawQuery)
      ? rawQuery
      : `${rawQuery}, Puglia, Italia`;

    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
    nominatimUrl.searchParams.set('format', 'json');
    nominatimUrl.searchParams.set('limit', '1');
    nominatimUrl.searchParams.set('countrycodes', 'it');
    nominatimUrl.searchParams.set('q', searchQuery);

    let nominatimResult = null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const response = await fetch(nominatimUrl.toString(), {
        headers: {
          'User-Agent': userAgent,
          'Accept-Language': 'it'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const payload = await response.json();
        if (Array.isArray(payload) && payload.length > 0) {
          nominatimResult = {
            lat: Number(payload[0].lat),
            lng: Number(payload[0].lon),
            display_name: payload[0].display_name,
            source: 'nominatim'
          };
        }
      }
    } catch (_networkErr) {
      // In caso di assenza di rete o timeout Nominatim, si passa al fallback locale Puglia
    }

    if (nominatimResult && !Number.isNaN(nominatimResult.lat) && !Number.isNaN(nominatimResult.lng)) {
      return res.json(nominatimResult);
    }

    const fallback = resolveLocalPugliaGeocode(db, rawQuery);
    if (fallback) {
      return res.json(fallback);
    }

    return res.status(404).json({
      error: "Nessuna località pugliese trovata per l'indirizzo o Comune specificato."
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
