export type ResumeExperience = {
  role: string;
  company: string;
  period: string;
  highlights: string[];
};

export type ResumeProject = {
  name: string;
  summary: string;
  stack: string[];
};

export type ResumeEducation = {
  degree: string;
  school: string;
  period: string;
};

export type ParsedResume = {
  name: string;
  title: string;
  location: string;
  email: string;
  githubUsername?: string;
  resumeFileName?: string;
  summary: string;
  skills: string[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
  education: ResumeEducation[];
};

export const SUPPORTED_EXTENSIONS = ['json', 'txt', 'md', 'pdf', 'docx'] as const;

export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export type ResumeSections = {
  intro: string[];
  summary: string[];
  skills: string[];
  experience: string[];
  projects: string[];
  education: string[];
};

export type JsonInput = {
  basics?: {
    name?: string;
    title?: string;
    location?: string;
    email?: string;
    summary?: string;
  };
  skills?: Array<string | { name?: string }>;
  experience?: Array<{
    role?: string;
    company?: string;
    period?: string;
    start?: string;
    end?: string;
    highlights?: string[];
  }>;
  projects?: Array<{
    name?: string;
    summary?: string;
    stack?: string[];
  }>;
  education?: Array<{
    degree?: string;
    school?: string;
    period?: string;
    start?: string;
    end?: string;
  }>;
};
