/**
 * Indian Numbering System Formatting & Parsing Utilities
 * Provides formatting for currency, text inputs, and calculator expressions (e.g. 1,00,000.50).
 */

/**
 * Formats a raw numeric string or number into Indian Numbering format (e.g. 1,00,000).
 * Preserves active decimal points and typing in progress (e.g. "1000." -> "1,000.").
 */
export const formatIndianAmount = (val: string | number | null | undefined): string => {
  if (val === null || val === undefined || val === '') return '';
  const str = String(val);
  // Keep digits and decimal point
  const clean = str.replace(/[^0-9.]/g, '');
  if (!clean) return '';

  const parts = clean.split('.');
  const intPart = parts[0];
  const decPart = parts.length > 1 ? `.${parts.slice(1).join('')}` : '';

  if (!intPart && decPart) return `0${decPart}`;
  if (!intPart) return '';

  const num = parseInt(intPart, 10);
  if (isNaN(num)) return '';

  const formattedInt = num.toLocaleString('en-IN');
  return `${formattedInt}${decPart}`;
};

/**
 * Parses an Indian formatted string (e.g. "1,00,000.50" or "₹ 1,00,000") into a raw number.
 */
export const parseIndianAmount = (val: string | number | null | undefined): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const clean = String(val).replace(/[^0-9.-]/g, '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

/**
 * Formats all numbers inside a mathematical/calculator expression with Indian commas.
 * e.g. "100000+50000" -> "1,00,000 + 50,000"
 */
export const formatExpressionWithIndianCommas = (expr: string | null | undefined): string => {
  if (!expr) return '';
  return expr.replace(/\b\d+(\.\d+)?\b/g, (match) => {
    const parts = match.split('.');
    const intPart = parts[0];
    const decPart = parts.length > 1 ? `.${parts[1]}` : '';
    const num = parseInt(intPart, 10);
    return isNaN(num) ? match : `${num.toLocaleString('en-IN')}${decPart}`;
  });
};

/**
 * Formats a number with Indian currency symbol and commas (e.g. ₹1,00,000.00).
 */
export const formatCurrencyINR = (
  val: number | string | null | undefined,
  showSymbol: boolean = true,
  maxDecimals: number = 2
): string => {
  if (val === null || val === undefined || val === '') return showSymbol ? '₹0' : '0';
  const num = typeof val === 'number' ? val : parseIndianAmount(val);
  if (isNaN(num)) return showSymbol ? '₹0' : '0';

  const symbol = showSymbol ? '₹' : '';
  return `${symbol}${num.toLocaleString('en-IN', {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: 0,
  })}`;
};
