/**
 * Interface strings and device-attribute labels.
 *
 * Q11 A: a plain dictionary, not `i18next`. Roughly 40 static strings need no
 * pluralization, no interpolation, no namespaces and no lazy loading.
 *
 * FE-R-25: switching language changes these strings and nothing else. Skill
 * names, past messages and any already-generated text stay as they are.
 *
 * The English toggle is third in the drop order. Dropping it means leaving `en`
 * unfilled and hiding the toggle - no other code changes.
 */

import type { DailyContextStats, Lang, WeatherCondition } from "@prompthon/shared";
import { groupThousands, resolveLabel, splitDuration, toTenth } from "./pure";

const ko = {
  "app.title": "Thin뀨~",
  "roster.subtitle": "제품마다 하나의 캐릭터가 있습니다",
  "roster.enter": "들어가기",
  "roster.discovered": "새로 발견",
  "character.back": "뒤로",
  "character.skills": "⚡️ 스킬 도감",
  "character.log": "대화 기록",
  "character.log.open": "대화 보기",
  "character.log.close": "대화 닫기",
  "stat.level": "Lv",
  "stat.exp": "경험치",
  "stat.updating": "반영 중",
  "stat.none": "상태를 불러오는 중",
  "stat.device": "기기 상태",
  "stat.context": "오늘의 기록",
  "context.none": "오늘 기록을 불러오는 중",
  "context.unavailable": "오늘 기록을 가져오지 못했어요",
  "context.weather": "날씨",
  "context.steps": "걸음",
  "context.distance": "이동",
  "context.screen": "화면 시간",
  "context.unit.steps": "걸음",
  "context.unit.km": "km",
  "weather.clear": "맑음",
  "weather.rain": "비",
  "weather.cloudy": "흐림",
  "weather.snow": "눈",
  "stage.levelup": "LEVEL UP",
  "stage.switch": "캐릭터 전환",
  "speech.waiting": "말을 걸어보세요",
  "speech.you": "내가 한 말",
  "spotlight.label": "새로운 스킬 해금",
  "spotlight.open": "도감에서 보기",
  "input.placeholder": "하고 싶은 걸 말하거나 입력하세요",
  "input.send": "보내기",
  "input.mic.start": "말하기",
  "input.mic.recording": "듣고 있어요",
  "input.mic.unavailable": "마이크를 쓸 수 없어요",
  "input.mic.transcribing": "받아쓰는 중",
  "input.feedback.about": "이 스킬에 대해",
  "input.feedback.clear": "해제",
  "skill.kind.buff": "🛡 버프",
  "skill.kind.action": "⚡ 액션",
  "skill.revised": "수정됨",
  "skill.empty": "아직 발견한 스킬이 없습니다",
  "skill.more": "계속 사용하면 더 발견합니다",
  "skill.close": "닫기",
  "error.request": "지금은 대답을 못 하겠어요. 잠시 뒤에 다시 말해주세요.",
  "error.invoke": "스킬을 끝까지 실행하지 못했어요.",
  "error.transcribe": "방금 말한 걸 못 알아들었어요. 입력해 주셔도 돼요.",
  "error.load": "불러오지 못한 항목이 있어요.",
  "error.connection": "연결이 끊겼습니다. 캐릭터가 먼저 말을 걸 수 없어요.",
  "error.connection.retrying": "다시 연결하는 중",
  "lang.toggle": "한국어",
  "value.on": "켜짐",
  "value.off": "꺼짐",
} as const;

type StringKey = keyof typeof ko;

const en: Record<StringKey, string> = {
  "app.title": "ThinQ Companion",
  "roster.subtitle": "One character per product",
  "roster.enter": "Enter",
  "roster.discovered": "New discovery",
  "character.back": "Back",
  "character.skills": "⚡️ Skill compendium",
  "character.log": "Conversation",
  "character.log.open": "Show conversation",
  "character.log.close": "Hide conversation",
  "stat.level": "Lv",
  "stat.exp": "EXP",
  "stat.updating": "updating",
  "stat.none": "Loading state",
  "stat.device": "Device state",
  "stat.context": "Today so far",
  "context.none": "Loading today's readings",
  "context.unavailable": "Couldn't read today's figures",
  "context.weather": "Weather",
  "context.steps": "Steps",
  "context.distance": "Distance",
  "context.screen": "Screen time",
  "context.unit.steps": "steps",
  "context.unit.km": "km",
  "weather.clear": "Clear",
  "weather.rain": "Rain",
  "weather.cloudy": "Cloudy",
  "weather.snow": "Snow",
  "stage.levelup": "LEVEL UP",
  "stage.switch": "Switch character",
  "speech.waiting": "Say something to begin",
  "speech.you": "You said",
  "spotlight.label": "Latest discovery",
  "spotlight.open": "See in compendium",
  "input.placeholder": "Say or type what you want",
  "input.send": "Send",
  "input.mic.start": "Speak",
  "input.mic.recording": "Listening",
  "input.mic.unavailable": "Microphone unavailable",
  "input.mic.transcribing": "Transcribing",
  "input.feedback.about": "About this skill",
  "input.feedback.clear": "Clear",
  "skill.kind.buff": "🛡 Buff",
  "skill.kind.action": "⚡ Action",
  "skill.revised": "Revised",
  "skill.empty": "No skills discovered yet",
  "skill.more": "Keep using it and more will be discovered",
  "skill.close": "Close",
  "error.request": "I can't answer right now. Try again in a moment.",
  "error.invoke": "I couldn't finish running that skill.",
  "error.transcribe": "I didn't catch that. You can type it instead.",
  "error.load": "Some items failed to load.",
  "error.connection":
    "Connection lost. I can't speak to you first until it's back.",
  "error.connection.retrying": "Reconnecting",
  "lang.toggle": "EN",
  "value.on": "On",
  "value.off": "Off",
};

