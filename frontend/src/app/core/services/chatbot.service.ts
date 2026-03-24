import { Injectable } from '@angular/core';

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
    let scopedQuestion = this.buildGuardedQuestion(question);

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

    const response = await this.api.post<ChatResponse>('/api/v1/chat/messages', {
      question: scopedQuestion
    });
    return response.answer;
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
}
