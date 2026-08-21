/**
 * Standalone demo screen: shows the Skill Discovery GRAPH itself running -
 * one shared diagram of its actual nodes (discovery/graph.ts: loadWindow ->
 * findPattern -> save), not one column per product. Whichever product's run
 * is currently live takes over the diagram; that's what "watching the graph
 * run" means here, since only one run is ever meaningfully on stage at once.
 *
 * Each product's `/api/characters/:id/events` connection is exactly the one
 * `App.tsx` already opens for the roster badge (FE-R-27's persistent
 * per-product channel) - this page keeps all three open and merges them into
 * one timeline, tagged by product, rather than three separate feeds.
 *
 * Each graph node is clickable and shows its own detail panel below - a
 * click pins the panel to that node; it un-pins (and follows the live node
 * again) once the run moves past it or the "실시간으로 보기" link is used.
 * findPattern's panel separates reasoning from response into their own tabs,
 * and separates each retry attempt into its own selectable tab, instead of
 * stacking every attempt's reasoning-then-response as one long scroll.
 */
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import type { ProductId } from '@prompthon/shared';

// BE's raw wire shapes (packages/shared/src/index.ts), not FE's massaged
// `Skill`/`SkillDiscoveredEvent` from shared/types.ts - this screen shows the
// actual SSE events `/api/characters/:id/events` carries, unmassaged.
type DiscoveryPhase = 'started' | 'analysing' | 'found' | 'noPattern';
type DiscoveryNode = 'loadWindow' | 'findPattern' | 'save';

interface Bilingual {
  ko: string;
  en: string;
}

type SkillKind = 'buff' | 'action';

interface SkillSummary {
  id: string;
  productId: ProductId;
  title: Bilingual;
  kind: SkillKind;
  summary: Bilingual;
  createdAt: string;
}

interface WindowMeta {
  eventCount: number;
  contextDayCount: number;
}

type ControlEvent =
  | {
      type: 'discoveryProgress';
      productId: ProductId;
      phase: DiscoveryPhase;
      node: DiscoveryNode;
      window?: WindowMeta;
    }
  | { type: 'discoveryReasoning'; productId: ProductId; attempt: number; reasoning: string; response: string }
  | { type: 'skillDiscovered'; productId: ProductId; skill: SkillSummary };

const PRODUCT_NAMES: Record<ProductId, string> = {
  massagechair: '안마의자',
  shoecase: '슈케이스',
  pral: '프라엘',
};

const NODES: { key: DiscoveryNode; label: string; sub: string }[] = [
  { key: 'loadWindow', label: '데이터 불러오기', sub: 'loadWindow' },
  { key: 'findPattern', label: 'EXAONE 패턴 분석', sub: 'findPattern' },
  { key: 'save', label: '스킬 저장', sub: 'save' },
];

interface Attempt {
  attempt: number;
  reasoning: string;
  response: string;
}

interface RunState {
  productId: ProductId | null;
  node: DiscoveryNode | null;
  phase: DiscoveryPhase | 'idle';
  window: WindowMeta | null;
  attempts: Attempt[];
  skill: SkillSummary | null;
  /** Bumped on every fresh run (a loadWindow event) - lets the UI reset any pinned node/attempt/tab selection. */
  runKey: number;
}

const INITIAL: RunState = {
  productId: null,
  node: null,
  phase: 'idle',
  window: null,
  attempts: [],
  skill: null,
  runKey: 0,
};

