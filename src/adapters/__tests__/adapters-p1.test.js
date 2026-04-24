/**
 * Unit tests for Priority 1 platform adapters: ChatGPT, Claude, Gemini
 *
 * Tests cover:
 * 1. Selector fallback logic (mock DOM)
 * 2. setText event dispatch
 * 3. Debounce timing (Jest fake timers)
 * 4. Graceful degradation when no selector matches
 *
 * Requirements: 1.1–1.6, 2.1–2.6, 3.1–3.6
 */

// ─── ChatGPT Adapter ─────────────────────────────────────────────────────────

describe('ChatGPT Adapter', () => {
  let chatgpt;

  beforeEach(async () => {
    // Reset module state between tests by re-importing fresh
    jest.resetModules();
    chatgpt = await import('../chatgpt.js');
    // Always teardown before each test to reset module-level state
    chatgpt.teardown();
  });

  afterEach(() => {
    chatgpt.teardown();
    document.body.innerHTML = '';
  });

  // ── Selector fallback tests ──────────────────────────────────────────────

  describe('Selector fallback — #prompt-textarea (first priority)', () => {
    it('finds #prompt-textarea when present', () => {
      document.body.innerHTML = '<textarea id="prompt-textarea"></textarea>';
      chatgpt.init();
      expect(chatgpt.getText()).toBeDefined();
    });
  });

  describe('Selector fallback — [data-id="root"] textarea (second priority)', () => {
    it('falls back to [data-id="root"] textarea when #prompt-textarea is absent', () => {
      document.body.innerHTML = '<div data-id="root"><textarea></textarea></div>';
      chatgpt.init();
      const el = document.querySelector('[data-id="root"] textarea');
      el.value = 'hello fallback';
      expect(chatgpt.getText()).toBe('hello fallback');
    });
  });

  describe('Selector fallback — form textarea (third priority)', () => {
    it('falls back to form textarea when higher-priority selectors are absent', () => {
      document.body.innerHTML = '<form><textarea></textarea></form>';
      chatgpt.init();
      const el = document.querySelector('form textarea');
      el.value = 'form fallback';
      expect(chatgpt.getText()).toBe('form fallback');
    });
  });

  // ── setText event dispatch tests ─────────────────────────────────────────

  describe('setText event dispatch', () => {
    it('dispatches input event with bubbles:true', () => {
      document.body.innerHTML = '<textarea id="prompt-textarea"></textarea>';
      chatgpt.init();

      const el = document.querySelector('#prompt-textarea');
      const inputEvents = [];
      el.addEventListener('input', (e) => inputEvents.push(e));

      chatgpt.setText('test text');

      expect(inputEvents).toHaveLength(1);
      expect(inputEvents[0].bubbles).toBe(true);
    });

    it('dispatches change event with bubbles:true', () => {
      document.body.innerHTML = '<textarea id="prompt-textarea"></textarea>';
      chatgpt.init();

      const el = document.querySelector('#prompt-textarea');
      const changeEvents = [];
      el.addEventListener('change', (e) => changeEvents.push(e));

      chatgpt.setText('test text');

      expect(changeEvents).toHaveLength(1);
      expect(changeEvents[0].bubbles).toBe(true);
    });

    it('sets element.value before dispatching events', () => {
      document.body.innerHTML = '<textarea id="prompt-textarea"></textarea>';
      chatgpt.init();

      chatgpt.setText('injected value');

      expect(chatgpt.getText()).toBe('injected value');
    });
  });

  // ── Debounce timing tests ────────────────────────────────────────────────

  describe('Debounce timing', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('does not call the callback immediately on input', () => {
      document.body.innerHTML = '<textarea id="prompt-textarea"></textarea>';
      const callback = jest.fn();
      chatgpt.init(callback);

      const el = document.querySelector('#prompt-textarea');
      el.dispatchEvent(new Event('input', { bubbles: true }));

      expect(callback).not.toHaveBeenCalled();
    });

    it('calls the callback after 800ms', () => {
      document.body.innerHTML = '<textarea id="prompt-textarea"></textarea>';
      const callback = jest.fn();
      chatgpt.init(callback);

      const el = document.querySelector('#prompt-textarea');
      el.dispatchEvent(new Event('input', { bubbles: true }));

      jest.advanceTimersByTime(800);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('resets the debounce timer on rapid input', () => {
      document.body.innerHTML = '<textarea id="prompt-textarea"></textarea>';
      const callback = jest.fn();
      chatgpt.init(callback);

      const el = document.querySelector('#prompt-textarea');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      jest.advanceTimersByTime(400);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      jest.advanceTimersByTime(400);

      // Only 400ms since last event — should not have fired yet
      expect(callback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(400);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // ── Graceful degradation tests ───────────────────────────────────────────

  describe('Graceful degradation', () => {
    it('logs a warning when no selector matches', () => {
      document.body.innerHTML = '<div>no textarea here</div>';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => chatgpt.init()).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        '[Trace] Could not locate textarea on chatgpt'
      );

      warnSpy.mockRestore();
    });

    it('does not throw when no selector matches', () => {
      document.body.innerHTML = '';
      expect(() => chatgpt.init()).not.toThrow();
    });
  });
});

// ─── Claude Adapter ───────────────────────────────────────────────────────────

describe('Claude Adapter', () => {
  let claude;

  beforeEach(async () => {
    jest.resetModules();
    claude = await import('../claude.js');
    claude.teardown();
  });

  afterEach(() => {
    claude.teardown();
    document.body.innerHTML = '';
  });

  // ── Selector fallback tests ──────────────────────────────────────────────

  describe('Selector fallback — .ProseMirror (first priority)', () => {
    it('finds .ProseMirror when present and does not warn', () => {
      document.body.innerHTML = '<div class="ProseMirror" contenteditable="true"></div>';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      claude.init();
      // Confirm the element was found (no warning logged)
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('Selector fallback — [contenteditable="true"] (second priority)', () => {
    it('falls back to contenteditable when .ProseMirror is absent', () => {
      document.body.innerHTML = '<div contenteditable="true"></div>';
      // Confirm no warning is logged — element was found
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      claude.init();
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('Selector fallback — div[data-placeholder] (third priority)', () => {
    it('falls back to div[data-placeholder] when higher-priority selectors are absent', () => {
      document.body.innerHTML = '<div data-placeholder="Type a message..."></div>';
      // Confirm no warning is logged — element was found
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      claude.init();
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  // ── setText event dispatch tests ─────────────────────────────────────────

  describe('setText via execCommand', () => {
    beforeEach(() => {
      // jsdom does not implement execCommand; define it so we can spy on it
      if (!document.execCommand) {
        document.execCommand = () => false;
      }
    });

    it('calls document.execCommand("selectAll")', () => {
      document.body.innerHTML = '<div class="ProseMirror" contenteditable="true"></div>';
      claude.init();

      const execCommandSpy = jest.spyOn(document, 'execCommand').mockImplementation(() => true);

      claude.setText('hello claude');

      expect(execCommandSpy).toHaveBeenCalledWith('selectAll');
      execCommandSpy.mockRestore();
    });

    it('calls document.execCommand("insertText", false, text)', () => {
      document.body.innerHTML = '<div class="ProseMirror" contenteditable="true"></div>';
      claude.init();

      const execCommandSpy = jest.spyOn(document, 'execCommand').mockImplementation(() => true);

      claude.setText('hello claude');

      expect(execCommandSpy).toHaveBeenCalledWith('insertText', false, 'hello claude');
      execCommandSpy.mockRestore();
    });
  });

  // ── Debounce timing tests ────────────────────────────────────────────────

  describe('Debounce timing', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('does not call the callback immediately on input', () => {
      document.body.innerHTML = '<div class="ProseMirror" contenteditable="true"></div>';
      const callback = jest.fn();
      claude.init(callback);

      const el = document.querySelector('.ProseMirror');
      el.dispatchEvent(new Event('input', { bubbles: true }));

      expect(callback).not.toHaveBeenCalled();
    });

    it('calls the callback after 800ms', () => {
      document.body.innerHTML = '<div class="ProseMirror" contenteditable="true"></div>';
      const callback = jest.fn();
      claude.init(callback);

      const el = document.querySelector('.ProseMirror');
      el.dispatchEvent(new Event('input', { bubbles: true }));

      jest.advanceTimersByTime(800);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // ── Graceful degradation tests ───────────────────────────────────────────

  describe('Graceful degradation', () => {
    it('logs a warning when no selector matches', () => {
      document.body.innerHTML = '<div>no editor here</div>';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => claude.init()).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        '[Trace] Could not locate textarea on claude'
      );

      warnSpy.mockRestore();
    });

    it('does not throw when no selector matches', () => {
      document.body.innerHTML = '';
      expect(() => claude.init()).not.toThrow();
    });
  });
});

// ─── Gemini Adapter ───────────────────────────────────────────────────────────

describe('Gemini Adapter', () => {
  let gemini;

  beforeEach(async () => {
    jest.resetModules();
    gemini = await import('../gemini.js');
    gemini.teardown();
  });

  afterEach(() => {
    gemini.teardown();
    document.body.innerHTML = '';
  });

  // ── Selector fallback tests ──────────────────────────────────────────────

  describe('Selector fallback — rich-textarea textarea (first priority)', () => {
    it('finds rich-textarea textarea when present', () => {
      document.body.innerHTML = '<rich-textarea><textarea></textarea></rich-textarea>';
      gemini.init();
      const el = document.querySelector('rich-textarea textarea');
      el.value = 'gemini prompt';
      expect(gemini.getText()).toBe('gemini prompt');
    });
  });

  describe('Selector fallback — [data-test-id="input-area"] textarea (second priority)', () => {
    it('falls back to [data-test-id="input-area"] textarea when first selector is absent', () => {
      document.body.innerHTML = '<div data-test-id="input-area"><textarea></textarea></div>';
      gemini.init();
      const el = document.querySelector('[data-test-id="input-area"] textarea');
      el.value = 'fallback prompt';
      expect(gemini.getText()).toBe('fallback prompt');
    });
  });

  // ── queryShadowRoot helper ───────────────────────────────────────────────

  describe('queryShadowRoot helper', () => {
    it('finds elements in the regular DOM', () => {
      document.body.innerHTML = '<div id="target"></div>';
      const result = gemini.queryShadowRoot(document, '#target');
      expect(result).not.toBeNull();
      expect(result.id).toBe('target');
    });

    it('returns null when selector does not match', () => {
      document.body.innerHTML = '<div id="other"></div>';
      const result = gemini.queryShadowRoot(document, '#nonexistent');
      expect(result).toBeNull();
    });
  });

  // ── setText event dispatch tests ─────────────────────────────────────────

  describe('setText event dispatch', () => {
    it('dispatches input event with bubbles:true', () => {
      document.body.innerHTML = '<rich-textarea><textarea></textarea></rich-textarea>';
      gemini.init();

      const el = document.querySelector('rich-textarea textarea');
      const inputEvents = [];
      el.addEventListener('input', (e) => inputEvents.push(e));

      gemini.setText('gemini text');

      expect(inputEvents).toHaveLength(1);
      expect(inputEvents[0].bubbles).toBe(true);
    });

    it('dispatches change event with bubbles:true', () => {
      document.body.innerHTML = '<rich-textarea><textarea></textarea></rich-textarea>';
      gemini.init();

      const el = document.querySelector('rich-textarea textarea');
      const changeEvents = [];
      el.addEventListener('change', (e) => changeEvents.push(e));

      gemini.setText('gemini text');

      expect(changeEvents).toHaveLength(1);
      expect(changeEvents[0].bubbles).toBe(true);
    });

    it('sets element.value before dispatching events', () => {
      document.body.innerHTML = '<rich-textarea><textarea></textarea></rich-textarea>';
      gemini.init();

      gemini.setText('injected gemini value');

      expect(gemini.getText()).toBe('injected gemini value');
    });
  });

  // ── Debounce timing tests ────────────────────────────────────────────────

  describe('Debounce timing', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('does not call the callback immediately on input', () => {
      document.body.innerHTML = '<rich-textarea><textarea></textarea></rich-textarea>';
      const callback = jest.fn();
      gemini.init(callback);

      const el = document.querySelector('rich-textarea textarea');
      el.dispatchEvent(new Event('input', { bubbles: true }));

      expect(callback).not.toHaveBeenCalled();
    });

    it('calls the callback after 800ms', () => {
      document.body.innerHTML = '<rich-textarea><textarea></textarea></rich-textarea>';
      const callback = jest.fn();
      gemini.init(callback);

      const el = document.querySelector('rich-textarea textarea');
      el.dispatchEvent(new Event('input', { bubbles: true }));

      jest.advanceTimersByTime(800);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // ── Graceful degradation tests ───────────────────────────────────────────

  describe('Graceful degradation', () => {
    it('logs a warning when no selector matches', () => {
      document.body.innerHTML = '<div>no textarea here</div>';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => gemini.init()).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        '[Trace] Could not locate textarea on gemini'
      );

      warnSpy.mockRestore();
    });

    it('does not throw when no selector matches', () => {
      document.body.innerHTML = '';
      expect(() => gemini.init()).not.toThrow();
    });
  });
});
