import { Injectable } from '@angular/core';

import { parseResumeFile } from '../../features/resume-studio/resume-parser';
import { ApiService } from './api.service';

type ChatResponse = {
  answer: string;
};

type ResumeProfileContext = {
  name: string;
  title: string;
  summary: string;
  skills: string[];
  education: Array<{ degree: string; school: string }>;
  projects: Array<{ name: string; summary: string }>;
};

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  constructor(private readonly api: ApiService) {}

  async ask(question: string): Promise<string> {
    const normalizedQuestion = question.trim();
    let scopedQuestion = this.buildGuardedQuestion(normalizedQuestion);

    try {
      const profile = await this.api.get<ResumeProfileContext>('/api/v1/resume-profile');
      scopedQuestion = `${scopedQuestion}\n\nCandidate profile context:\n${JSON.stringify(
        {
          name: profile.name,
          title: profile.title,
          summary: profile.summary,
          skills: profile.skills,
          education: profile.education,
          projects: profile.projects
        },
        null,
        2
      )}`;
    } catch {
      // If profile context is unavailable, continue with strict guardrails only.
    }

    try {
      const response = await this.api.post<ChatResponse>('/api/v1/chat/messages', {
        question: scopedQuestion
      });
      return response.answer;
    } catch {
      const fallbackProfile = await this.loadFallbackProfile();
      return this.buildLocalFallbackAnswer(normalizedQuestion, fallbackProfile);
    }
  }

  private buildGuardedQuestion(question: string): string {
    return [
      'Answer only about the candidate and this portfolio project.',
      'Use only evidence from the CV/profile and the implemented site architecture/features.',
      'If information is missing, say that clearly instead of guessing.',
      '',
      `Recruiter question: ${question.trim()}`
    ].join('\n');
  }

  private async loadFallbackProfile(): Promise<ResumeProfileContext | null> {
    try {
      return await this.api.get<ResumeProfileContext>('/api/v1/resume-profile');
    } catch {
      // Continue to bundled CV fallback.
    }

    try {
      const response = await fetch('/public/my-resume.pdf');
      if (!response.ok) {
        return null;
      }

      const blob = await response.blob();
      const file = new File([blob], 'my-resume.pdf', {
        type: blob.type || 'application/pdf'
      });

      const parsed = await parseResumeFile(file);
      return {
        name: parsed.name,
        title: parsed.title,
        summary: parsed.summary,
        skills: parsed.skills,
        education: parsed.education,
        projects: parsed.projects
      };
    } catch {
      return null;
    }
  }

  private buildLocalFallbackAnswer(question: string, profile: ResumeProfileContext | null): string {
    if (!profile) {
      return 'The AI provider is temporarily unavailable, and no resume profile could be loaded right now. Please try again in a moment.';
    }

    const q = question.toLowerCase();

    if (q.includes('skill') || q.includes('technology') || q.includes('tech stack')) {
      const topSkills = profile.skills.slice(0, 8).join(', ');
      return `Based on the current CV profile, key skills include: ${topSkills || 'not specified yet'}.`;
    }

    if (q.includes('project') || q.includes('architecture') || q.includes('system')) {
      const project = profile.projects[0];
      if (project) {
        return `A highlighted project is ${project.name}: ${project.summary || 'summary not provided in the profile yet.'}`;
      }
      return 'The CV profile currently does not include project details.';
    }

    if (q.includes('education') || q.includes('degree') || q.includes('university')) {
      const firstEducation = profile.education[0];
      if (firstEducation) {
        return `Education includes ${firstEducation.degree} at ${firstEducation.school}.`;
      }
      return 'The CV profile currently does not include education details.';
    }

    return [
      'The external AI provider is temporarily unavailable, so this is a CV-based fallback response.',
      `Candidate: ${profile.name} - ${profile.title}.`,
      `Summary: ${profile.summary || 'Not provided.'}`,
      profile.skills.length > 0 ? `Top skills: ${profile.skills.slice(0, 6).join(', ')}.` : 'Top skills: Not provided.',
      profile.projects.length > 0
        ? `Featured project: ${profile.projects[0].name}${profile.projects[0].summary ? ` - ${profile.projects[0].summary}` : ''}.`
        : 'Featured project: Not provided.'
    ].join(' ');
  }
}
