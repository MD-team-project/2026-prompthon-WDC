/**
 * deck.html 을 단일 배포 파일로 합친다.
 *
 * assets/ 의 이미지를 data URI 로 인라인해서, USB 로 옮기거나 다른 PC 에서
 * 열어도 경로가 깨지지 않게 한다. 폰트는 CDN 링크로 남는다 — 네트워크가 없으면
 * 시스템 폰트로 대체되고, 레이아웃은 유지되지만 글자 모양이 달라진다.
 *
 *   node make-demo/scripts/build-single-file.mjs
 *
 * 결과: make-demo/dist/deck-standalone.html
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = resolve(HERE, '..');
const SRC = join(DEMO, 'deck.html');
const OUT_DIR = join(DEMO, 'dist');
const OUT = join(OUT_DIR, 'deck-standalone.html');

const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.gif': 'image/gif' };

if (!existsSync(SRC)) {
  console.error(`deck.html 을 찾지 못했습니다: ${SRC}`);
  process.exit(1);
}

let html = readFileSync(SRC, 'utf8');

// src="..." / src='...' 중 http, data, // 로 시작하지 않는 것만 인라인 대상
const missing = [];
let inlined = 0;

html = html.replace(/src=(["'])(?!https?:|data:|\/\/)([^"']+)\1/g, (match, q, rel) => {
  const abs = join(DEMO, rel);
  if (!existsSync(abs)) {
    missing.push(rel);
    return match;
  }
  const ext = extname(abs).toLowerCase();
  const mime = MIME[ext];
  if (!mime) {
    missing.push(`${rel} (지원하지 않는 확장자 ${ext})`);
    return match;
  }
  const b64 = readFileSync(abs).toString('base64');
  inlined += 1;
  return `src=${q}data:${mime};base64,${b64}${q}`;
});

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, html, 'utf8');

const kb = (html.length / 1024).toFixed(0);
console.log(`${OUT}`);
console.log(`  이미지 ${inlined}개 인라인, ${kb} KB`);

if (missing.length) {
  // 조용히 넘기지 않는다 — 발표장에서 깨진 이미지로 발견되는 게 최악이다.
  console.log('\n찾지 못해 링크로 남긴 것:');
  for (const m of missing) console.log(`  - ${m}`);
  console.log('\n캐릭터 에셋이라면 먼저 이걸 돌리세요:');
  console.log('  node make-demo/scripts/pull-characters.mjs');
  process.exitCode = 1;
}
