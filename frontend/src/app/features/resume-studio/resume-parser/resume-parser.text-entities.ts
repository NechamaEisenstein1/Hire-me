import { ResumeEducation, ResumeExperience, ResumeProject } from './resume-parser.types';

export function extractExperience(lines: string[]): ResumeExperience[] {
  if (lines.length === 0) {
    return [];
  }

  const items: ResumeExperience[] = [];
  let current: ResumeExperience | null = null;

  for (const line of lines) {
    if (looksLikeExperienceHeader(line)) {
      if (current) {
        items.push(current);
      }
      current = parseExperienceHeader(line);
      continue;
    }

    if (!current) {
      continue;
    }

    if (looksLikePeriod(line) && !current.period) {
      current.period = line;
      continue;
    }

    if (line.startsWith('-') || line.startsWith('*')) {
      current.highlights.push(line.replace(/^[-*]\s*/, ''));
      continue;
    }

    if (current.highlights.length < 3 && line.length > 12) {
      current.highlights.push(line);
    }
  }

  if (current) {
    items.push(current);
  }

  return items.slice(0, 10);
}

export function extractProjects(lines: string[]): ResumeProject[] {
  return lines
    .map((line) => line.replace(/^[-*]\s*/, ''))
    .map((line) => {
      const [name, summary] = splitOnce(line, ':');
      const resolvedName = name.length > 2 ? name : line.slice(0, 40);
      const resolvedSummary = summary.length > 0 ? summary : line;
      return {
        name: resolvedName,
        summary: resolvedSummary,
        stack: inferStack(resolvedSummary),
      };
    })
    .filter((project) => project.name.length > 1)
    .slice(0, 8);
}

export function extractEducation(lines: string[]): ResumeEducation[] {
  return lines
    .map((line) => line.replace(/^[-*]\s*/, ''))
    .filter((line) => /b\.sc|m\.sc|bachelor|master|degree|university|college|academy/i.test(line))
    .map((line) => {
      const [degree, school] = splitOnce(line, '-');
      return {
        degree: degree || 'Degree',
        school: school || 'School',
        period: extractPeriodFromLine(line),
      };
    })
    .slice(0, 6);
}

export function inferExperienceFromGeneralLines(lines: string[]): ResumeExperience[] {
  return lines
    .filter((line) => looksLikeExperienceHeader(line))
    .slice(0, 4)
    .map((line) => parseExperienceHeader(line));
}

export function inferProjectsFromGeneralLines(lines: string[]): ResumeProject[] {
  return lines
    .filter((line) => /project|platform|application|system/i.test(line))
    .slice(0, 3)
    .map((line, index) => ({
      name: `Project ${index + 1}`,
      summary: line,
      stack: inferStack(line),
    }));
}

export function inferEducationFromGeneralLines(lines: string[]): ResumeEducation[] {
  return lines
    .filter((line) => /university|college|bachelor|master|degree/i.test(line))
    .slice(0, 2)
    .map((line) => {
      const [degree, school] = splitOnce(line, '-');
      return {
        degree: degree || 'Degree',
        school: school || 'School',
        period: extractPeriodFromLine(line),
      };
    });
}

function parseExperienceHeader(line: string): ResumeExperience {
  const clean = line.replace(/^[-*]\s*/, '');
  const atParts = clean.split(/\sat\s/i);
  if (atParts.length === 2) {
    return {
      role: atParts[0].trim(),
      company: atParts[1].trim(),
      period: '',
      highlights: [],
    };
  }

  const dashParts = clean.split(' - ');
  if (dashParts.length === 2) {
    return {
      role: dashParts[0].trim(),
      company: dashParts[1].trim(),
      period: '',
      highlights: [],
    };
  }

  return {
    role: clean,
    company: 'Company',
    period: '',
    highlights: [],
  };
}

function looksLikeExperienceHeader(line: string): boolean {
  return (
    /\b(lead|senior|junior|engineer|developer|manager|architect|analyst|consultant)\b/i.test(line) &&
    (line.includes(' at ') || line.includes(' - ') || line.length < 90)
  );
}

function looksLikePeriod(line: string): boolean {
  return /(19|20)\d{2}|present|current|עד היום|\bjan\b|\bfeb\b|\bmar\b|\bapr\b|\bmay\b|\bjun\b|\bjul\b|\baug\b|\bsep\b|\boct\b|\bnov\b|\bdec\b/i.test(
    line,
  );
}

function extractPeriodFromLine(line: string): string {
  const match = line.match(/((19|20)\d{2}\s*[-–]\s*((19|20)\d{2}|present|current))/i);
  return match?.[1] ?? '';
}

function splitOnce(value: string, delimiter: string): [string, string] {
  const index = value.indexOf(delimiter);
  if (index < 0) {
    return [value.trim(), ''];
  }
  return [value.slice(0, index).trim(), value.slice(index + delimiter.length).trim()];
}

function inferStack(text: string): string[] {
  const known = ['Angular', 'TypeScript', 'Python', 'FastAPI', 'PostgreSQL', 'Docker', 'AWS'];
  const lower = text.toLowerCase();
  return known.filter((tech) => lower.includes(tech.toLowerCase()));
}