function useMergedDiscoveryFeed(): RunState {
  const [state, setState] = useState<RunState>(INITIAL);

  useEffect(() => {
    const products: ProductId[] = ['massagechair', 'shoecase', 'pral'];
    const sources = products.map((productId) => {
      const source = new EventSource(`/api/characters/${productId}/events`);
      source.onmessage = (ev) => {
        let parsed: ControlEvent;
        try {
          parsed = JSON.parse(ev.data) as ControlEvent;
        } catch {
          return;
        }

        if (parsed.type === 'discoveryProgress') {
          setState((s) => {
            // A fresh run always starts at loadWindow - that's the signal to
            // take over the diagram, even mid-way through a previous run.
            if (parsed.node === 'loadWindow') {
              return {
                productId: parsed.productId,
                node: parsed.node,
                phase: parsed.phase,
                window: parsed.window ?? null,
                attempts: [],
                skill: null,
                runKey: s.runKey + 1,
              };
            }
            // Otherwise only follow the run currently owning the diagram -
            // a late event from a run that already lost focus is ignored.
            if (s.productId !== parsed.productId) return s;
            return { ...s, node: parsed.node, phase: parsed.phase };
          });
        } else if (parsed.type === 'discoveryReasoning') {
          setState((s) =>
            s.productId === parsed.productId
              ? { ...s, attempts: [...s.attempts, { attempt: parsed.attempt, reasoning: parsed.reasoning, response: parsed.response }] }
              : s,
          );
        } else if (parsed.type === 'skillDiscovered') {
          setState((s) => (s.productId === parsed.productId ? { ...s, skill: parsed.skill } : s));
        }
      };
      return source;
    });

    return () => sources.forEach((s) => s.close());
  }, []);

  return state;
}

