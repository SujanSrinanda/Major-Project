export interface ParsedQRData {
  name: string;
  phone: string;
  vpa?: string;
  amount?: number;
  note?: string;
  rawPayload: string;
}

/**
 * Parses raw decoded QR string (UPI URI, JSON, VPA string, or text)
 */
export function parseQRCodePayload(payload: string): ParsedQRData {
  if (!payload) {
    return {
      name: 'Unknown Recipient',
      phone: '+91 98765 00000',
      rawPayload: '',
    };
  }

  const trimmed = payload.trim();

  // 1. UPI URI scheme: upi://pay?pa=...&pn=...&am=...
  if (trimmed.toLowerCase().startsWith('upi://') || trimmed.toLowerCase().includes('pa=')) {
    try {
      const queryStr = trimmed.includes('?') ? trimmed.split('?')[1] : trimmed;
      const params = new URLSearchParams(queryStr);

      const pa = params.get('pa') || '';
      const pn = params.get('pn') ? decodeURIComponent(params.get('pn')!) : '';
      const amRaw = params.get('am');
      const am = amRaw ? parseFloat(amRaw) : undefined;
      const tn = params.get('tn') ? decodeURIComponent(params.get('tn')!) : '';

      const cleanName = pn.trim() || (pa.includes('@') ? pa.split('@')[0] : pa) || 'Scanned UPI Payee';
      const cleanPhone = pa || '+91 98765 00000';

      return {
        name: cleanName,
        phone: cleanPhone,
        vpa: pa || undefined,
        amount: am && !isNaN(am) ? am : undefined,
        note: tn || undefined,
        rawPayload: trimmed,
      };
    } catch {
      // Fall through to other checks
    }
  }

  // 2. JSON Format
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        name: parsed.name || parsed.payee || parsed.recipient || 'Scanned Recipient',
        phone: parsed.phone || parsed.vpa || parsed.upiId || '+91 98765 00000',
        vpa: parsed.vpa || parsed.upiId,
        amount: parsed.amount ? Number(parsed.amount) : undefined,
        note: parsed.note,
        rawPayload: trimmed,
      };
    } catch {
      // Fall through
    }
  }

  // 3. VPA Format: e.g. "rahul@upi" or "rahul@icici"
  if (trimmed.includes('@')) {
    const parts = trimmed.split(/[\s|,]+/);
    const vpaPart = parts.find((p) => p.includes('@')) || trimmed;
    const namePart = parts.filter((p) => !p.includes('@')).join(' ');

    return {
      name: namePart.trim() || vpaPart.split('@')[0] || 'VPA Recipient',
      phone: vpaPart,
      vpa: vpaPart,
      rawPayload: trimmed,
    };
  }

  // 4. Standard Phone / Text
  return {
    name: trimmed.length > 30 ? `${trimmed.substring(0, 30)}...` : trimmed,
    phone: trimmed.startsWith('+') ? trimmed : `+91 ${trimmed}`,
    rawPayload: trimmed,
  };
}
