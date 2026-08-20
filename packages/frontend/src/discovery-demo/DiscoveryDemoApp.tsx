/**
 * Standalone demo screen: shows Skill Discovery's SSE stream live - the same
 * phase/reasoning/result events the main app's roster badge relies on, but
 * surfaced in full instead of collapsed into "a skill appeared". Opened in
 * its own tab, side by side with the main app, during a demo.
 *
 * Each product's `/api/characters/:id/events` connection is exactly the one
 * `App.tsx` already opens for the roster badge (FE-R-27's persistent
 * per-product channel) - this page just renders every event on it instead of
 * only `skillDiscovered`.
 */
import { useEffect, useRef, useState } from 'react';
import type { ProductId } from '@prompthon/shared';

// BE's raw wire shapes (packages/shared/src/index.ts), not FE's massaged
// `Skill`/`SkillDiscoveredEvent` from shared/types.ts - this screen shows the
// actual SSE events `/api/characters/:id/events` carries, unmassaged.
type DiscoveryPhase = 'started' | 'analysing' | 'found' | 'noPattern';

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
  | { type: 'discoveryProgress'; productId: ProductId; phase: DiscoveryPhase }
  | { type: 'discoveryReasoning'; productId: ProductId; attempt: number; reasoning: string; response: string }
  | { type: 'skillDiscovered'; productId: ProductId; skill: SkillSummary };

interface ProductMeta {
  productId: ProductId;
  name: string;
}

const PRODUCTS: ProductMeta[] = [
  { productId: 'massagechair', name: '안마의자' },
  { productId: 'shoecase', name: '슈케이스' },
  { productId: 'pral', name: '프라엘' },
];

interface Attempt {
  attempt: number;
  reasoning: string;
  response: string;
}

interface ProductDiscoveryState {
  phase: DiscoveryPhase | 'idle';
  attempts: Attempt[];
  skill: SkillSummary | null;
}

const INITIAL: ProductDiscoveryState = { phase: 'idle', attempts: [], skill: null };

// idle=0 < started=1 < analysing=2 < found/noPattern=3 (both terminal, same rank).
function rank(phase: DiscoveryPhase | 'idle'): number {
  if (phase === 'idle') return 0;
  if (phase === 'started') return 1;
  if (phase === 'analysing') return 2;
  return 3;
}

function useDiscoveryFeed(productId: ProductId): ProductDiscoveryState {
  const [state, setState] = useState<ProductDiscoveryState>(INITIAL);

  useEffect(() => {
    const source = new EventSource(`/api/characters/${productId}/events`);
    source.onmessage = (ev) => {
      let parsed: ControlEvent;
      try {
        parsed = JSON.parse(ev.data) as ControlEvent;
      } catch {
        return;
      }
      if (parsed.type === 'discoveryProgress') {
        setState((s) => ({
          phase: parsed.phase,
          // A fresh "started" begins a new run - clear the previous run's trail.
          attempts: parsed.phase === 'started' ? [] : s.attempts,
          skill: parsed.phase === 'started' ? null : s.skill,
        }));
      } else if (parsed.type === 'discoveryReasoning') {
        setState((s) => ({
          ...s,
          attempts: [
            ...s.attempts,
            { attempt: parsed.attempt, reasoning: parsed.reasoning, response: parsed.response },
          ],
        }));
      } else if (parsed.type === 'skillDiscovered') {
        setState((s) => ({ ...s, skill: parsed.skill }));
      }
    };
    return () => source.close();
  }, [productId]);

  return state;
}

function PhaseStepper({ phase }: { phase: DiscoveryPhase | 'idle' }) {
  const r = rank(phase);
  const resultLabel = phase === 'found' ? '스킬 발견' : phase === 'noPattern' ? '패턴 없음' : '결과 대기';
  const resultTone = phase === 'found' ? 'good' : phase === 'noPattern' ? 'muted' : 'pending';

  const steps: { key: string; label: string; status: 'pending' | 'active' | 'done'; tone?: string }[] = [
    { key: 'started', label: '시작', status: r > 1 ? 'done' : r === 1 ? 'active' : 'pending' },
    { key: 'analysing', label: 'EXAONE 분석 중', status: r > 2 ? 'done' : r === 2 ? 'active' : 'pending' },
    { key: 'result', label: resultLabel, status: r >= 3 ? 'active' : 'pending', tone: resultTone },
  ];

  return (
    <ol className="phase-stepper">
      {steps.map((step) => (
        <li key={step.key} className={`phase-step phase-step-${step.status} phase-step-tone-${step.tone ?? ''}`}>
          <span className="phase-step-dot" />
          <span className="phase-step-label">{step.label}</span>
        </li>
      ))}
    </ol>
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

function ProductColumn({ meta }: { meta: ProductMeta }) {
  const feed = useDiscoveryFeed(meta.productId);
  const [posting, setPosting] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [feed.attempts.length]);

  const running = posting || feed.phase === 'started' || feed.phase === 'analysing';

  async function runNow() {
    setPosting(true);
    setRunError(null);
    try {
      const res = await fetch(`/internal/discovery/${meta.productId}/run`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { failure?: { message?: string } } | null;
        setRunError(body?.failure?.message ?? `요청 실패 (${res.status})`);
      }
    } catch {
      setRunError('서버에 연결할 수 없습니다.');
    } finally {
      setPosting(false);
      window.setTimeout(() => setRunError(null), 4000);
    }
  }

  return (
    <section className="discovery-column" data-product={meta.productId} data-testid={`discovery-column-${meta.productId}`}>
      <header className="discovery-column-head">
        <h2>{meta.name}</h2>
        <button type="button" onClick={runNow} disabled={running} data-testid={`discovery-run-${meta.productId}`}>
          {running ? '진행 중...' : '지금 발견하기'}
        </button>
      </header>

      {runError ? <p className="discovery-run-error">{runError}</p> : null}

      <PhaseStepper phase={feed.phase} />

      <div className="attempt-list" ref={listRef}>
        {feed.attempts.length === 0 ? (
          <p className="discovery-column-empty">아직 판단 기록이 없습니다.</p>
        ) : (
          feed.attempts.map((a) => <AttemptCard key={a.attempt} attempt={a} />)
        )}
      </div>

      {feed.skill ? <SkillResultCard skill={feed.skill} /> : null}
    </section>
  );
}

export function DiscoveryDemoApp() {
  return (
    <div className="discovery-demo">
      <header className="discovery-demo-head">
        <h1>Skill Discovery 시연</h1>
        <p>
          사용량이 쌓이면 백그라운드에서 EXAONE이 패턴을 분석해 스킬을 만듭니다. 여기서는 그 과정을 단계별로,
          판단 근거까지 그대로 보여줍니다.
        </p>
      </header>

      <div className="discovery-demo-grid">
        {PRODUCTS.map((meta) => (
          <ProductColumn key={meta.productId} meta={meta} />
        ))}
      </div>
    </div>
  );
}
