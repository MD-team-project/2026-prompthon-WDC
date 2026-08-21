/**
 * The character's voice, and the full log on demand.
 *
 * The latest utterance is a caption on the stage, not a bubble in a list. A
 * bubble in a scrolling column reads as messaging, where the character is one
 * participant among two; a caption under the character reads as the character
 * speaking. Q5 D put the character at the centre and made chat secondary, and
 * the bubble layout was quietly contradicting that.
 *
 * The user's own last line stays visible as a small echo while a reply is
 * pending, so nothing said on stage disappears without a trace. Once the
 * character answers, the answer takes the caption.
 *
 * Announcements queue as separate messages rather than being combined, because
 * US-3.2 scenario 3 requires each discovered skill to be individually
 * attributable, and a merged utterance cannot satisfy that.
 *
 * FE-R-26: the log is empty after a refresh. US-2.1 states scrollback is the one
 * thing a reload is allowed to lose, so preserving it would be building against
 * the specification rather than beyond it.
 *
 * FE-R-17 request class: a failure appears as the character reporting it, styled
 * differently from ordinary speech.
 */

import type { ChatMessage } from '@prompthon/shared';
import type { translator } from '../strings';
import { MarkdownText } from './MarkdownText';

interface Props {
  messages: ChatMessage[];
  pending: boolean;
  t: ReturnType<typeof translator>;
}

/** The last thing the character said. Skips the user's own lines. */
function lastSpoken(messages: ChatMessage[]): ChatMessage | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message && message.role !== 'user') return message;
  }
  return null;
}

export function SpeechArea({ messages, pending, t }: Props) {
  const latest = messages.at(-1) ?? null;
  const awaiting = latest && latest.role === 'user' ? latest : null;
  const spoken = lastSpoken(messages);

  return (
    <section className="speech" data-testid="speech-area">
      {awaiting ? (
        <p className="speech-echo" data-testid="speech-echo">
          <span className="visually-hidden">{t('speech.you')}: </span>
          {awaiting.text}
        </p>
      ) : null}

      {spoken ? (
        <div
          className="speech-caption speech-balloon"
          data-kind={spoken.kind}
          role="status"
          aria-live="polite"
          data-testid={`speech-caption-${spoken.kind}`}
        >
          <MarkdownText text={spoken.text} />
        </div>
      ) : awaiting ? null : (
        <p className="speech-caption speech-caption-idle" data-testid="speech-caption-idle">
          {t('speech.waiting')}
        </p>
      )}

      {pending ? (
        <span className="speech-typing" role="status" data-testid="speech-typing">
          {/* Three dots say nothing out loud. The label is what a screen reader
              gets, and it is the same wording as the stat strip's in-flight
              marker rather than a second vocabulary for the same state. */}
          <span className="visually-hidden">{t('stat.updating')}</span>
          <i aria-hidden="true" />
          <i aria-hidden="true" />
          <i aria-hidden="true" />
        </span>
      ) : null}
    </section>
  );
}

/**
 * The full conversation, raised over the screen rather than replacing the
 * caption in place.
 *
 * A sheet keeps the character visible above it, which is what makes the log feel
 * like a record of the conversation rather than a different screen.
 */
export function ConversationSheet({
  messages,
  t,
  onClose,
}: {
  messages: ChatMessage[];
  t: ReturnType<typeof translator>;
  onClose: () => void;
}) {
  return (
    <div className="sheet-layer" data-testid="conversation-sheet-layer">
      <button
        type="button"
        className="sheet-scrim"
        aria-label={t('skill.close')}
        onClick={onClose}
        data-testid="conversation-sheet-scrim"
      />
      <div className="sheet" role="dialog" aria-modal="true" data-testid="conversation-log">
        <div className="sheet-header">
          <span className="sheet-grip" aria-hidden="true" />
          <h2 className="sheet-title">{t('character.log')}</h2>
          <button
            type="button"
            className="text-button"
            onClick={onClose}
            data-testid="conversation-sheet-close"
          >
            {t('skill.close')}
          </button>
        </div>

        <div className="sheet-body log">
          {messages.map((message) => (
            <SpeechBubble key={message.id} message={message} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Renders `message.text` and nothing else.
 *
 * This component has no numeric props and no access to stats. That absence is
 * what makes FE-R-1 structural rather than procedural - there is no path from
 * here to the stat display, so prose cannot become a stat by accident.
 */
function SpeechBubble({ message }: { message: ChatMessage }) {
  return (
    <div
      className="bubble"
      data-role={message.role}
      data-kind={message.kind}
      data-testid={`speech-bubble-${message.kind}`}
    >
      {message.role === 'user' ? message.text : <MarkdownText text={message.text} />}
    </div>
  );
}
