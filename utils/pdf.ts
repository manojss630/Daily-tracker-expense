import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { ExpenseRecord, ExpenseItem, Profile } from '@/types';
import { formatCurrency, formatDateLong } from './format';

export function generateExpensePDF(
  record: ExpenseRecord,
  items: ExpenseItem[],
  profile: Profile | null
): Promise<string> {
  const html = buildExpenseHTML(record, items, profile);
  return Print.printToFileAsync({ html }).then((result) => result.uri);
}

function buildExpenseHTML(
  record: ExpenseRecord,
  items: ExpenseItem[],
  profile: Profile | null
): string {
  const rows = items
    .map(
      (item, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${escapeHtml(item.expense_name)}</td>
        <td class="cat">${escapeHtml(item.category || 'Other')}</td>
        <td class="amt">${formatCurrency(item.amount)}</td>
      </tr>`
    )
    .join('');

  const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Expense Statement</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    color: #1e293b;
    background: #ffffff;
    padding: 40px 30px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 3px solid #2d8a76;
    padding-bottom: 20px;
    margin-bottom: 30px;
  }
  .logo {
    font-size: 26px;
    font-weight: 800;
    color: #2d8a76;
    letter-spacing: -0.5px;
  }
  .logo-sub {
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
  }
  .doc-title {
    font-size: 14px;
    color: #475569;
    text-align: right;
    line-height: 1.5;
  }
  .doc-title strong {
    font-size: 18px;
    color: #1e293b;
    display: block;
  }
  .section {
    margin-bottom: 25px;
  }
  .person-box {
    background: #f8fafc;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
  }
  .person-box .field {
    flex: 1;
    min-width: 200px;
  }
  .person-box label {
    font-size: 11px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .person-box .value {
    font-size: 16px;
    color: #1e293b;
    font-weight: 600;
    margin-top: 3px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 25px;
  }
  thead th {
    background: #2d8a76;
    color: #fff;
    padding: 12px 15px;
    font-size: 13px;
    text-align: left;
    font-weight: 600;
  }
  thead th.amt { text-align: right; }
  thead th.num { width: 40px; text-align: center; }
  thead th.cat { width: 120px; }
  tbody td {
    padding: 11px 15px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 14px;
  }
  tbody td.num { text-align: center; color: #94a3b8; }
  tbody td.amt { text-align: right; font-weight: 600; }
  tbody td.cat { color: #64748b; font-size: 13px; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  .total-row {
    background: #f0fdf4 !important;
  }
  .total-row td {
    border-top: 2px solid #2d8a76;
    border-bottom: none;
    padding: 16px 15px;
    font-size: 18px;
    font-weight: 800;
    color: #18564c;
  }
  .total-row td.amt { font-size: 22px; }
  .footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #94a3b8;
  }
  .footer .generated-by {
    font-weight: 600;
    color: #475569;
  }
  @media print {
    body { padding: 20px; }
  }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">SSDM ExpenseBook</div>
      <div class="logo-sub">Expense Management</div>
    </div>
    <div class="doc-title">
      <strong>EXPENSE STATEMENT</strong>
      Doc #: ${record.id.slice(0, 8).toUpperCase()}
    </div>
  </div>

  <div class="section">
    <div class="person-box">
      <div class="field">
        <label>Person</label>
        <div class="value">${escapeHtml(record.person_name)}</div>
      </div>
      ${record.person_phone ? `
      <div class="field">
        <label>Phone</label>
        <div class="value">${escapeHtml(record.person_phone)}</div>
      </div>` : ''}
      <div class="field">
        <label>Date</label>
        <div class="value">${formatDateLong(record.record_date)}</div>
      </div>
      ${record.location ? `
      <div class="field">
        <label>Location</label>
        <div class="value">${escapeHtml(record.location)}</div>
      </div>` : ''}
    </div>
    ${record.description ? `<p style="margin-top:12px;font-size:14px;color:#475569;">${escapeHtml(record.description)}</p>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>Expense</th>
        <th class="cat">Category</th>
        <th class="amt">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="3">TOTAL</td>
        <td class="amt">${formatCurrency(total)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div>
      <span class="generated-by">Generated by: ${escapeHtml(profile?.full_name || 'SSDM ExpenseBook User')}</span>
    </div>
    <div>
      Generated on: ${formatDateLong(new Date())}
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sharePDF(uri: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.open(uri, '_blank');
    return;
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Share Expense PDF',
    UTI: 'com.adobe.pdf',
  });
}


