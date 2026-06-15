import { AfterViewInit, Component, ElementRef, QueryList, ViewChildren, computed, signal } from '@angular/core';
import mermaid from 'mermaid';

const ARCH_DIAGRAM = `
flowchart LR
    User(["User / Browser"])
    Gemini(["Gemini 2.5 Flash"])
    GH(["GitHub API"])

    subgraph AWS["AWS Cloud"]
        subgraph CDN["S3 + CloudFront"]
            SPA["Angular 18 SPA"]
        end
        subgraph ECS["ECS Fargate"]
            API["FastAPI"]
        end
        DB[("PostgreSQL — RDS")]
    end

    User -- "HTTPS" --> CDN
    SPA -- "REST + WebSocket" --> API
    API -- "SQLAlchemy ORM" --> DB
    API -- "AI Chat" --> Gemini
    API -- "Repos" --> GH
`.trim();

const DB_DIAGRAM = `
erDiagram
    CHAT_SESSIONS {
        int id PK
        string session_key UK
        string provider
        datetime created_at
    }
    CHAT_MESSAGES {
        int id PK
        int chat_session_id FK
        string role
        text content
        datetime created_at
    }
    PROJECTS {
        int id PK
        string slug UK
        string title
        text summary
        string repo_url
        string live_url
        bool featured
        datetime created_at
    }
    VISITOR_EVENTS {
        int id PK
        string event_type
        string ip_hash
        datetime created_at
    }

    CHAT_SESSIONS ||--o{ CHAT_MESSAGES : "contains"
`.trim();

const CHAT_FLOW_DIAGRAM = `
sequenceDiagram
    actor User
    participant SPA as Angular SPA
    participant API as FastAPI
    participant RL as Rate Limiter
    participant DB as PostgreSQL
    participant AI as Gemini 2.5 Flash

    User->>SPA: שולחת שאלה
    SPA->>API: POST /api/chat/ask
    API->>RL: בדיקת מגבלה — 5/day per IP
    alt Rate limit exceeded
        RL-->>SPA: 429 Too Many Requests
        SPA-->>User: הודעת שגיאה
    else Within limit
        API->>DB: load or create ChatSession
        API->>DB: fetch message history
        API->>AI: messages array with context
        AI-->>API: AI response text
        API->>DB: save ChatMessage — user and ai turns
        API-->>SPA: JSON response
        SPA-->>User: מציגה את התשובה
    end
`.trim();

type DiagramTab = 'architecture' | 'database' | 'chat-flow';

interface Tab {
  id: DiagramTab;
  label: string;
  description: string;
  points: string[];
}

@Component({
  standalone: true,
  imports: [],
  templateUrl: './architecture.page.html',
})
export class ArchitecturePage implements AfterViewInit {
  @ViewChildren('diagramEl') private readonly diagramEls!: QueryList<ElementRef<HTMLPreElement>>;

  readonly activeTab = signal<DiagramTab>('architecture');
  private readonly renderedTabs = new Set<DiagramTab>();

  private readonly diagramContents: Record<DiagramTab, string> = {
    'architecture': ARCH_DIAGRAM,
    'database': DB_DIAGRAM,
    'chat-flow': CHAT_FLOW_DIAGRAM,
  };

  readonly tabs: Tab[] = [
    {
      id: 'architecture',
      label: 'System Architecture',
      description:
        'Full-stack overview: Angular SPA served via AWS S3 + CloudFront, FastAPI on ECS Fargate, PostgreSQL on RDS, with Gemini AI and GitHub as external integrations.',
      points: [
        'Frontend decoupled from backend — Angular SPA deployed independently to S3 + CloudFront CDN.',
        'Backend stateless on ECS Fargate — scales horizontally; no session state on the server.',
        'JWT authentication with short-lived access tokens and rolling refresh tokens.',
        'Rate limiting via SlowAPI middleware — 5 AI messages / IP / day, 120 req/min global.',
        'Gemini 2.5 Flash chosen for speed and cost-efficiency for the AI chat feature.',
      ],
    },
    {
      id: 'database',
      label: 'Database Schema',
      description:
        'PostgreSQL schema managed via SQLAlchemy + Alembic migrations. ChatSession links to ChatMessages (one-to-many); Projects and VisitorEvents are independent tables.',
      points: [
        'Schema managed with Alembic migrations — version-controlled, reproducible, rollback-safe.',
        'ChatSession uses a hashed key to identify visitors without storing PII.',
        'IP addresses are SHA-256 hashed before storage — GDPR-conscious privacy design.',
        'CASCADE delete on ChatMessages keeps the DB clean when a session is removed.',
        'Projects table supports a CMS-like admin workflow via the owner-admin panel.',
      ],
    },
    {
      id: 'chat-flow',
      label: 'AI Chat Flow',
      description:
        'Each request is rate-limited (5/day per IP), routed through a persistent ChatSession, sent to Gemini with full message history, and both turns are persisted to the database.',
      points: [
        'Rate limiting applied server-side via SlowAPI — cannot be bypassed by the client.',
        'Full conversation history sent to Gemini on every request — enables contextual multi-turn chat.',
        'Both user and AI turns are persisted immediately after the response — no data loss on error.',
        'Session key is a hashed fingerprint — anonymous but consistent across page reloads.',
        'AI timeout (30 s) and TLS verification are configurable via environment variables.',
      ],
    },
  ];

  readonly activeTabData = computed(() => this.tabs.find(t => t.id === this.activeTab())!);

  async ngAfterViewInit(): Promise<void> {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      themeVariables: {
        primaryColor: '#cadbb8',
        primaryTextColor: '#121c09',
        primaryBorderColor: '#577a2f',
        lineColor: '#6f9b3d',
        secondaryColor: '#e9f0e1',
        tertiaryColor: '#f6f8f4',
        background: '#ffffff',
        mainBkg: '#cadbb8',
        nodeBorder: '#577a2f',
        clusterBkg: '#e9f0e1',
        titleColor: '#121c09',
        edgeLabelBackground: '#ffffff',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '14px',
      },
      flowchart: { useMaxWidth: true },
      sequence: { useMaxWidth: true },
      er: { useMaxWidth: true },
    });
    // Render only the initial active tab — element is visible, bounding boxes are correct.
    await this.renderTab('architecture');
  }

  async setTab(tab: DiagramTab): Promise<void> {
    this.activeTab.set(tab);
    // Wait one microtask for Angular to remove [hidden] from the newly active panel
    // before mermaid tries to compute edge paths (needs real DOM dimensions).
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    await this.renderTab(tab);
  }

  private async renderTab(tab: DiagramTab): Promise<void> {
    if (this.renderedTabs.has(tab)) return;
    this.renderedTabs.add(tab);
    const idx = this.tabs.findIndex(t => t.id === tab);
    const el = this.diagramEls.get(idx)!.nativeElement;
    el.textContent = this.diagramContents[tab];
    await mermaid.run({ nodes: [el] });
  }

  tabClasses(tab: Tab): string {
    return this.activeTab() === tab.id
      ? 'rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-150 border-brand-600 bg-brand-600 text-white shadow-sm'
      : 'rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-150 border-brand-200 bg-white text-brand-600 hover:border-brand-400 hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900 dark:text-brand-300 dark:hover:bg-brand-800';
  }
}
