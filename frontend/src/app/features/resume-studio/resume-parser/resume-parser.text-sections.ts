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

export function extractSkills(skillLines: string[]): string[] {
  const proficiency = new Set([
    'native', 'fluent', 'basic', 'intermediate', 'advanced', 'proficient', 'bilingual',
  ]);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of skillLines) {
    for (const raw of line.split(/[;,|/]/)) {
      const stripped = raw.replace(/^[-*]\s*/, '').trim();
      // "Category: Skill" → keep suffix. "English: native" → suffix is proficiency, keep prefix instead.
      const colon = stripped.indexOf(':');
      let item: string;
      if (colon >= 0) {
        const suffix = stripped.slice(colon + 1).trim();
        item = proficiency.has(suffix.toLowerCase()) ? stripped.slice(0, colon).trim() : suffix;
      } else {
        item = stripped;
      }
      if (item.length > 1 && item.length < 50 && !proficiency.has(item.toLowerCase())) {
        const key = item.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          result.push(item);
        }
      }
    }
  }

  return result;
}
