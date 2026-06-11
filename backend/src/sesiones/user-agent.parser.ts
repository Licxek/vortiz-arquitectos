export interface ParsedUA {
  navegador: string;
  sistemaOperativo: string;
  dispositivo: string;
}

export function parseUserAgent(ua: string): ParsedUA {
  if (!ua) return { navegador: 'Desconocido', sistemaOperativo: 'Desconocido', dispositivo: 'Desconocido' };

  // Navegador
  let navegador = 'Otro';
  if (/Edg\//.test(ua)) navegador = 'Edge';
  else if (/OPR\//.test(ua) || /Opera/.test(ua)) navegador = 'Opera';
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) navegador = 'Chrome';
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) navegador = 'Safari';
  else if (/Firefox\//.test(ua)) navegador = 'Firefox';

  // Sistema operativo
  let sistemaOperativo = 'Otro';
  if (/Windows NT 10/.test(ua)) sistemaOperativo = 'Windows 10/11';
  else if (/Windows NT 6\.3/.test(ua)) sistemaOperativo = 'Windows 8.1';
  else if (/Windows NT 6\.2/.test(ua)) sistemaOperativo = 'Windows 8';
  else if (/Windows NT 6\.1/.test(ua)) sistemaOperativo = 'Windows 7';
  else if (/Mac OS X/.test(ua)) sistemaOperativo = 'macOS';
  else if (/Android/.test(ua)) sistemaOperativo = 'Android';
  else if (/(iPhone|iPad|iPod)/.test(ua)) sistemaOperativo = 'iOS';
  else if (/Linux/.test(ua)) sistemaOperativo = 'Linux';

  // Dispositivo
  let dispositivo = 'Computadora';
  if (/iPad/.test(ua)) dispositivo = 'iPad';
  else if (/iPhone/.test(ua)) dispositivo = 'iPhone';
  else if (/Android.*Mobile/.test(ua)) dispositivo = 'Móvil Android';
  else if (/Android/.test(ua)) dispositivo = 'Tablet Android';
  else if (/Mobile/.test(ua)) dispositivo = 'Móvil';

  return { navegador, sistemaOperativo, dispositivo };
}