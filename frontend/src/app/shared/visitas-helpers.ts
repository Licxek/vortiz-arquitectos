export function banderaPais(pais: string): string {
  const map: Record<string, string> = {
    Mexico: '🇲🇽',
    'United States': '🇺🇸',
    Spain: '🇪🇸',
    Colombia: '🇨🇴',
    Argentina: '🇦🇷',
    Chile: '🇨🇱',
    Peru: '🇵🇪',
    Venezuela: '🇻🇪',
    Ecuador: '🇪🇨',
    Brazil: '🇧🇷',
    Canada: '🇨🇦',
    France: '🇫🇷',
    Germany: '🇩🇪',
    'United Kingdom': '🇬🇧',
    Italy: '🇮🇹',
    Japan: '🇯🇵',
    China: '🇨🇳',
    India: '🇮🇳',
    Australia: '🇦🇺',
    Russia: '🇷🇺',
    Netherlands: '🇳🇱',
    Portugal: '🇵🇹',
    'South Korea': '🇰🇷',
    Indonesia: '🇮🇩',
    Philippines: '🇵🇭',
  };
  return map[pais] || '🌍';
}

export function labelPais(pais: string): string {
  const map: Record<string, string> = {
    Mexico: 'México',
    'United States': 'Estados Unidos',
    Spain: 'España',
    Brazil: 'Brasil',
    Canada: 'Canadá',
    France: 'Francia',
    Germany: 'Alemania',
    'United Kingdom': 'Reino Unido',
    Italy: 'Italia',
    Japan: 'Japón',
    Peru: 'Perú',
    Netherlands: 'Países Bajos',
    'South Korea': 'Corea del Sur',
    Russia: 'Rusia',
  };
  return map[pais] || pais;
}

export function colorDispositivo(tipo: string): string {
  const map: Record<string, string> = {
    mobile: '#9333ea',
    desktop: '#3b82f6',
    tablet: '#f59e0b',
  };
  return map[tipo.toLowerCase()] || '#6b7280';
}

export function iconoDispositivo(tipo: string): string {
  const map: Record<string, string> = {
    mobile: '📱',
    desktop: '🖥️',
    tablet: '📟',
  };
  return map[tipo.toLowerCase()] || '📊';
}

export function labelDispositivo(tipo: string): string {
  const map: Record<string, string> = {
    mobile: 'Móvil',
    desktop: 'Escritorio',
    tablet: 'Tablet',
  };
  return map[tipo.toLowerCase()] || tipo;
}

export function labelFuente(fuente: string): string {
  const map: Record<string, string> = {
    '(direct)': 'Tráfico directo',
    google: 'Google',
    bing: 'Bing',
    yahoo: 'Yahoo',
    duckduckgo: 'DuckDuckGo',
    'facebook.com': 'Facebook',
    'l.facebook.com': 'Facebook',
    'instagram.com': 'Instagram',
    'l.instagram.com': 'Instagram',
    'twitter.com': 'Twitter / X',
    't.co': 'Twitter / X',
    'linkedin.com': 'LinkedIn',
    'youtube.com': 'YouTube',
    whatsapp: 'WhatsApp',
  };
  return map[fuente] || fuente;
}

export function iconoFuente(fuente: string): string {
  if (fuente.includes('google')) return '🔍';
  if (fuente === '(direct)') return '🔗';
  if (fuente.includes('facebook')) return '📘';
  if (fuente.includes('instagram')) return '📷';
  if (fuente.includes('twitter') || fuente === 't.co') return '🐦';
  if (fuente.includes('linkedin')) return '💼';
  if (fuente.includes('youtube')) return '📺';
  if (fuente.includes('whatsapp')) return '💬';
  if (fuente.includes('bing')) return '🔎';
  return '🌐';
}
