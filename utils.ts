
/**
 * Utilitários para manipulação de datas evitando problemas de fuso horário.
 * O problema ocorre porque 'new Date("YYYY-MM-DD")' é interpretado como UTC,
 * o que pode resultar no dia anterior quando exibido em fusos horários ocidentais.
 */

/**
 * Converte uma string de data (YYYY-MM-DD) e opcionalmente uma de hora (HH:mm)
 * em um objeto Date local, garantindo que o dia permaneça o mesmo.
 */
export const parseLocalDate = (dateStr: string, timeStr?: string): Date => {
  if (!dateStr) return new Date();
  
  // Extrair apenas a parte da data se for um ISO string (YYYY-MM-DD)
  // Lidamos com YYYY-MM-DD, YYYY/MM/DD ou ISO completo
  const onlyDate = dateStr.split('T')[0].split(' ')[0];
  const normalizedDate = onlyDate.replace(/\//g, '-');
  const parts = normalizedDate.split('-');
  
  // Se não tiver 3 partes, tenta o fallback padrão mas com cuidado
  if (parts.length !== 3) {
    const d = new Date(dateStr);
    // Se a data for inválida, retorna hoje
    if (isNaN(d.getTime())) return new Date();
    return d;
  }
  
  // Assumimos YYYY-MM-DD se a primeira parte tiver 4 dígitos
  // Caso contrário, tentamos detectar se é DD-MM-YYYY
  let year, month, day;
  if (parts[0].length === 4) {
    [year, month, day] = parts.map(Number);
  } else {
    [day, month, year] = parts.map(Number);
  }
  
  if (timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes || 0, 0);
  }
  
  // Criamos ao meio-dia para evitar problemas de borda de fuso horário em cálculos de "dia da semana"
  return new Date(year, month - 1, day, 12, 0, 0);
};

/**
 * Formata uma string de data YYYY-MM-DD para DD/MM/YYYY sem usar o objeto Date,
 * evitando qualquer interferência de fuso horário.
 */
export const formatDisplayDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  // Remove tempo se houver (T ou espaço)
  const onlyDate = dateStr.split('T')[0].split(' ')[0];
  const parts = onlyDate.replace(/\//g, '-').split('-');
  if (parts.length !== 3) return dateStr;
  
  let year, month, day;
  if (parts[0].length === 4) {
    [year, month, day] = parts;
  } else {
    [day, month, year] = parts;
  }
  
  return `${day}/${month}/${year}`;
};

/**
 * Obtém o nome do mês a partir de uma string de data
 */
export const getMonthName = (dateStr: string): string => {
  const date = parseLocalDate(dateStr);
  const month = date.toLocaleDateString('pt-BR', { month: 'long' });
  const year = date.getFullYear();
  return `${month} de ${year}`;
};

/**
 * Obtém o nome curto do mês a partir de uma string de data
 */
export const getShortMonthName = (dateStr: string): string => {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
};

/**
 * Obtém o dia do mês a partir de uma string de data
 */
export const getDayOfMonth = (dateStr: string): number => {
  const onlyDate = dateStr.split('T')[0].split(' ')[0];
  const parts = onlyDate.replace(/\//g, '-').split('-');
  if (parts.length !== 3) return new Date().getDate();
  
  // Se o primeiro for o ano (4 dígitos)
  if (parts[0].length === 4) {
    return parseInt(parts[2], 10);
  } else {
    // Se o primeiro for o dia
    return parseInt(parts[0], 10);
  }
};

/**
 * Obtém o dia da semana a partir de uma string YYYY-MM-DD
 */
export const getDayOfWeek = (dateStr: string): string => {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const date = parseLocalDate(dateStr);
  return days[date.getDay()];
};

/**
 * Converte uma URL de vídeo (YouTube, Vimeo) para o formato de embed.
 */
export const getVideoEmbedUrl = (url: string): string => {
  if (!url) return '';

  // YouTube
  const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/);
  if (ytMatch && ytMatch[1]) {
    const id = ytMatch[1].split('&')[0];
    return `https://www.youtube.com/embed/${id}`;
  }

  // Vimeo
  const vimeoMatch = url.match(/(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(.+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return url;
};
