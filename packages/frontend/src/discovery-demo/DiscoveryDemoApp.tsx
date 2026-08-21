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
 */
import { useEffect, useRef, useState } from 'react';
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

type ControlEvent =
  | { type: 'discoveryProgress'; productId: ProductId; phase: DiscoveryPhase; node: DiscoveryNode }
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
  attempts: Attempt[];
  skill: SkillSummary | null;
}

const INITIAL: RunState = { productId: null, node: null, phase: 'idle', attempts: [], skill: null };

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
              return { productId: parsed.productId, node: parsed.node, phase: parsed.phase, attempts: [], skill: null };
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

function GraphDiagram({ node, phase }: { node: DiscoveryNode | null; phase: DiscoveryPhase | 'idle' }) {
  const activeIndex = node ? NODES.findIndex((n) => n.key === node) : -1;
  const tone = phase === 'found' ? 'good' : phase === 'noPattern' ? 'muted' : undefined;

  return (
    <div className="graph-diagram">
      {NODES.map((n, i) => {
        const status = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending';
        const isTerminal = n.key === 'save' && status !== 'pending';
        return (
          <div className="graph-node-wrap" key={n.key}>
            <div
              className={`graph-node graph-node-${status} ${isTerminal && tone ? `graph-node-tone-${tone}` : ''}`}
              data-testid={`graph-node-${n.key}`}
            >
              <span className="graph-node-label">{n.label}</span>
              <span className="graph-node-sub">{n.sub}</span>
            </div>
            {i < NODES.length - 1 ? <span className="graph-arrow">→</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function AttemptCard({ attempt }: { attempt: Attempt }) {
  return (
    <article className="attempt-card" data-testid={`discovery-attempt-${attempt.attempt}`}>
      <header>시도 {attempt.attempt} - EXAONE 판단</header>
      {attempt.reasoning ? (
        <div className="attempt-block attempt-reasoning">
          <span className="attempt-block-label">생각 과정</span>
          <div className="attempt-block-text">{attempt.reasoning}</div>
        </div>
      ) : null}
      <div className="attempt-block attempt-response">
        <span className="attempt-block-label">최종 응답</span>
        <div className="attempt-block-text attempt-mono">{attempt.response}</div>
      </div>
    </article>
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
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [run.attempts.length]);

  const resultLabel = run.phase === 'found' ? '스킬 발견' : run.phase === 'noPattern' ? '패턴 없음' : null;

  return (
    <div className="discovery-demo">
      <header className="discovery-demo-head">
        <h1>Skill Discovery 시연</h1>
        <p>
          세 제품 중 어느 쪽이든 사용량이 쌓여 임계치를 넘으면, 백그라운드의 이 그래프가 그대로 실행됩니다. 지금
          실행 중인 노드와 EXAONE의 판단 근거를 그대로 보여줍니다.
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
      </div>

      <GraphDiagram node={run.node} phase={run.phase} />

      <div className="discovery-body">
        <div className="attempt-list" ref={listRef}>
          {run.attempts.length === 0 ? (
            <p className="discovery-column-empty">아직 판단 기록이 없습니다.</p>
          ) : (
            run.attempts.map((a) => <AttemptCard key={a.attempt} attempt={a} />)
          )}
        </div>

        {run.skill ? <SkillResultCard skill={run.skill} /> : null}
      </div>
    </div>
  );
}
