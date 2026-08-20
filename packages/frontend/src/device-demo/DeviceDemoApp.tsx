/**
 * Standalone demo screen: opened in its own browser tab/window during a live
 * demo, side by side with the main companion app. Polls each product's raw
 * device-stub state directly (`GET /api/characters/:id/device-state`, added
 * for this) rather than riding along a chat turn's SSE - this screen has no
 * chat turn of its own, only the server-side truth a tool call just wrote.
 *
 * Polling, not push: device-stub has no state-change SSE channel and adding
 * one just for this screen would be new infra for what a 1s poll already
 * shows convincingly enough on stage.
 */
import { useEffect, useRef, useState } from 'react';
import type { ProductId } from '@prompthon/shared';

// BE's raw wire shape (packages/backend/src/routes/character.ts's new
// GET /device-state), not FE's massaged `DeviceStats` from shared/types.ts -
// this screen deliberately shows the actual device-stub truth, unmassaged.
interface DeviceState {
  productId: ProductId;
  power: 'on' | 'off';
  attributes: Record<string, unknown>;
  updatedAt: string;
}

interface ProductMeta {
  productId: ProductId;
  name: string;
  imageUrl: string | null;
}

const PRODUCTS: ProductMeta[] = [
  { productId: 'massagechair', name: '안마의자', imageUrl: '/demo-products/massagechair.webp' },
  { productId: 'shoecase', name: '슈케이스', imageUrl: '/demo-products/shoecase.webp' },
  { productId: 'pral', name: '프라엘', imageUrl: '/demo-products/pral.jpg' },
];

const POLL_MS = 1000;
const FLASH_MS = 1400;

function humanizeKey(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'ON' : 'OFF';
  return String(value);
}

interface Snapshot {
  state: DeviceState | null;
  error: boolean;
  changedKeys: Set<string>;
  powerChanged: boolean;
}

function ProductPanel({ meta }: { meta: ProductMeta }) {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    state: null,
    error: false,
    changedKeys: new Set(),
    powerChanged: false,
  });
  const [imageFailed, setImageFailed] = useState(false);
  const prevRef = useRef<DeviceState | null>(null);
  const flashTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/characters/${meta.productId}/device-state`);
        if (!res.ok) throw new Error(String(res.status));
        const state = (await res.json()) as DeviceState;
        if (cancelled) return;

        const prev = prevRef.current;
        const changedKeys = new Set<string>();
        let powerChanged = false;
        if (prev) {
          powerChanged = prev.power !== state.power;
          const keys = new Set([...Object.keys(prev.attributes), ...Object.keys(state.attributes)]);
          for (const key of keys) {
            if (prev.attributes[key] !== state.attributes[key]) changedKeys.add(key);
          }
        }
        prevRef.current = state;
        setSnapshot({ state, error: false, changedKeys, powerChanged });

        if (changedKeys.size > 0 || powerChanged) {
          window.clearTimeout(flashTimerRef.current);
          flashTimerRef.current = window.setTimeout(() => {
            if (!cancelled) setSnapshot((s) => ({ ...s, changedKeys: new Set(), powerChanged: false }));
          }, FLASH_MS);
        }
      } catch {
        if (!cancelled) setSnapshot((s) => ({ ...s, error: true }));
      }
    }

    void poll();
    const interval = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(flashTimerRef.current);
    };
  }, [meta.productId]);

  const { state, error, changedKeys, powerChanged } = snapshot;
  const attributeEntries = state ? Object.entries(state.attributes) : [];
  const isFlashing = powerChanged || changedKeys.size > 0;

  return (
    <section
      className={`device-panel ${isFlashing ? 'device-panel-flash' : ''}`}
      data-product={meta.productId}
      data-testid={`device-panel-${meta.productId}`}
    >
      <header className="device-panel-head">
        <div className="device-panel-art">
          {meta.imageUrl && !imageFailed ? (
            <img src={meta.imageUrl} alt={meta.name} onError={() => setImageFailed(true)} />
          ) : (
            <span className="device-panel-art-fallback">{meta.name}</span>
          )}
        </div>
        <div className="device-panel-title">
          <h2>{meta.name}</h2>
          <span className="device-panel-id tnum">{meta.productId}</span>
        </div>
        <span
          className={`device-power-badge ${state?.power === 'on' ? 'device-power-on' : 'device-power-off'} ${
            powerChanged ? 'device-power-flash' : ''
          }`}
          data-testid={`device-power-${meta.productId}`}
        >
          {state?.power === 'on' ? 'ON' : 'OFF'}
        </span>
      </header>

      <div className="device-panel-body">
        {error ? (
          <p className="device-panel-error">기기 상태를 불러오지 못했습니다.</p>
        ) : attributeEntries.length === 0 ? (
          <p className="device-panel-empty">설정된 값이 없습니다.</p>
        ) : (
          <dl className="device-attr-list">
            {attributeEntries.map(([key, value]) => (
              <div
                key={key}
                className={`device-attr-row ${changedKeys.has(key) ? 'device-attr-changed' : ''}`}
                data-testid={`device-attr-${meta.productId}-${key}`}
              >
                <dt>{humanizeKey(key)}</dt>
                <dd className="tnum">{formatValue(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <footer className="device-panel-foot">
        <span className="tnum">{state ? new Date(state.updatedAt).toLocaleTimeString('ko-KR') : '--:--:--'}</span>
        <span> 기준</span>
      </footer>
    </section>
  );
}

export function DeviceDemoApp() {
  return (
    <div className="device-demo">
      <header className="device-demo-head">
        <h1>실시간 기기 상태</h1>
        <p>
          캐릭터가 도구를 호출하면 실제 기기(디바이스 스텁)의 상태가 이렇게 바뀝니다. 1초마다 서버에서 직접
          갱신합니다.
        </p>
      </header>

      <div className="device-demo-grid">
        {PRODUCTS.map((meta) => (
          <ProductPanel key={meta.productId} meta={meta} />
        ))}
      </div>
    </div>
  );
}
