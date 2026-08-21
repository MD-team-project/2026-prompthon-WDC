/**
 * FE 저장소의 캐릭터 아트를 덱으로 가져온다.
 *
 * 덱은 기본적으로 이미지 없이 시작한다. 캐릭터를 쓰고 싶을 때만 이걸 돌린다.
 * packages/frontend/public/characters/ 가 원본이고, 여기서는 복사만 한다 —
 * 원본을 고치지 않는다.
 *
 *   node make-demo/scripts/pull-characters.mjs            대표 프레임만 (권장)
 *   node make-demo/scripts/pull-characters.mjs --all      포즈별 첫 프레임까지
 *   node make-demo/scripts/pull-characters.mjs --list      뭐가 있는지만 보기
 *
 * 애니메이션 시퀀스(수십 프레임)는 통째로 가져오지 않는다. 발표 덱은 정지
 * 이미지만 쓰고, 시퀀스는 라이브 시연이 담당한다.
 */
import { readdirSync, statSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const SRC = join(REPO, 'packages/frontend/public/characters');
const OUT = join(REPO, 'make-demo/assets/characters');

const args = process.argv.slice(2);
const LIST = args.includes('--list');
const ALL = args.includes('--all');

if (!existsSync(SRC)) {
  console.error(`원본 폴더를 찾지 못했습니다: ${SRC}`);
  console.error('저장소 루트에서 실행했는지, main 을 pull 했는지 확인하세요.');
  process.exit(1);
}

/** 포즈 폴더에서 대표 프레임 하나를 고른다. frame-0 이 있으면 그것. */
function pickFrame(dir) {
  const frames = readdirSync(dir).filter((f) => /\.(webp|png)$/i.test(f));
  if (frames.length === 0) return null;
  return frames.find((f) => /(^|[^0-9])0\./.test(f.replace(/^frame-/, ''))) ?? frames.sort()[0];
}

/** 제품별로 { 파일명: 원본경로 } 를 만든다. */
function collect() {
  const plan = [];
  for (const product of readdirSync(SRC)) {
    const pdir = join(SRC, product);
    if (!statSync(pdir).isDirectory()) continue;

    for (const entry of readdirSync(pdir)) {
      const epath = join(pdir, entry);

      // pral/idle.webp 처럼 파일이 바로 있는 경우
      if (statSync(epath).isFile() && /\.(webp|png)$/i.test(entry)) {
        plan.push({ from: epath, to: `${product}-${entry.replace(/\.(webp|png)$/i, '')}.webp`, pose: entry });
        continue;
      }

      // massagechair/talking/frame-0.webp 처럼 포즈 폴더인 경우
      if (statSync(epath).isDirectory()) {
        const frame = pickFrame(epath);
        if (!frame) continue;
        const isDefault = entry === 'talking' || entry === 'idle';
        if (ALL || isDefault) {
          plan.push({ from: join(epath, frame), to: `${product}-${entry}.webp`, pose: `${entry}/${frame}` });
        }
      }
    }
  }
  return plan;
}

const plan = collect();

if (plan.length === 0) {
  console.error('가져올 이미지를 찾지 못했습니다.');
  process.exit(1);
}

if (LIST) {
  console.log(`원본: ${SRC}\n`);
  for (const p of plan) console.log(`  ${p.to.padEnd(34)}  <- ${p.pose}`);
  console.log(`\n${plan.length}개. 실제로 복사하려면 --list 를 빼고 다시 실행하세요.`);
  if (!ALL) console.log('포즈를 더 보려면 --all 을 붙이세요.');
  process.exit(0);
}

mkdirSync(OUT, { recursive: true });
for (const p of plan) {
  copyFileSync(p.from, join(OUT, p.to));
  console.log(`  ${p.to}`);
}

console.log(`\n${plan.length}개를 make-demo/assets/characters/ 에 복사했습니다.`);
console.log('deck.html 에서 이렇게 씁니다:\n');
console.log('  <div class="fe-stage" style="width:420px; height:470px;">');
console.log(`    <img src="assets/characters/${plan[0].to}" alt="캐릭터">`);
console.log('  </div>');
