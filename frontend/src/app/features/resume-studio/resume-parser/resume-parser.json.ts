import { JsonInput, ParsedResume } from './resume-parser.types';

export function parseJsonResume(content: string): ParsedResume {
  const parsed = JSON.parse(content) as JsonInput;

  const experience = (parsed.experience ?? []).map((item) => ({
    role: item.role ?? 'Role',
    company: item.company ?? 'Company',
    period: item.period ?? formatPeriod(item.start, item.end),
    highlights: item.highlights ?? [],
  }));

  const projects = (parsed.projects ?? []).map((item) => ({
    name: item.name ?? 'Project',
    summary: item.summary ?? '',
    stack: item.stack ?? [],
  }));

  const education = (parsed.education ?? []).map((item) => ({
    degree: item.degree ?? 'Degree',
    school: item.school ?? 'School',
    period: item.period ?? formatPeriod(item.start, item.end),
  }));

  const skills = (parsed.skills ?? [])
    .map((skill) => (typeof skill === 'string' ? skill : skill.name ?? ''))
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 0);

  return {
    name: parsed.basics?.name ?? 'Your Name',
    title: parsed.basics?.title ?? 'Your Title',
    location: parsed.basics?.location ?? 'Location',
    email: parsed.basics?.email ?? 'email@example.com',
    summary: parsed.basics?.summary ?? 'Add a short professional summary.',
    skills,
    experience,
    projects,
    education,
  };
}

function formatPeriod(start?: string, end?: string): string {
  if (!start && !end) {
    return '';
  }

  return `${start ?? '?'} - ${end ?? 'Present'}`;
}