function GraphDiagram({
  node,
  phase,
  selected,
  onSelect,
}: {
  node: DiscoveryNode | null;
  phase: DiscoveryPhase | 'idle';
  selected: DiscoveryNode | null;
  onSelect: (node: DiscoveryNode) => void;
}) {
  const activeIndex = node ? NODES.findIndex((n) => n.key === node) : -1;
  const tone = phase === 'found' ? 'good' : phase === 'noPattern' ? 'muted' : undefined;

  return (
    <div className="graph-diagram">
      {NODES.map((n, i) => {
        const status = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending';
        const isTerminal = n.key === 'save' && status !== 'pending';
        return (
          <div className="graph-node-wrap" key={n.key}>
            <button
              type="button"
              className={`graph-node graph-node-${status} ${isTerminal && tone ? `graph-node-tone-${tone}` : ''} ${
                n.key === selected ? 'graph-node-selected' : ''
              }`}
              onClick={() => onSelect(n.key)}
              data-testid={`graph-node-${n.key}`}
            >
              <span className="graph-node-label">{n.label}</span>
              <span className="graph-node-sub">{n.sub}</span>
            </button>
            {i < NODES.length - 1 ? <span className="graph-arrow">→</span> : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Full-document markdown (headings, paragraphs, lists stay as their own
 * blocks) - unlike the chat caption's MarkdownText, which deliberately
 * flattens everything to inline `span`s. A skill's CONTENT is a real
 * document (title heading, bold labels, paragraphs), not a one-line reply,
 * so it should read like one. Same safety property: no raw HTML, and only
 * this fixed element allowlist ever renders.
 */
function MarkdownBlock({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkBreaks]} allowedElements={['p', 'strong', 'em', 'ul', 'ol', 'li', 'br', 'h1', 'h2', 'h3']}>
      {text}
    </ReactMarkdown>
  );
}

/** Mirrors discovery/graph.ts's parseResponse - display-only, BE's own parse decides what actually gets saved. */
function parseResponseForDisplay(text: string): {
  titleKo: string;
  titleEn: string;
  kind: string;
  summaryKo: string;
  summaryEn: string;
  content: string;
} | null {
  const trimmed = text.trim();
  const marker = '\nCONTENT:';
  const contentIdx = trimmed.indexOf(marker);
  if (!trimmed.startsWith('TITLE_KO:') || contentIdx === -1) return null;

  const header = trimmed.slice(0, contentIdx);
  const content = trimmed.slice(contentIdx + marker.length).trim();
  const field = (key: string): string =>
    header
      .split('\n')
      .find((l) => l.startsWith(`${key}:`))
      ?.slice(key.length + 1)
      .trim() ?? '';

  const titleKo = field('TITLE_KO');
  if (!titleKo || !content) return null;

  return {
    titleKo,
    titleEn: field('TITLE_EN'),
    kind: field('KIND').toLowerCase(),
    summaryKo: field('SUMMARY_KO'),
    summaryEn: field('SUMMARY_EN'),
    content,
  };
}

function ReasoningView({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return <p className="node-detail-blurb">(생각 과정 없음)</p>;
  return (
    <div className="reasoning-paragraphs">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function ResponseView({ text }: { text: string }) {
  const parsed = parseResponseForDisplay(text);
  if (!parsed) {
    // e.g. "NO_PATTERN_FOUND", or a malformed reply - show it verbatim rather
    // than pretending it parsed into something it didn't.
    return <div className="attempt-mono response-raw">{text}</div>;
  }
  return (
    <div className="response-parsed">
      <div className="response-parsed-head">
        <div>
          <strong className="response-parsed-title">{parsed.titleKo}</strong>
          {parsed.titleEn ? <span className="response-parsed-title-en"> · {parsed.titleEn}</span> : null}
        </div>
        {parsed.kind === 'buff' || parsed.kind === 'action' ? (
          <span className={`skill-kind-badge skill-kind-${parsed.kind}`}>{parsed.kind === 'buff' ? '🛡 버프' : '⚡ 액션'}</span>
        ) : null}
      </div>
      {parsed.summaryKo ? <p className="response-parsed-summary">{parsed.summaryKo}</p> : null}
      {parsed.summaryEn ? <p className="response-parsed-summary response-parsed-summary-en">{parsed.summaryEn}</p> : null}
      <div className="response-parsed-content">
        <MarkdownBlock text={parsed.content} />
      </div>
    </div>
  );
}

function FindPatternPanel({ attempts }: { attempts: Attempt[] }) {
  const [selectedAttempt, setSelectedAttempt] = useState<number | null>(null);
  const [view, setView] = useState<'reasoning' | 'response'>('reasoning');

  if (attempts.length === 0) {
    return <p className="discovery-column-empty">아직 판단 기록이 없습니다.</p>;
  }

  const attempt = attempts.find((a) => a.attempt === selectedAttempt) ?? attempts[attempts.length - 1];

  return (
    <div className="node-panel-body">
      {attempts.length > 1 ? (
        <div className="attempt-selector" data-testid="attempt-selector">
          {attempts.map((a) => (
            <button
              key={a.attempt}
              type="button"
              className={a.attempt === attempt.attempt ? 'tab-active' : ''}
              onClick={() => setSelectedAttempt(a.attempt)}
            >
              시도 {a.attempt}
            </button>
          ))}
        </div>
      ) : null}

      <div className="view-tabs" data-testid="view-tabs">
        <button type="button" className={view === 'reasoning' ? 'tab-active' : ''} onClick={() => setView('reasoning')}>
          생각 과정
        </button>
        <button type="button" className={view === 'response' ? 'tab-active' : ''} onClick={() => setView('response')}>
          최종 응답
        </button>
      </div>

      <div className="node-panel-text" data-testid={`attempt-${attempt.attempt}-${view}`}>
        {view === 'reasoning' ? <ReasoningView text={attempt.reasoning} /> : <ResponseView text={attempt.response} />}
      </div>
    </div>
  );
}

function LoadWindowPanel({ windowMeta }: { windowMeta: WindowMeta | null }) {
  if (!windowMeta) {
    return (
      <p className="node-detail-blurb">
        최근 60일간의 사용 기록과 컨텍스트(날씨, 이동거리, 스크린 타임 등)를 불러옵니다. 실행되면 실제로 몇 건을
        불러왔는지 여기에 표시됩니다.
      </p>
    );
  }
  return (
    <div className="node-panel-body" data-testid="loadwindow-panel">
      <p className="node-detail-blurb">최근 60일 중 이번 실행에서 실제로 불러온 데이터입니다.</p>
      <dl className="loadwindow-stats">
        <div className="loadwindow-stat">
          <dt>기기 사용 기록</dt>
          <dd className="tnum">{windowMeta.eventCount}건</dd>
        </div>
        <div className="loadwindow-stat">
          <dt>컨텍스트가 있는 날</dt>
          <dd className="tnum">{windowMeta.contextDayCount}일</dd>
        </div>
      </dl>
    </div>
  );
}

function SkillResultCard({ skill }: { skill: SkillSummary }) {
  return (
    <article className="discovered-skill-card" data-testid="discovered-skill-card">
      <div className="discovered-skill-banner">✨ 새로운 스킬 발견!</div>
      <div className="discovered-skill-head">
        <div>
          <h3>{skill.title.ko}</h3>
          <p className="discovered-skill-title-en">{skill.title.en}</p>
        </div>
        <span className={`skill-kind-badge skill-kind-${skill.kind}`}>
          {skill.kind === 'buff' ? '🛡 버프' : '⚡ 액션'}
        </span>
      </div>
      <p className="discovered-skill-summary">{skill.summary.ko}</p>
      <p className="discovered-skill-summary discovered-skill-summary-en">{skill.summary.en}</p>
    </article>
  );
}

export function DiscoveryDemoApp() {
  const run = useMergedDiscoveryFeed();
  const [selectedNode, setSelectedNode] = useState<DiscoveryNode | null>(null);

  // A fresh run invalidates whatever attempt/tab a previous run's panel had pinned.
  useEffect(() => {
    setSelectedNode(null);
  }, [run.runKey]);

  const effectiveNode = selectedNode ?? run.node;
  const resultLabel = run.phase === 'found' ? '스킬 발견' : run.phase === 'noPattern' ? '패턴 없음' : null;
  const isPinnedToPast = selectedNode !== null && selectedNode !== run.node && run.node !== null;

  return (
    <div className="discovery-demo">
      <header className="discovery-demo-head">
        <h1>Skill Discovery 시연</h1>
        <p>
          세 제품 중 어느 쪽이든 사용량이 쌓여 임계치를 넘으면, 백그라운드의 이 그래프가 그대로 실행됩니다. 노드를
          클릭하면 그 단계의 내용을 자세히 볼 수 있습니다.
        </p>
      </header>

      <div className="discovery-run-meta" data-testid="discovery-run-meta">
        {run.productId ? (
          <>
            <span className="discovery-run-product">{PRODUCT_NAMES[run.productId]}</span>
            {resultLabel ? <span className={`discovery-run-result discovery-run-result-${run.phase}`}>{resultLabel}</span> : null}
          </>
        ) : (
          <span className="discovery-run-idle">대기 중 - 아직 감지된 실행이 없습니다</span>
        )}
        {isPinnedToPast ? (
          <button type="button" className="discovery-live-jump" onClick={() => setSelectedNode(null)} data-testid="discovery-live-jump">
            실시간으로 보기 →
          </button>
        ) : null}
      </div>

      <GraphDiagram node={run.node} phase={run.phase} selected={effectiveNode} onSelect={setSelectedNode} />

      <div className="discovery-body">
        {effectiveNode === null ? (
          <p className="discovery-column-empty">노드를 클릭하면 자세한 내용을 볼 수 있습니다.</p>
        ) : effectiveNode === 'loadWindow' ? (
          <LoadWindowPanel windowMeta={run.window} />
        ) : effectiveNode === 'findPattern' ? (
          <FindPatternPanel attempts={run.attempts} />
        ) : run.skill ? (
          <SkillResultCard skill={run.skill} />
        ) : run.phase === 'noPattern' ? (
          <p className="node-detail-blurb">패턴을 찾지 못해 저장할 스킬이 없습니다.</p>
        ) : (
          <p className="node-detail-blurb">아직 저장 단계에 도달하지 않았습니다.</p>
        )}
      </div>
    </div>
  );
}