export const strings: Record<Lang, Record<StringKey, string>> = { ko, en };

export function translator(lang: Lang) {
  return (key: StringKey): string => strings[lang][key];
}

/**
 * Device attribute labels.
 *
 * Deliberately a small generic set. FR-1.5 makes the shape per-product and BE
 * owns the vocabulary, so this table is a courtesy for keys FE happens to know.
 * Anything absent is humanised rather than hidden - see `humanizeKey`.
 */
const attributeLabels: Record<Lang, Record<string, string>> = {
  ko: {
    power: "전원",
    mode: "모드",
    remainingMinutes: "남은 시간",
    temperature: "온도",
    intensity: "강도",
    program: "프로그램",
  },
  en: {
    power: "Power",
    mode: "Mode",
    remainingMinutes: "Remaining",
    temperature: "Temperature",
    intensity: "Intensity",
    program: "Program",
  },
};

const attributeValues: Record<Lang, Record<string, string>> = {
  ko: {
    dry: "건조",
    deodorize: "탈취",
    idle: "대기",
    care: "케어",
    massage: "마사지",
  },
  en: {
    dry: "Dry",
    deodorize: "Deodorize",
    idle: "Idle",
    care: "Care",
    massage: "Massage",
  },
};

export function attributeLabel(key: string, lang: Lang): string {
  return resolveLabel(key, attributeLabels[lang]);
}

/**
 * Format an attribute value for display.
 *
 * Booleans become on/off because rendering `true` on a character's stat line is
 * not a stat, it is a leaked internal. Known string values get a label; unknown
 * ones pass through unchanged, for the same reason unknown keys are humanised
 * rather than hidden.
 */
export function attributeValue(
  value: string | number | boolean,
  lang: Lang,
): string {
  if (typeof value === "boolean") {
    return strings[lang][value ? "value.on" : "value.off"];
  }
  if (typeof value === "number") {
    return String(value);
  }
  return attributeValues[lang][value] ?? value;
}

// ---------------------------------------------------------------------------
// Today's context, turned into what the panel renders.
// ---------------------------------------------------------------------------

const WEATHER_GLYPHS: Record<WeatherCondition, string> = {
  clear: "☀️",
  rain: "🌧️",
  cloudy: "☁️",
  snow: "❄️",
};

export function weatherLabel(weather: WeatherCondition, lang: Lang): string {
  return strings[lang][`weather.${weather}`];
}

/** ko "3시간 14분" / en "3h 14m", dropping the hours part below an hour. */
export function screenTimeText(totalMinutes: number, lang: Lang): string {
  const { hours, minutes } = splitDuration(totalMinutes);
  if (lang === "ko") {
    return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
  }
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export interface ContextChip {
  key: string;
  /** A weather icon or a fixed pictogram. Decorative - the label carries the meaning. */
  glyph: string;
  label: string;
  value: string;
  unit?: string;
}

/**
 * The four chips, in display order, formatted.
 *
 * Order is decided here rather than in the component, and it is deliberate:
 * weather first because it is the signal the user did not choose, then what
 * their body did, then what their phone did. That is also roughly the order the
 * character reasons in (see the backend's shared agent instructions), so the
 * panel reads as the same story the character is telling.
 *
 * Screen time carries no `unit` because "3시간 14분" already contains its
 * units - appending one would produce "3시간 14분 분".
 */
export function contextChips(context: DailyContextStats, lang: Lang): ContextChip[] {
  const t = translator(lang);
  return [
    {
      key: "weather",
      glyph: WEATHER_GLYPHS[context.weather],
      label: t("context.weather"),
      value: weatherLabel(context.weather, lang),
    },
    {
      key: "steps",
      glyph: "👣",
      label: t("context.steps"),
      value: groupThousands(context.steps),
      unit: t("context.unit.steps"),
    },
    {
      key: "distance",
      glyph: "📍",
      label: t("context.distance"),
      value: toTenth(context.distanceKm),
      unit: t("context.unit.km"),
    },
    {
      key: "screenTime",
      glyph: "📱",
      label: t("context.screen"),
      value: screenTimeText(context.screenTimeMinutes, lang),
    },
  ];
}
