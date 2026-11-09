/**
 * Single source of truth for every CV fact on the site.
 *
 * Rules (see spec, sections 4 and 5):
 * - Only facts from the CV. Nothing invented: no metrics, clients, dates or achievements.
 * - Personal data limited to name, city and email. Never phone, age or nationality.
 * - Every user-facing string has `en` and `pt` side by side.
 * - Components never hard-code CV text; they read it from here.
 *
 * Portuguese translations are drafts pending William's review before launch.
 */
import type { Chapter, CV, Job, Skill } from './types';

const chapters: readonly Chapter[] = [
  {
    id: 'hook',
    navLabel: { en: 'Intro', pt: 'Início' },
    title: { en: 'William Amaro Finardi', pt: 'William Amaro Finardi' },
  },
  {
    id: 'origins',
    navLabel: { en: 'Origins', pt: 'Origens' },
    title: { en: 'Origins', pt: 'Origens' },
  },
  {
    id: 'enterprise',
    navLabel: { en: 'Enterprise', pt: 'Corporativo' },
    title: { en: 'Into the enterprise', pt: 'No mundo corporativo' },
  },
  {
    id: 'energy',
    navLabel: { en: 'Energy', pt: 'Energia' },
    title: { en: 'Powering energy', pt: 'No setor de energia' },
  },
  {
    id: 'breadth',
    navLabel: { en: 'Breadth', pt: 'Versatilidade' },
    title: { en: 'Breadth', pt: 'Versatilidade' },
  },
  {
    id: 'now',
    navLabel: { en: 'Now', pt: 'Agora' },
    title: { en: 'Now', pt: 'Agora' },
  },
  {
    id: 'next',
    navLabel: { en: 'Next', pt: 'Próximo' },
    title: { en: 'Next: AI engineering', pt: 'Próximo passo: engenharia de IA' },
  },
  {
    id: 'toolbox',
    navLabel: { en: 'Toolbox', pt: 'Ferramentas' },
    title: { en: 'Toolbox', pt: 'Caixa de ferramentas' },
  },
  {
    id: 'contact',
    navLabel: { en: 'Contact', pt: 'Contato' },
    title: { en: "Let's talk", pt: 'Vamos conversar' },
  },
];

