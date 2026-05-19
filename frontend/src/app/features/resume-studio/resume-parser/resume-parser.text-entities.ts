import { ResumeEducation, ResumeExperience, ResumeProject } from './resume-parser.types';

export function extractExperience(lines: string[]): ResumeExperience[] {
  if (lines.length === 0) return [];

  // Each block starts on a line matching "Company – Role | 2020 – 2024"
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (looksLikeEntryHeader(line) && current.length > 0) {
      blocks.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current);

  // Discard leading non-header lines — only keep blocks whose first line is a real header.
  const headerBlocks = blocks.filter((block) => looksLikeEntryHeader(block[0]));

  return headerBlocks
    .map((block) => {
      const [header, ...body] = block;
      const period = extractPeriodFromLine(header);
      // Strip the period and trailing separator chars to isolate "Company – Role" or "Role – Company"
      const headerText = header.replace(period, '').replace(/[\s|]+$/, '').trim();
      const parts = headerText.split(/\s+[\u2013\-]\s+/);
      return {
        role: parts[0].trim(),
        company: parts.slice(1).join(' \u2013 ').trim(),
        period,
        highlights: body
          .map((l) => l.replace(/^[-*]\s*/, '').trim())
          .filter((l) => l.length > 0),
      };
    })
    .filter((e) => e.role.length > 0)
    .slice(0, 10);
}

function looksLikeEntryHeader(line: string): boolean {
  const hasDate = /\b(19|20)\d{2}\b/.test(line);
  const hasSeparator = line.includes(' \u2013 ') || line.includes(' | ') || line.includes(' - ');
  return hasDate && hasSeparator;
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
  const period = extractPeriodFromLine(clean);
  const atParts = clean.split(/\sat\s/i);
  if (atParts.length === 2) {
    return {
      role: atParts[0].trim(),
      company: atParts[1].trim(),
      period,
      highlights: [],
    };
  }

  const dashParts = clean.split(' - ');
  if (dashParts.length === 2) {
    return {
      role: dashParts[0].trim(),
      company: dashParts[1].trim(),
      period,
      highlights: [],
    };
  }

  return {
    role: clean,
    company: 'Company',
    period,
    highlights: [],
  };
}

function looksLikeExperienceHeader(line: string): boolean {
  return (
    /\b(lead|senior|junior|engineer|developer|manager|architect|analyst|consultant)\b/i.test(line) &&
    (line.includes(' at ') || line.includes(' - ') || line.length < 90)
  );
}

function extractPeriodFromLine(line: string): string {
  const match = line.match(
    /((19|20)\d{2}\s*[-–]\s*((19|20)\d{2}|present|current|ongoing)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(19|20)\d{2}\s*[-–]\s*(?:present|current|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(19|20)\d{2}))/i,
  );
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
