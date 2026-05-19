import { JsonInput, ParsedResume } from './resume-parser.types';

const REQUIRED_RESUME_SCHEMA_HINT =
  "Required JSON fields: 'skills' and 'experience'. Include explicitly listed skills plus implied technical skills evidenced in project/experience text (e.g., APIs, CI/CD, testing, cloud, containers). Include at least one professional experience entry with role/company/period or descriptive highlights.";

export function parseJsonResume(content: string): ParsedResume {
  let parsed: JsonInput;
  try {
    parsed = JSON.parse(content) as JsonInput;
  } catch {
    throw new Error('Invalid JSON: the file could not be parsed. Please ensure it is valid JSON matching the expected resume structure.');
  }

  validateRequiredResumeFields(parsed);

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

function validateRequiredResumeFields(parsed: JsonInput): void {
  const hasSkills = Array.isArray(parsed.skills);
  const hasExperience = Array.isArray(parsed.experience);
  if (!hasSkills || !hasExperience) {
    throw new Error(`Invalid resume JSON schema. ${REQUIRED_RESUME_SCHEMA_HINT}`);
  }
}

function formatPeriod(start?: string, end?: string): string {
  if (!start && !end) {
    return '';
  }

  return `${start ?? '?'} - ${end ?? 'Present'}`;
}
