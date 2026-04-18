import { escapeHtml } from '@/lib/html-escape';

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('escapes less-than', () => {
    expect(escapeHtml('a < b')).toBe('a &lt; b');
  });

  it('escapes greater-than', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes double quote', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes single quote', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('escapes a full <script> payload', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    );
  });

  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('returns plain text with no special chars unchanged', () => {
    expect(escapeHtml('hello world 123')).toBe('hello world 123');
  });

  it('escapes & before other entities — prevents double-escaping', () => {
    // Input already contains an entity-like sequence `&lt;`
    // Correct behavior: the `&` is escaped first → `&amp;lt;`
    // Wrong order would leave `&lt;` unchanged (looking like a valid entity)
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('neutralizes an <img onerror> XSS payload', () => {
    const payload = '<img src=x onerror="alert(1)">';
    const result = escapeHtml(payload);
    expect(result).not.toContain('<');
    expect(result).not.toContain('"');
    expect(result).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  });
});
