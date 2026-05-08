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

type SupportedLanguage = 'he' | 'en';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  constructor(private readonly api: ApiService) { }

  async ask(question: string): Promise<string> {
    const normalizedQuestion = question.trim();
    const language = this.detectLanguage(normalizedQuestion);

    try {
      const response = await this.api.post<ChatResponse>('/api/v1/chat/messages', {
        question: normalizedQuestion
      });
      return response.answer;
    } catch {
      const fallbackProfile = await this.loadFallbackProfile();
      return this.buildLocalFallbackAnswer(normalizedQuestion, fallbackProfile, language);
    }
  }

  private async loadFallbackProfile(): Promise<ResumeProfileContext | null> {
    try {
      return await this.api.get<ResumeProfileContext>('/api/v1/resume-profile');
    } catch {
      return null;
    }
  }

  private buildLocalFallbackAnswer(
    question: string,
    profile: ResumeProfileContext | null,
    language: SupportedLanguage
  ): string {
    if (!profile) {
      return language === 'he'
        ? 'כרגע אין לי גישה למנוע ה-AI וגם לא לפרופיל קורות החיים, אז אני לא רוצה לענות תשובה לא מדויקת. אפשר לנסות שוב בעוד רגע.'
        : 'I do not currently have access to the AI provider or the resume profile, so I prefer not to answer inaccurately. Please try again in a moment.';
    }

    if (!this.isCareerRelevantQuestion(question, profile)) {
      return this.buildOutOfScopeReply(language);
    }

    const q = question.toLowerCase();

    if (q.includes('skill') || q.includes('technology') || q.includes('tech stack')) {
      const topSkills = profile.skills.slice(0, 8).join(', ');
      return language === 'he'
        ? `מבחינת סט טכנולוגי, אני מביאה ניסיון רלוונטי ב-${topSkills || 'הטכנולוגיות עדיין לא צוינו בפרופיל'}. אני לומדת מהר, נכנסת מהר לקוד קיים, ויודעת לחבר בין צד לקוח, צד שרת וחשיבה מוצרית.`
        : `From a technology standpoint, I bring relevant experience in ${topSkills || 'the technologies are not specified in the profile yet'}. I ramp up quickly, work well in existing codebases, and connect frontend, backend, and product thinking effectively.`;
    }

    if (
      q.includes('project') ||
      q.includes('architecture') ||
      q.includes('system') ||
      q.includes('aws') ||
      q.includes('cloud') ||
      q.includes('deploy') ||
      q.includes('delivery')
    ) {
      const project = profile.projects[0];
      if (project) {
        return language === 'he'
          ? `אחד הפרויקטים הבולטים שאני מציגה הוא ${project.name}. ${project.summary || 'בפרופיל הנוכחי אין עדיין פירוט מלא, ולכן אני מעדיפה לא להמציא פרטים מעבר למה שמופיע שם.'} מה שחשוב מבחינתי הוא לא רק לבנות פיצ'ר, אלא גם למסגר אותו בצורה ברורה, תחזוקתית ומותאמת לצורך העסקי.`
          : `One of the strongest projects I present is ${project.name}. ${project.summary || 'The current profile does not include a fuller summary yet, so I prefer not to invent details beyond what is documented there.'} What matters to me is not only building features, but delivering them in a clear, maintainable, and business-aware way.`;
      }
      return language === 'he'
        ? 'כרגע אין בפרופיל פירוט מספק על פרויקטים או ארכיטקטורה, ולכן אני מעדיפה להישאר מדויקת ולא לנסח תשובה מעבר למה שמתועד.'
        : 'The current profile does not include enough project or architecture detail for me to answer precisely, so I prefer to stay accurate rather than overstate anything.';
    }

    if (q.includes('education') || q.includes('degree') || q.includes('university')) {
      const firstEducation = profile.education[0];
      if (firstEducation) {
        return language === 'he'
          ? `מבחינת רקע אקדמי, למדתי ${firstEducation.degree} ב-${firstEducation.school}. אני רואה בלמידה מסודרת בסיס חשוב, אבל הערך שאני מביאה בפועל הוא היכולת לקחת ידע ולהפוך אותו לביצוע אמיתי.`
          : `From an academic perspective, I studied ${firstEducation.degree} at ${firstEducation.school}. I see formal learning as an important foundation, but the value I bring in practice is the ability to turn knowledge into execution.`;
      }
      return language === 'he'
        ? 'כרגע אין בפרופיל פירוט על ההשכלה, ולכן אני מעדיפה לא להשלים פרטים שלא מופיעים במפורש.'
        : 'The current profile does not include education details, so I prefer not to fill in information that is not explicitly documented.';
    }

    if (language === 'he') {
      return [
        'כרגע מנוע ה-AI החיצוני לא זמין, אז אני עונה לפי קורות החיים והפרופיל הקיים בלבד.',
        `אני ${profile.name}, ${profile.title}.`,
        profile.summary ? `בקצרה עליי: ${profile.summary}` : 'בקצרה עליי: הפרופיל עדיין לא כולל תקציר מפורט.',
        profile.skills.length > 0 ? `החוזקות המרכזיות שלי כוללות ${profile.skills.slice(0, 6).join(', ')}.` : 'החוזקות המרכזיות שלי עדיין לא פורטו בפרופיל.',
        profile.projects.length > 0
          ? `פרויקט בולט שאני מציגה הוא ${profile.projects[0].name}${profile.projects[0].summary ? ` - ${profile.projects[0].summary}` : ''}.`
          : 'כרגע אין בפרופיל פרויקט מתועד שאוכל להישען עליו בתשובה מדויקת.',
        'אם תרצי, אפשר לשאול אותי באופן ממוקד על ניסיון, טכנולוגיות, פרויקטים, סגנון עבודה או התאמה לתפקיד.'
      ].join(' ');
    }

    return [
      'The external AI provider is temporarily unavailable, so I am answering strictly from the documented resume profile.',
      `I am ${profile.name}, ${profile.title}.`,
      profile.summary ? `In brief: ${profile.summary}` : 'In brief: the profile does not yet include a fuller summary.',
      profile.skills.length > 0 ? `My strongest areas include ${profile.skills.slice(0, 6).join(', ')}.` : 'My strongest areas are not detailed in the current profile yet.',
      profile.projects.length > 0
        ? `A featured project is ${profile.projects[0].name}${profile.projects[0].summary ? ` - ${profile.projects[0].summary}` : ''}.`
        : 'The current profile does not yet document a project I can reference precisely.',
      'If helpful, you can ask me more specifically about experience, technologies, projects, work style, or fit for the role.'
    ].join(' ');
  }

  private detectLanguage(text: string): SupportedLanguage {
    return /[\u0590-\u05FF]/.test(text) ? 'he' : 'en';
  }

  private buildOutOfScopeReply(language: SupportedLanguage): string {
    return language === 'he'
      ? 'בשמחה. כאן אני עונה רק על שאלות שקשורות להתאמה שלי לתפקיד, לניסיון שלי, לפרויקטים שלי ולקורות החיים שלי. השאלה הזו נראית כרגע מחוץ למסגרת הזאת. אם התכוונת לנושא מקצועי או תעסוקתי, אשמח מאוד אם תנסח או תנסחי אותה מחדש.'
      : 'I am happy to help. In this interview space, I answer only questions related to my fit for the role, my experience, my projects, and my resume. This question currently seems outside that scope. If you meant it in a professional or hiring context, I would be glad if you rephrased it.';
  }

  private isCareerRelevantQuestion(question: string, _profile: ResumeProfileContext): boolean {
    const normalizedQuestion = question.toLowerCase();

    // In this interview chat, default to professional relevance unless a question is clearly unrelated.
    const clearlyUnrelatedTerms = [
      'weather', 'recipe', 'movie', 'sports score', 'horoscope', 'celebrity gossip',
      'מזג אוויר', 'מתכון', 'סרט', 'תוצאה של משחק', 'רכילות'
    ];

    if (clearlyUnrelatedTerms.some((term) => normalizedQuestion.includes(term))) {
      return false;
    }

    // In interview mode, default to relevant unless clearly unrelated.
    return true;
  }
}
