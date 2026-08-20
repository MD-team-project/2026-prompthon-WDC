/**
 * Input, pinned and present in every state.
 *
 * The mic is tap-to-start, tap-to-finish rather than press-and-hold. Hold would
 * read better, but `getUserMedia` resolves asynchronously, so a quick release
 * can land while `micStatus` is still `idle` and start a second recorder. A
 * duplicated recorder on stage is worse than a less tactile affordance.
 *
 * FE-R-22: there is no audio output path. The bar visualises input only, and
 * nothing here plays a sound - which is also why the level-up and discovery
 * effects are silent.
 *
 * FE-R-23: trim, reject empty, cap length with the cap visible as it approaches.
 * Client-side validation here is user experience. The trust boundary is BE's and
 * BE validates independently - this cap is not a security control and is not
 * treated as one. There is no prompt-injection guard here for the same reason:
 * NFR-1.4 is a trust-boundary control and a browser is not a trust boundary.
 *
 * FE-R-20: voice input has no working backend yet (no `/api/transcribe` route,
 * and the mic is forced `unavailable` in real-API mode - see `App.tsx`), so the
 * mic is a small icon button beside the text field rather than the wide,
 * primary bar it will become once transcription is real. It renders in every
 * `micStatus`, including `unavailable` - a disabled placeholder instead of an
 * error line, since "coming soon" is not a failure.
 *
 * FE-R-21: a transcript arrives in `draft` as an editable value, not as a
 * dispatch. Stage misrecognition becomes recoverable rather than merely legible.
 *
 * FE-R-30: the feedback context badge shows which skill the next message is
 * about. The user still writes only natural language.
 */

import type { Skill } from '@prompthon/shared';
import { INPUT_MAX_LENGTH, INPUT_WARN_AT, inputLength, isSendable } from '../pure';
import type { translator } from '../strings';
import type { MicStatus } from '../state';

interface Props {
  draft: string;
  micStatus: MicStatus;
  feedbackSkill: Skill | null;
  t: ReturnType<typeof translator>;
  onDraftChange: (draft: string) => void;
  onSend: (text: string) => void;
  onVoice: () => void;
  onClearFeedback: () => void;
}

export function InputBar({
  draft,
  micStatus,
  feedbackSkill,
  t,
  onDraftChange,
  onSend,
  onVoice,
  onClearFeedback,
}: Props) {
  const length = inputLength(draft);
  const sendable = isSendable(draft);
  const recording = micStatus === 'recording';

  const micLabel =
    micStatus === 'unavailable'
      ? t('input.mic.unavailable')
      : recording
        ? t('input.mic.recording')
        : micStatus === 'transcribing'
          ? t('input.mic.transcribing')
          : t('input.mic.start');

  return (
    <div className="input-bar">
      {feedbackSkill ? (
        <div className="feedback-context" data-testid="input-feedback-context">
          <span className="feedback-context-label">
            {t('input.feedback.about')} · {feedbackSkill.name}
          </span>
          <button
            type="button"
            className="text-button"
            onClick={onClearFeedback}
            data-testid="input-feedback-context-clear"
          >
            {t('input.feedback.clear')}
          </button>
        </div>
      ) : null}

      <form
        className="input-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (sendable) onSend(draft);
        }}
      >
        <button
          type="button"
          className="mic-button"
          data-state={micStatus}
          disabled={micStatus === 'unavailable' || micStatus === 'transcribing'}
          onClick={onVoice}
          aria-label={micLabel}
          data-testid="input-mic-button"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9.5" y="3.5" width="5" height="10.5" rx="2.5" />
            <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
            <path d="M12 18v2.5" />
          </svg>
        </button>

        <label className="input-field">
          <span className="visually-hidden">{t('input.placeholder')}</span>
          <input
            type="text"
            value={draft}
            maxLength={INPUT_MAX_LENGTH}
            placeholder={t('input.placeholder')}
            onChange={(event) => onDraftChange(event.target.value)}
            data-testid="input-text-field"
          />
        </label>

        <button
          type="submit"
          className="send-button"
          disabled={!sendable}
          aria-label={t('input.send')}
          data-testid="input-send-button"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h13M12 6l6 6-6 6" />
          </svg>
        </button>
      </form>

      {length >= INPUT_WARN_AT ? (
        <span className="input-cap tnum" data-testid="input-cap-warning">
          {length} / {INPUT_MAX_LENGTH}
        </span>
      ) : null}
    </div>
  );
}
