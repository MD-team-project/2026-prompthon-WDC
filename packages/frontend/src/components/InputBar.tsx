/**
 * Input, pinned and present in every state.
 *
 * Voice is a small icon button after send, not the wide labelled bar it used
 * to be - a shell for now. It still calls `onVoice`, but nothing here shows
 * recording/transcribing/unavailable as separate visual states any more; that
 * polish (and BE's actual /api/transcribe route) is later work, and this
 * button is the placeholder it will land back on.
 *
 * FE-R-23: trim, reject empty, cap length with the cap visible as it approaches.
 * Client-side validation here is user experience. The trust boundary is BE's and
 * BE validates independently - this cap is not a security control and is not
 * treated as one. There is no prompt-injection guard here for the same reason:
 * NFR-1.4 is a trust-boundary control and a browser is not a trust boundary.
 *
 * FE-R-30: the feedback context badge shows which skill the next message is
 * about. The user still writes only natural language.
 */

import type { Skill } from '@prompthon/shared';
import { INPUT_MAX_LENGTH, INPUT_WARN_AT, inputLength, isSendable } from '../pure';
import type { translator } from '../strings';

interface Props {
  draft: string;
  feedbackSkill: Skill | null;
  t: ReturnType<typeof translator>;
  onDraftChange: (draft: string) => void;
  onSend: (text: string) => void;
  onVoice: () => void;
  onClearFeedback: () => void;
}

export function InputBar({
  draft,
  feedbackSkill,
  t,
  onDraftChange,
  onSend,
  onVoice,
  onClearFeedback,
}: Props) {
  const length = inputLength(draft);
  const sendable = isSendable(draft);

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

        <button
          type="button"
          className="mic-button"
          onClick={onVoice}
          aria-label={t('input.mic.start')}
          data-testid="input-mic-button"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9.5" y="3.5" width="5" height="10.5" rx="2.5" />
            <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
            <path d="M12 18v2.5" />
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
