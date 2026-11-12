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

/**
 * Vercel serves previews with `X-Robots-Tag: noindex`, which fails the "is-crawlable" audit
 * (SEO 60) by design. The preview workflow sets LHCI_PREVIEW=true for previews only, so that
 * one audit is skipped there; production keeps every SEO audit.
 */
const isPreview = process.env.LHCI_PREVIEW === 'true';

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      settings: {
        formFactor: 'mobile',
        screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75 },
        throttlingMethod: 'simulate',
        extraHeaders,
        ...(isPreview ? { skipAudits: ['is-crawlable'] } : {}),
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
    // Reports stay local (the preview workflow attaches them as an artifact). Lighthouse copies
    // extraHeaders into every report, so a public upload would publish the bypass secret.
    upload: { target: 'filesystem', outputDir: '.lighthouseci/reports' },
  },
};
