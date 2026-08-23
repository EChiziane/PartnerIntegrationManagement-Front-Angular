const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const src = 'C:/Users/Chiziane/Downloads/VPN_MVT_M-MOLA_PUSHUSSD_PartnerName_074613.xls';
const outDir = path.resolve('outputs/partner-form-template');
const out = path.join(outDir, 'VPN_MVT_M-MOLA_PUSHUSSD_PartnerName_074613_UPDATED.xlsx');

fs.mkdirSync(outDir, {recursive: true});

const wb = XLSX.readFile(src, {cellStyles: true});
const sheetName = 'IPSEC VPN Template';
const ws = wb.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(ws, {header: 1, blankrows: false, defval: ''});
const width = Math.max(...rows.map(row => row.length), 10);
const pad = row => Array.from({length: width}, (_, index) => row[index] ?? '');

const title = pad(rows[0] || []);
const description = pad(rows.find(row => String(row[0]).trim() === 'Description') || rows[1] || []);
const technicalStart = rows.findIndex(row => String(row[0]).trim() === 'Technical Contact Details');
const technicalRows = rows.slice(Math.max(technicalStart, 2)).map(pad);

const companyRows = [
  pad(['Company / Institution Details']),
  pad(['Company Name', '', '']),
  pad(['e-Mola Account (OTP)', '', '']),
  pad(['Representative Name', '', '']),
  pad(['Email Address', '', '']),
  pad(['Contact Phone Number', '', '']),
  pad(['Group Link', '', ''])
];

const nextRows = [title, description, ...companyRows, ...technicalRows];
const nextWs = XLSX.utils.aoa_to_sheet(nextRows);
nextWs['!cols'] = [
  {wch: 28},
  {wch: 30},
  {wch: 30},
  {wch: 12},
  {wch: 12},
  {wch: 12},
  {wch: 12},
  {wch: 18}
];
nextWs['!merges'] = [{s: {r: 2, c: 0}, e: {r: 2, c: 2}}];

wb.Sheets[sheetName] = nextWs;
XLSX.writeFile(wb, out, {bookType: 'xlsx'});
console.log(out);
