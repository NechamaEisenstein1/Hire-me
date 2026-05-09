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
    experience: 'experience',
    employment: 'experience',
    skills: 'skills',
    technologies: 'skills',
    projects: 'projects',
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
    .join(',')
    .split(/[;,|/]/)
    .map((item) => item.replace(/^[-*]\s*/, '').trim())
    .filter((item) => item.length > 1 && item.length < 40);

  const known = [
    'Angular',
    'TypeScript',
    'JavaScript',
    'Python',
    'FastAPI',
    'Django',
    'PostgreSQL',
    'MySQL',
    'MongoDB',
    'Docker',
    'Kubernetes',
    'AWS',
    'GCP',
    'Azure',
    'GraphQL',
    'Node.js',
    'React',
    'Redis',
  ];

  const blob = allLines.join(' ').toLowerCase();
  const inferred = known.filter((skill) => blob.includes(skill.toLowerCase()));
  return uniquePreserveOrder([...fromSection, ...inferred]).slice(0, 24);
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