/** Newest first, as in the CV. */
const jobs: readonly Job[] = [
  {
    id: 'semantix',
    chapter: 'now',
    sector: 'cement',
    company: 'SEMANTIX',
    formerly: 'ATOS',
    project: 'VCIMENTOS / VPAR, CBA, Votorantim',
    start: { year: 2026, month: 3 },
    end: null,
    highlights: [
      {
        en: 'Develop and support applications using React, TypeScript, JavaScript (Angular), and C# in a team serving corporate clients.',
        pt: 'Desenvolvo e dou suporte a aplicações com React, TypeScript, JavaScript (Angular) e C# em uma equipe que atende clientes corporativos.',
      },
      {
        en: 'Respond rapidly to incidents and work with SQL Server databases.',
        pt: 'Respondo rapidamente a incidentes e trabalho com bancos de dados SQL Server.',
      },
      {
        en: 'Fix and optimize legacy systems, kiosks, and client applications in the cargo, trucks, and cement sector.',
        pt: 'Corrijo e otimizo sistemas legados, quiosques e aplicações de clientes no setor de cargas, caminhões e cimento.',
      },
    ],
    skills: ['react', 'typescript', 'javascript', 'angular', 'csharp', 'sqlserver', 'debugging'],
  },
  {
    id: 'atos-cemig-cpfl',
    chapter: 'energy',
    sector: 'energy',
    company: 'ATOS',
    project: 'CEMIG / CPFL',
    start: { year: 2025, month: 10 },
    end: { year: 2026, month: 3 },
    highlights: [
      {
        en: 'Supported the development team in corporate applications.',
        pt: 'Apoiei a equipe de desenvolvimento em aplicações corporativas.',
      },
      {
        en: 'Maintained production servers and processing queues.',
        pt: 'Mantive servidores de produção e filas de processamento.',
      },
      {
        en: 'Reviewed code and oversaw deployment processes for testing and production environments.',
        pt: 'Revisei código e supervisionei os processos de implantação nos ambientes de teste e produção.',
      },
      {
        en: 'Maintained the stability of critical infrastructure systems.',
        pt: 'Mantive a estabilidade de sistemas de infraestrutura críticos.',
      },
    ],
    skills: ['maintenance'],
  },
  {
    id: 'atos-alphaville',
    chapter: 'breadth',
    sector: 'corporate',
    company: 'ATOS',
    project: 'Alphaville',
    start: { year: 2025, month: 2 },
    end: { year: 2025, month: 9 },
    highlights: [
      {
        en: 'Developed and maintained legacy backend systems, fixed bugs, improved applications, and implemented new features.',
        pt: 'Desenvolvi e mantive sistemas backend legados, corrigi bugs, melhorei aplicações e implementei novas funcionalidades.',
      },
    ],
    skills: ['backend', 'maintenance', 'debugging'],
  },
  {
    id: 'atos-sodexo',
    chapter: 'breadth',
    sector: 'corporate',
    company: 'ATOS',
    project: 'Sodexo',
    start: { year: 2024, month: 10 },
    end: { year: 2025, month: 1 },
    highlights: [
      {
        en: 'Developed and maintained applications using Mendix, contributing to feature evolution and system improvements.',
        pt: 'Desenvolvi e mantive aplicações com Mendix, contribuindo para a evolução de funcionalidades e melhorias do sistema.',
      },
      {
        en: 'Collaborated with multidisciplinary teams.',
        pt: 'Colaborei com equipes multidisciplinares.',
      },
    ],
    skills: ['mendix', 'maintenance'],
  },
  {
    id: 'atos-cpfl',
    chapter: 'energy',
    sector: 'energy',
    company: 'ATOS',
    project: 'CPFL',
    start: { year: 2023, month: 6 },
    end: { year: 2024, month: 10 },
    highlights: [
      {
        en: 'Developed new backend application features and built a kiosk application using Xamarin.',
        pt: 'Desenvolvi novas funcionalidades de aplicações backend e construí uma aplicação de quiosque com Xamarin.',
      },
      {
        en: 'Integrated applications with corporate systems and used Azure DevOps and cloud tools.',
        pt: 'Integrei aplicações a sistemas corporativos e utilizei Azure DevOps e ferramentas de nuvem.',
      },
    ],
    skills: ['backend', 'xamarin', 'azuredevops', 'cloud'],
  },
  {
    id: 'atos-frontend',
    chapter: 'enterprise',
    company: 'ATOS',
    start: { year: 2023, month: 1 },
    end: { year: 2023, month: 6 },
    highlights: [
      {
        en: 'Developed frontends using JavaScript and React and integrated them with backend services and APIs.',
        pt: 'Desenvolvi frontends com JavaScript e React e os integrei a serviços de backend e APIs.',
      },
    ],
    skills: ['javascript', 'react'],
  },
  {
    id: 'atos-bradesco',
    chapter: 'enterprise',
    sector: 'banking',
    company: 'ATOS',
    project: 'Bradesco',
    start: { year: 2021, month: 11 },
    end: { year: 2023, month: 1 },
    highlights: [
      {
        en: 'Supported and maintained corporate data flows using enterprise integration tools.',
        pt: 'Dei suporte e mantive fluxos de dados corporativos usando ferramentas de integração empresarial.',
      },
      {
        en: 'Monitored systems and resolved issues.',
        pt: 'Monitorei sistemas e resolvi problemas.',
      },
    ],
    skills: ['maintenance', 'debugging'],
  },
  {
    id: 'novus',
    chapter: 'origins',
    sector: 'industrial',
    company: 'Novus Automação',
    role: { en: 'Intern / Tester / Developer', pt: 'Estagiário / Testador / Desenvolvedor' },
    start: { year: 2019, month: 10 },
    end: { year: 2021, month: 10 },
    highlights: [
      {
        en: 'Tested industrial products and software applications and assisted in developing internal tools.',
        pt: 'Testei produtos industriais e aplicações de software e auxiliei no desenvolvimento de ferramentas internas.',
      },
      {
        en: 'Created automation scripts and performed product data analysis.',
        pt: 'Criei scripts de automação e realizei análise de dados de produtos.',
      },
    ],
    skills: [],
  },
];

const skills: readonly Skill[] = [
  { id: 'csharp', group: 'languages', name: { en: 'C#', pt: 'C#' } },
  { id: 'javascript', group: 'languages', name: { en: 'JavaScript', pt: 'JavaScript' } },
  { id: 'typescript', group: 'languages', name: { en: 'TypeScript', pt: 'TypeScript' } },
  { id: 'react', group: 'frameworks', name: { en: 'React', pt: 'React' } },
  { id: 'angular', group: 'frameworks', name: { en: 'Angular', pt: 'Angular' } },
  { id: 'xamarin', group: 'frameworks', name: { en: 'Xamarin', pt: 'Xamarin' } },
  { id: 'mendix', group: 'frameworks', name: { en: 'Mendix', pt: 'Mendix' } },
  { id: 'rest', group: 'frameworks', name: { en: 'REST APIs', pt: 'APIs REST' } },
  { id: 'mvc', group: 'frameworks', name: { en: 'MVC architecture', pt: 'Arquitetura MVC' } },
  { id: 'sqlserver', group: 'frameworks', name: { en: 'SQL Server', pt: 'SQL Server' } },
  { id: 'azuredevops', group: 'frameworks', name: { en: 'Azure DevOps', pt: 'Azure DevOps' } },
  { id: 'cloud', group: 'frameworks', name: { en: 'Cloud services', pt: 'Serviços em nuvem' } },
  {
    id: 'oop',
    group: 'concepts',
    name: { en: 'Object-oriented programming', pt: 'Programação orientada a objetos' },
  },
  {
    id: 'backend',
    group: 'concepts',
    name: { en: 'Backend development', pt: 'Desenvolvimento backend' },
  },
  {
    id: 'architecture',
    group: 'concepts',
    name: { en: 'Software architecture', pt: 'Arquitetura de software' },
  },
  { id: 'debugging', group: 'concepts', name: { en: 'Debugging', pt: 'Depuração' } },
  {
    id: 'maintenance',
    group: 'concepts',
    name: { en: 'System maintenance', pt: 'Manutenção de sistemas' },
  },
  { id: 'agile', group: 'concepts', name: { en: 'Agile methodologies', pt: 'Metodologias ágeis' } },
];

