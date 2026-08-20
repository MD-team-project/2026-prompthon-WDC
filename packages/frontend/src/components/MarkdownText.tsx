/**
 * Renders a character's reply as Markdown - bold, lists, line breaks - instead
 * of showing `**` and `-` as literal characters. No raw HTML (react-markdown
 * never renders it unless a rehype plugin is told to), so this stays as safe
 * as plain text was: nothing here is a path from model output to injected
 * markup.
 *
 * Deliberately no heading/table/image support - a chat reply is a couple of
 * short lines, not a document. Anything react-markdown would render as a
 * block (paragraphs, list items) is remapped to `span` so multi-line replies
 * still read as one flowing caption/bubble rather than stacked document
 * blocks with their own margins.
 */
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';

const components = {
  p: 'span',
  li: 'span',
  ul: 'span',
  ol: 'span',
  h1: 'strong',
  h2: 'strong',
  h3: 'strong',
} as const;

export function MarkdownText({ text }: { text: string }) {
  return (
    <ReactMarkdown
      // A single newline (how a short reply actually breaks lines) becomes a
      // <br> instead of being swallowed into one run-on line, the way plain
      // commonmark treats it.
      remarkPlugins={[remarkBreaks]}
      allowedElements={['p', 'strong', 'em', 'ul', 'ol', 'li', 'br', 'h1', 'h2', 'h3']}
      components={components}
    >
      {text}
    </ReactMarkdown>
  );
}
