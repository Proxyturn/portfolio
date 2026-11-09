/**
 * Lighthouse CI budgets (spec, section 8): mobile profile.
 * The URL comes from the preview workflow (--collect.url). For protected Vercel previews the
 * bypass header is passed through LHCI_EXTRA_HEADERS as JSON.
 */
const extraHeaders = (() => {
  try {
    return JSON.parse(process.env.LHCI_EXTRA_HEADERS || '{}');
  } catch {
    return {};
  }
})();

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      settings: {
        formFactor: 'mobile',
        screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75 },
        throttlingMethod: 'simulate',
        extraHeaders,
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