export const cv: CV = {
  identity: {
    name: 'William Amaro Finardi',
    location: { en: 'Porto Alegre, RS, Brazil', pt: 'Porto Alegre, RS, Brasil' },
    emailParts: { userReversed: 'idranif.a.mailliw', domainReversed: 'moc.liamg' },
    links: {
      linkedin: 'https://www.linkedin.com/in/william-finardi-819b21b7/',
      github: 'https://github.com/Proxyturn',
    },
    cvPath: '/cv/William-Amaro-Finardi-CV.pdf',
  },
  role: { en: 'Software Developer', pt: 'Desenvolvedor de Software' },
  hook: {
    en: 'Seven years, five industries, one constant: software that keeps working.',
    pt: 'Sete anos, cinco setores, uma constante: software que continua funcionando.',
  },
  summary: [
    {
      en: 'Software Developer with professional experience in corporate environments, specializing in backend and full-stack development. Skilled in object-oriented programming, REST API development, and maintaining large-scale systems across industries such as energy, banking, and corporate services.',
      pt: 'Desenvolvedor de software com experiência profissional em ambientes corporativos, especializado em desenvolvimento backend e full-stack. Domínio de programação orientada a objetos, desenvolvimento de APIs REST e manutenção de sistemas de grande porte em setores como energia, bancário e serviços corporativos.',
    },
    {
      en: 'Experienced in implementing new features, troubleshooting production issues, and maintaining systems with a focus on code quality and application stability. Works with modern frameworks, cloud tools, and agile practices.',
      pt: 'Experiência na implementação de novas funcionalidades, na resolução de problemas em produção e na manutenção de sistemas com foco em qualidade de código e estabilidade das aplicações. Trabalha com frameworks modernos, ferramentas de nuvem e práticas ágeis.',
    },
    {
      en: 'Currently working with React, TypeScript, and C# in a team serving VCIMENTOS, CBA, and Votorantim. Solid foundation in backend architecture and enterprise systems development, enabling quick adaptation to Java-based environments. Pursuing postgraduate studies in AI Engineering.',
      pt: 'Atualmente trabalha com React, TypeScript e C# em uma equipe que atende VCIMENTOS, CBA e Votorantim. Base sólida em arquitetura backend e desenvolvimento de sistemas corporativos, o que permite rápida adaptação a ambientes baseados em Java. Cursando pós-graduação em Engenharia de IA.',
    },
  ],
  chapters,
  jobs,
  skills,
  education: [
    {
      id: 'ai-engineering',
      chapter: 'next',
      title: {
        en: 'Postgraduate Studies in AI Engineering',
        pt: 'Pós-graduação em Engenharia de IA',
      },
      institution: 'UNIPDS (Anhanguera)',
      graduated: null,
      inProgress: true,
      topics: [
        { en: 'AI fundamentals', pt: 'Fundamentos de IA' },
        { en: 'Large language models (LLMs)', pt: 'Modelos de linguagem de grande porte (LLMs)' },
        {
          en: 'Retrieval-augmented generation (RAG)',
          pt: 'Geração aumentada por recuperação (RAG)',
        },
        { en: 'Building AI agents', pt: 'Construção de agentes de IA' },
      ],
    },
    {
      id: 'computer-science',
      chapter: 'origins',
      title: { en: "Bachelor's in Computer Science", pt: 'Bacharelado em Ciência da Computação' },
      institution: 'UniRitter (Laureate International Universities)',
      graduated: { year: 2022, month: 6 },
      inProgress: false,
    },
  ],
  certifications: [
    {
      id: 'python',
      title: { en: 'Python Impressionador', pt: 'Python Impressionador' },
      hours: 180,
    },
    {
      id: 'acelera-pleno',
      title: { en: 'Acelera Atos Pleno', pt: 'Acelera Atos Pleno' },
      hours: 80,
    },
    { id: 'acelera-senior', title: { en: 'Acelera Senior', pt: 'Acelera Senior' }, hours: 120 },
    {
      id: 'desenvolvedor-io',
      title: {
        en: 'Desenvolvedor.IO: multiple backend-focused certifications',
        pt: 'Desenvolvedor.IO: diversas certificações com foco em backend',
      },
    },
    {
      id: 'cambridge',
      title: {
        en: 'English courses with Cambridge PET and FCE certifications',
        pt: 'Cursos de inglês com certificações Cambridge PET e FCE',
      },
    },
  ],
  spokenLanguages: [
    { id: 'pt', name: { en: 'Portuguese', pt: 'Português' }, fluency: 'native' },
    { id: 'en', name: { en: 'English', pt: 'Inglês' }, fluency: 'fluent' },
    { id: 'es', name: { en: 'Spanish', pt: 'Espanhol' }, fluency: 'basic' },
  ],
};
