import { ParsedResume } from './resume-parser.types';
import {
  extractEducation,
  extractExperience,
  extractProjects,
  inferEducationFromGeneralLines,
  inferExperienceFromGeneralLines,
  inferProjectsFromGeneralLines,
} from './resume-parser.text-entities';
import {
  extractEmail,
  extractLocation,
  extractName,
  extractSkills,
  extractTitle,
  normalizeLines,
  splitIntoSections,
} from './resume-parser.text-sections';

export function parseTextResume(content: string): ParsedResume {
  const lines = normalizeLines(content);
  const sections = splitIntoSections(lines);

  const intro = sections.intro;
  const summaryLines = sections.summary.length > 0 ? sections.summary : intro.slice(2, 6);
  const email = extractEmail(lines) ?? 'email@example.com';

  const data: ParsedResume = {
    name: extractName(intro),
    title: extractTitle(intro),
    location: extractLocation(intro),
    email,
    summary: summaryLines.join(' ').slice(0, 560) || 'Add a short professional summary.',
    skills: extractSkills(sections.skills),
    experience: extractExperience(sections.experience),
    projects: extractProjects(sections.projects),
    education: extractEducation(sections.education),
  };

  if (data.experience.length === 0) {
    data.experience = inferExperienceFromGeneralLines(lines);
  }

  if (data.projects.length === 0) {
    data.projects = inferProjectsFromGeneralLines(lines);
  }

  if (data.education.length === 0) {
    data.education = inferEducationFromGeneralLines(lines);
  }

  if (data.skills.length === 0) {
    data.skills = ['Communication', 'Problem Solving', 'Team Leadership'];
  }

  return data;
}
