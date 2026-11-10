import type { Dictionary } from './types';

/** Portuguese (Brazil) UI strings. Draft translations pending William's review. */
export const ptBR: Dictionary = {
  meta: {
    title: 'William Amaro Finardi · Desenvolvedor de Software',
    description:
      'Desenvolvedor de software de Porto Alegre. Desenvolvimento backend e full-stack em sistemas bancários, de energia e corporativos; atualmente cursando Engenharia de IA.',
  },
  a11y: {
    skipToContent: 'Pular para o conteúdo',
    chapterNav: 'Capítulos',
    readingProgress: 'Progresso de leitura',
    opensInNewTab: '(abre em uma nova aba)',
  },
  language: {
    groupLabel: 'Idioma',
    english: 'English',
    portuguese: 'Português',
  },
  story: {
    role: 'Cargo',
    skillsUsed: 'Habilidades usadas',
    education: 'Formação',
    certifications: 'Cursos e certificações',
    spokenLanguages: 'Idiomas',
    skillPrompt: 'Escolha uma habilidade para ver onde ela foi usada.',
    skillUsedIn: 'Usada em',
    skillNoJob:
      'Faz parte do conjunto geral de habilidades; não está ligada a um cargo específico do currículo.',
    inProgress: 'Em andamento',
    graduated: 'Formado em {date}',
    hours: '{hours} horas',
    skillGroups: {
      languages: 'Linguagens',
      frameworks: 'Frameworks e tecnologias',
      concepts: 'Conceitos',
    },
    fluency: {
      native: 'Nativo',
      fluent: 'Fluente',
      basic: 'Básico',
    },
  },
  contact: {
    intro: 'Envie uma mensagem ou fale comigo pelo LinkedIn ou GitHub.',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    downloadCv: 'Baixar currículo (PDF)',
    revealEmail: 'Mostrar endereço de email',
    emailLabel: 'Email',
    form: {
      legend: 'Formulário de contato',
      name: 'Nome',
      email: 'Seu email',
      subject: 'Assunto (opcional)',
      message: 'Mensagem',
      honeypot: 'Deixe este campo vazio',
      submit: 'Enviar mensagem',
      sending: 'Enviando…',
      success: 'Obrigado! Sua mensagem foi enviada.',
      error:
        'Desculpe, não foi possível enviar a mensagem. Tente novamente mais tarde ou use o email.',
      rateLimited: 'Muitas mensagens. Tente novamente mais tarde.',
    },
    errors: {
      required: 'Este campo é obrigatório.',
      email: 'Informe um endereço de email válido.',
      tooLong: 'Use no máximo {max} caracteres.',
      lineBreaks: 'Quebras de linha não são permitidas aqui.',
    },
  },
  footer: {
    rights: '© {year} William Amaro Finardi. Todos os direitos reservados.',
  },
  /** Worlds concept (concept/worlds branch only). First PT option, as approved. */
  worlds: {
    title: 'Seis distritos, um desenvolvedor',
    hint: 'Role para viajar ou escolha um prédio para explorar',
    startExploring: 'Comece a explorar',
    worldMap: 'Mapa do mundo',
    backToMap: 'Voltar ao mapa',
    youAreHere: 'Você está aqui',
    districts: {
      industrial: 'Distrito industrial',
      banking: 'Distrito bancário',
      betweenWorlds: 'Entre mundos',
      energy: 'Distrito de energia',
      corporate: 'Distrito corporativo',
      cement: 'Distrito de cimento, cargas e caminhões',
      ai: 'Fronteira da IA',
      workshop: 'Oficina',
      postOffice: 'Correio',
    },
    /** Map labels approved by William on 2026-11-10 (with the spike). */
    mapLabels: {
      betweenWorldsAtos: 'Entre mundos · ATOS',
      computerScience: 'Ciência da Computação · UniRitter',
    },
  },
};
