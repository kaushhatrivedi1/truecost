/**
 * Unit tests for Priority 2 platform adapters: Perplexity, Mistral, Copilot
 *
 * Tests cover:
 * 1. Selector fallback logic (mock DOM)
 * 2. setText event dispatch (React-compatible input + change events)
 * 3. Copilot iframe context search and main-document fallback
 * 4. Graceful degradation when no selector matches
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

// ─── Perplexity Adapter ───────────────────────────────────────────────────────

describe('Perplexity Adapter', () => {
  let perplexity;

  beforeEach(async () => {
    jest.resetModules();
    perplexity = await import('../perplexity.js');
    perplexity.teardown();
  });

  afterEach(() => {
    perplexity.teardown();
    document.body.innerHTML = '';
  });

  // ── Selector fallback tests ──────────────────────────────────────────────

  describe('Selector fallback — textarea[placeholder] (first priority)', () => {
    it('finds textarea[placeholder] when present', () => {
      document.body.innerHTML = '<textarea placeholder="Ask anything..."></textarea>';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      perplexity.init();
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('reads value from textarea[placeholder]', () => {
      document.body.innerHTML = '<textarea placeholder="Ask anything..."></textarea>';
      perplexity.init();
      const el = document.querySelector('textarea[placeholder]');
      el.value = 'perplexity prompt';
      expect(perplexity.getText()).toBe('perplexity prompt');
    });
  });

  describe('Selector fallback — [data-testid="search-input"] (second priority)', () => {
    it('falls back to [data-testid="search-input"] when textarea[placeholder] is absent', () => {
      document.body.innerHTML = '<textarea data-testid="search-input"></textarea>';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      perplexity.init();
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('reads value from [data-testid="search-input"]', () => {
      document.body.innerHTML = '<textarea data-testid="search-input"></textarea>';
      perplexity.init();
      const el = document.querySelector('[data-testid="search-input"]');
      el.value = 'search fallback';
      expect(perplexity.getText()).toBe('search fallback');
    });
  });

  describe('Selector fallback — textarea (third priority)', () => {
    it('falls back to bare textarea when higher-priority selectors are absent', () => {
      document.body.innerHTML = '<textarea></textarea>';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      perplexity.init();
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('reads value from bare textarea', () => {
      document.body.innerHTML = '<textarea></textarea>';
      perplexity.init();
      const el = document.querySelector('textarea');
      el.value = 'bare textarea fallback';
      expect(perplexity.getText()).toBe('bare textarea fallback');
    });
  });

  // ── setText event dispatch tests ─────────────────────────────────────────

  describe('setText event dispatch', () => {
    it('dispatches input event with bubbles:true', () => {
      document.body.innerHTML = '<textarea placeholder="Ask anything..."></textarea>';
      perplexity.init();

      const el = document.querySelector('textarea');
      const inputEvents = [];
      el.addEventListener('input', (e) => inputEvents.push(e));

      perplexity.setText('test text');

      expect(inputEvents).toHaveLength(1);
      expect(inputEvents[0].bubbles).toBe(true);
    });

    it('dispatches change event with bubbles:true', () => {
      document.body.innerHTML = '<textarea placeholder="Ask anything..."></textarea>';
      perplexity.init();

      const el = document.querySelector('textarea');
      const changeEvents = [];
      el.addEventListener('change', (e) => changeEvents.push(e));

      perplexity.setText('test text');

      expect(changeEvents).toHaveLength(1);
      expect(changeEvents[0].bubbles).toBe(true);
    });

    it('sets element.value before dispatching events', () => {
      document.body.innerHTML = '<textarea placeholder="Ask anything..."></textarea>';
      perplexity.init();

      perplexity.setText('injected value');

      expect(perplexity.getText()).toBe('injected value');
    });
  });

  // ── Graceful degradation tests ───────────────────────────────────────────

  describe('Graceful degradation', () => {
    it('logs a warning when no selector matches', () => {
      document.body.innerHTML = '<div>no textarea here</div>';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => perplexity.init()).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        '[Trace] Could not locate textarea on perplexity'
      );

      warnSpy.mockRestore();
    });

    it('does not throw when no selector matches', () => {
      document.body.innerHTML = '';
      expect(() => perplexity.init()).not.toThrow();
    });

    it('returns empty string from getText when no element found', () => {
      document.body.innerHTML = '';
      perplexity.init();
      expect(perplexity.getText()).toBe('');
    });
  });
});

// ─── Mistral Adapter ──────────────────────────────────────────────────────────

describe('Mistral Adapter', () => {
  let mistral;

  beforeEach(async () => {
    jest.resetModules();
    mistral = await import('../mistral.js');
    mistral.teardown();
  });

  afterEach(() => {
    mistral.teardown();
    document.body.innerHTML = '';
  });

  // ── Selector fallback tests ──────────────────────────────────────────────

  describe('Selector fallback — textarea[placeholder] (first priority)', () => {
    it('finds textarea[placeholder] when present', () => {
      document.body.innerHTML = '<textarea placeholder="Message Mistral..."></textarea>';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mistral.init();
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('reads value from textarea[placeholder]', () => {
      document.body.innerHTML = '<textarea placeholder="Message Mistral..."></textarea>';
      mistral.init();
      const el = document.querySelector('textarea[placeholder]');
      el.value = 'mistral prompt';
      expect(mistral.getText()).toBe('mistral prompt');
    });
  });

  describe('Selector fallback — [data-testid="chat-input"] (second priority)', () => {
    it('falls back to [data-testid="chat-input"] when textarea[placeholder] is absent', () => {
      document.body.innerHTML = '<textarea data-testid="chat-input"></textarea>';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mistral.init();
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('reads value from [data-testid="chat-input"]', () => {
      document.body.innerHTML = '<textarea data-testid="chat-input"></textarea>';
      mistral.init();
      const el = document.querySelector('[data-testid="chat-input"]');
      el.value = 'chat input fallback';
      expect(mistral.getText()).toBe('chat input fallback');
    });
  });

  describe('Selector fallback — textarea (third priority)', () => {
    it('falls back to bare textarea when higher-priority selectors are absent', () => {
      document.body.innerHTML = '<textarea></textarea>';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mistral.init();
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('reads value from bare textarea', () => {
      document.body.innerHTML = '<textarea></textarea>';
      mistral.init();
      const el = document.querySelector('textarea');
      el.value = 'bare textarea fallback';
      expect(mistral.getText()).toBe('bare textarea fallback');
    });
  });

  // ── setText event dispatch tests ─────────────────────────────────────────

  describe('setText event dispatch', () => {
    it('dispatches input event with bubbles:true', () => {
      document.body.innerHTML = '<textarea placeholder="Message Mistral..."></textarea>';
      mistral.init();

      const el = document.querySelector('textarea');
      const inputEvents = [];
      el.addEventListener('input', (e) => inputEvents.push(e));

      mistral.setText('test text');

      expect(inputEvents).toHaveLength(1);
      expect(inputEvents[0].bubbles).toBe(true);
    });

    it('dispatches change event with bubbles:true', () => {
      document.body.innerHTML = '<textarea placeholder="Message Mistral..."></textarea>';
      mistral.init();

      const el = document.querySelector('textarea');
      const changeEvents = [];
      el.addEventListener('change', (e) => changeEvents.push(e));

      mistral.setText('test text');

      expect(changeEvents).toHaveLength(1);
      expect(changeEvents[0].bubbles).toBe(true);
    });

    it('sets element.value before dispatching events', () => {
      document.body.innerHTML = '<textarea placeholder="Message Mistral..."></textarea>';
      mistral.init();

      mistral.setText('injected value');

      expect(mistral.getText()).toBe('injected value');
    });
  });

  // ── Graceful degradation tests ───────────────────────────────────────────

  describe('Graceful degradation', () => {
    it('logs a warning when no selector matches', () => {
      document.body.innerHTML = '<div>no textarea here</div>';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => mistral.init()).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        '[Trace] Could not locate textarea on mistral'
      );

      warnSpy.mockRestore();
    });

    it('does not throw when no selector matches', () => {
      document.body.innerHTML = '';
      expect(() => mistral.init()).not.toThrow();
    });

    it('returns empty string from getText when no element found', () => {
      document.body.innerHTML = '';
      mistral.init();
      expect(mistral.getText()).toBe('');
    });
  });
});

// ─── Copilot Adapter ──────────────────────────────────────────────────────────

describe('Copilot Adapter', () => {
  let copilot;

  beforeEach(async () => {
    jest.resetModules();
    copilot = await import('../copilot.js');
    copilot.teardown();
  });

  afterEach(() => {
    copilot.teardown();
    document.body.innerHTML = '';
  });

  // ── Iframe context search tests ──────────────────────────────────────────

  describe('Iframe contentDocument search (first priority)', () => {
    it('finds textarea inside iframe contentDocument when available', () => {
      // jsdom does not support real iframes with contentDocument, so we mock
      // the iframe element with a fake contentDocument
      const fakeTextarea = document.createElement('textarea');
      fakeTextarea.placeholder = 'Ask Copilot...';

      const fakeIframeDoc = {
        querySelector: (selector) => {
          // Match textarea[placeholder] or textarea
          if (selector === 'textarea[placeholder]' || selector === 'textarea') {
            return fakeTextarea;
          }
          return null;
        },
      };

      const fakeIframe = document.createElement('iframe');
      Object.defineProperty(fakeIframe, 'contentDocument', {
        get: () => fakeIframeDoc,
        configurable: true,
      });

      // Stub document.querySelector to return our fake iframe
      const originalQuerySelector = document.querySelector.bind(document);
      jest.spyOn(document, 'querySelector').mockImplementation((selector) => {
        if (selector === 'iframe') return fakeIframe;
        return originalQuerySelector(selector);
      });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      copilot.init();

      // Should have found the element without warning
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
      jest.restoreAllMocks();
    });

    it('reads value from textarea inside iframe contentDocument', () => {
      const fakeTextarea = document.createElement('textarea');
      fakeTextarea.value = 'copilot iframe prompt';

      const fakeIframeDoc = {
        querySelector: (selector) => {
          if (selector === 'textarea[placeholder]') return null;
          if (selector === '[data-testid="chat-input"]') return null;
          if (selector === 'textarea') return fakeTextarea;
          return null;
        },
      };

      const fakeIframe = document.createElement('iframe');
      Object.defineProperty(fakeIframe, 'contentDocument', {
        get: () => fakeIframeDoc,
        configurable: true,
      });

      const originalQuerySelector = document.querySelector.bind(document);
      jest.spyOn(document, 'querySelector').mockImplementation((selector) => {
        if (selector === 'iframe') return fakeIframe;
        return originalQuerySelector(selector);
      });

      copilot.init();
      expect(copilot.getText()).toBe('copilot iframe prompt');

      jest.restoreAllMocks();
    });
  });

  describe('Main document fallback (when no iframe)', () => {
    it('falls back to main document when no iframe is present', () => {
      document.body.innerHTML = '<textarea placeholder="Ask Copilot..."></textarea>';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      copilot.init();
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('reads value from main document textarea when no iframe', () => {
      document.body.innerHTML = '<textarea placeholder="Ask Copilot..."></textarea>';
      copilot.init();
      const el = document.querySelector('textarea');
      el.value = 'main doc prompt';
      expect(copilot.getText()).toBe('main doc prompt');
    });

    it('falls back to main document when iframe has no contentDocument', () => {
      document.body.innerHTML = '<textarea placeholder="Ask Copilot..."></textarea>';

      // Add an iframe with null contentDocument
      const fakeIframe = document.createElement('iframe');
      Object.defineProperty(fakeIframe, 'contentDocument', {
        get: () => null,
        configurable: true,
      });

      const originalQuerySelector = document.querySelector.bind(document);
      jest.spyOn(document, 'querySelector').mockImplementation((selector) => {
        if (selector === 'iframe') return fakeIframe;
        return originalQuerySelector(selector);
      });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      copilot.init();
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
      jest.restoreAllMocks();
    });
  });

  // ── Selector fallback tests (main document) ──────────────────────────────

  describe('Selector fallback in main document', () => {
    it('finds textarea[placeholder] when present', () => {
      document.body.innerHTML = '<textarea placeholder="Ask Copilot..."></textarea>';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      copilot.init();
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('falls back to [data-testid="chat-input"] when textarea[placeholder] is absent', () => {
      document.body.innerHTML = '<textarea data-testid="chat-input"></textarea>';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      copilot.init();
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('falls back to bare textarea as last resort', () => {
      document.body.innerHTML = '<textarea></textarea>';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      copilot.init();
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  // ── setText event dispatch tests ─────────────────────────────────────────

  describe('setText event dispatch', () => {
    it('dispatches input event with bubbles:true', () => {
      document.body.innerHTML = '<textarea placeholder="Ask Copilot..."></textarea>';
      copilot.init();

      const el = document.querySelector('textarea');
      const inputEvents = [];
      el.addEventListener('input', (e) => inputEvents.push(e));

      copilot.setText('test text');

      expect(inputEvents).toHaveLength(1);
      expect(inputEvents[0].bubbles).toBe(true);
    });

    it('dispatches change event with bubbles:true', () => {
      document.body.innerHTML = '<textarea placeholder="Ask Copilot..."></textarea>';
      copilot.init();

      const el = document.querySelector('textarea');
      const changeEvents = [];
      el.addEventListener('change', (e) => changeEvents.push(e));

      copilot.setText('test text');

      expect(changeEvents).toHaveLength(1);
      expect(changeEvents[0].bubbles).toBe(true);
    });

    it('sets element.value before dispatching events', () => {
      document.body.innerHTML = '<textarea placeholder="Ask Copilot..."></textarea>';
      copilot.init();

      copilot.setText('injected value');

      expect(copilot.getText()).toBe('injected value');
    });
  });

  // ── Graceful degradation tests ───────────────────────────────────────────

  describe('Graceful degradation', () => {
    it('logs a warning when no selector matches', () => {
      document.body.innerHTML = '<div>no textarea here</div>';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => copilot.init()).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        '[Trace] Could not locate textarea on copilot'
      );

      warnSpy.mockRestore();
    });

    it('does not throw when no selector matches', () => {
      document.body.innerHTML = '';
      expect(() => copilot.init()).not.toThrow();
    });

    it('returns empty string from getText when no element found', () => {
      document.body.innerHTML = '';
      copilot.init();
      expect(copilot.getText()).toBe('');
    });
  });
});
