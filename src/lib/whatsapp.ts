// Normaliza un teléfono venezolano a formato WhatsApp internacional (58XXXXXXXXXX).
export function aWhatsApp(tel: string): string | null {
  let d = tel.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "58" + d.slice(1);
  else if (d.length === 10 && d.startsWith("4")) d = "58" + d;
  return d.length >= 11 && d.length <= 15 ? d : null;
}

export function enlaceWhatsApp(numero: string, mensaje: string) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
