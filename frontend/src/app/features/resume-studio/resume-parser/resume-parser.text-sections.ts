import { ResumeSections } from './resume-parser.types';

export function normalizeLines(content: string): string[] {
  return content
    .replace(/\r/g, '\n')
    .split('\n')
    .flatMap((line) => line.split(/\s{3,}/))
    .map((line) => line.replace(/[\u2022\u25cf]/g, '-').trim())
    .map((line) => line.replace(/\s+/g, ' '))
    .filter((line) => line.length > 1);
}

export function splitIntoSections(lines: string[]): ResumeSections {
  const sections: ResumeSections = {
    intro: [],
    summary: [],
    skills: [],
    experience: [],
    projects: [],
    education: [],
  };

  const headingMap: Record<string, keyof ResumeSections> = {
    summary: 'summary',
    profile: 'summary',
    'about me': 'summary',
    'work experience': 'experience',
    'professional experience': 'experience',
    'relevant experience': 'experience',
    'career experience': 'experience',
    experience: 'experience',
    employment: 'experience',
    'employment history': 'experience',
    skills: 'skills',
    'technical skills': 'skills',
    'core skills': 'skills',
    competencies: 'skills',
    toolkit: 'skills',
    technologies: 'skills',
    projects: 'projects',
    'selected projects': 'projects',
    education: 'education',
    'academic background': 'education',
    'professional summary': 'summary',
    'ניסיון': 'experience',
    'השכלה': 'education',
    'כישורים': 'skills',
    'פרויקטים': 'projects',
    'סיכום': 'summary',
    'פרופיל': 'summary',
  };

  let current: keyof ResumeSections = 'intro';
  for (const line of lines) {
    const normalized = line.toLowerCase().replace(/[:|]/g, '').trim();
    const heading = Object.keys(headingMap).find(
      (candidate) => normalized === candidate || normalized.startsWith(`${candidate} `),
    );

    if (heading && normalized.split(' ').length <= 4) {
      current = headingMap[heading];
      continue;
    }

    sections[current].push(line);
  }

  return sections;
}

export function extractEmail(lines: string[]): string | undefined {
  const match = lines.join(' ').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0];
}

export function extractName(intro: string[]): string {
  const candidate = intro.find((line) => /^[A-Za-z][A-Za-z\s'.-]{2,50}$/.test(line));
  return candidate ?? intro[0] ?? 'Your Name';
}

export function extractTitle(intro: string[]): string {
  const titleKeywords = /(engineer|developer|architect|manager|designer|lead|director|analyst|consultant)/i;
  const candidate = intro.find((line) => titleKeywords.test(line));
  return candidate ?? intro[1] ?? 'Professional Title';
}

export function extractLocation(intro: string[]): string {
  const locationCandidate = intro.find(
    (line) =>
      !line.includes('@') &&
      /\b(israel|tel aviv|haifa|jerusalem|remote|usa|uk|europe)\b/i.test(line),
  );
  return locationCandidate ?? 'Location';
}

export function extractSkills(skillLines: string[], allLines: string[]): string[] {
  const fromSection = skillLines
    .flatMap((line) => line.split(/[;,|/]/))
    .map((item) => item.replace(/^[-*]\s*/, '').trim())
    .filter((item) => item.length > 1 && item.length < 50);

  const known = [
    'Angular',
    'Angular Material',
    'TypeScript',
    'JavaScript',
    'HTML',
    'CSS',
    'Tailwind CSS',
    'RxJS',
    'Python',
    'FastAPI',
    'Django',
    'Flask',
    'SQLAlchemy',
    'PostgreSQL',
    'MySQL',
    'SQLite',
    'MongoDB',
    'Docker',
    'Kubernetes',
    'Terraform',
    'AWS',
    'GCP',
    'Azure',
    'GraphQL',
    'Node.js',
    'React',
    'Redis',
    'WebSocket',
    'REST API',
    'JWT',
    'CI/CD',
    'Git',
    'GitHub',
    'Pytest',
    'Three.js',
    'GSAP',
  ];

  const blob = allLines.join(' ').toLowerCase();
  const inferred = known.filter((skill) => matchesSkill(blob, skill));

  const implied: Array<{ pattern: RegExp; skill: string }> = [
    { pattern: /\bpull requests?\b|\bcode reviews?\b/, skill: 'Code Review' },
    { pattern: /\bunit tests?\b|\btest automation\b/, skill: 'Automated Testing' },
    { pattern: /\bmicroservices?\b/, skill: 'Microservices' },
    { pattern: /\bapi\b.*\bdesign\b|\brestful\b/, skill: 'API Design' },
    { pattern: /\brealtime\b|\bwebsocket\b/, skill: 'Real-time Systems' },
    { pattern: /\bdeploy\b|\bdeployment\b|\bcontainer\b/, skill: 'DevOps' },
    { pattern: /\bauth\b|\bauthorization\b|\bauthentication\b/, skill: 'Authentication' },
    { pattern: /\banalytics\b|\btracking\b/, skill: 'Analytics' },
  ];

  const impliedSkills = implied
    .filter((entry) => entry.pattern.test(blob))
    .map((entry) => entry.skill);

  return uniquePreserveOrder([...fromSection, ...inferred, ...impliedSkills]).slice(0, 32);
}

function matchesSkill(blob: string, skill: string): boolean {
  const normalized = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|[^a-z0-9+.#-])${normalized}([^a-z0-9+.#-]|$)`, 'i');
  return pattern.test(blob);
}

function uniquePreserveOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const normalized = item.trim();
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }

  return result;
}
