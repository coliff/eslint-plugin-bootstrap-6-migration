"use strict";

function maskNonTemplateRegions(source) {
  let s = source;
  s = s.replace(/^---[\s\S]*?^---\s*\r?\n/m, (m) => " ".repeat(m.length));
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => " ".repeat(m.length));
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (m) => " ".repeat(m.length));
  return s;
}

function fixResponsiveInfix(whole) {
  const r = /^(.+?)-(sm|md|lg|xl|xxl)-(.+)$/;
  const m = whole.match(r);
  if (!m) {
    return null;
  }
  return `${m[2]}:${m[1]}-${m[3]}`;
}

function fixBreakpointSuffix(whole) {
  const m = whole.match(/^(container|navbar-expand|offcanvas)-(sm|md|lg|xl|xxl)$/);
  if (!m) {
    return null;
  }
  const [, name, bp] = m;
  if (name === "offcanvas") {
    return null;
  }
  return `${bp}:${name}`;
}

const FS_V5_TO_V6 = {
  1: "fs-4xl",
  2: "fs-3xl",
  3: "fs-2xl",
  4: "fs-xl",
  5: "fs-lg",
  6: "fs-md",
};

const PATTERNS = [
  {
    regex:
      /\b(?:col|offset|row-cols|g|gx|gy|d|pe|ps|pt|pb|px|py|mt|mb|ms|me|mx|my|gap|flex|order|float|text|w|max-w|min-vw|align-items|align-content|align-self|justify-content|table-responsive|list-group-horizontal|sticky|vstack|hstack)-(?:sm|md|lg|xl|xxl)-[a-z0-9-]+/g,
    describe: "responsive utility with v5 infix (e.g. col-md-6); use v6 prefix syntax (md:col-6)",
    fix: fixResponsiveInfix,
  },
  {
    regex: /\b(?:container|navbar-expand|offcanvas)-(?:sm|md|lg|xl|xxl)\b/g,
    describe: "v5 container/navbar-expand/offcanvas breakpoint suffix; use sm:container, md:navbar-expand, etc.",
    fix: fixBreakpointSuffix,
  },
  {
    regex: /\bmodal-(?:dialog|content|header|body|footer|title|backdrop|sm|lg|xl|fullscreen)\b/g,
    describe: "v5 Modal classes; use .dialog, .dialog-header, etc.",
  },
  {
    regex: /\boffcanvas-(?:start|end|top|bottom|header|body|title)\b/g,
    describe: "v5 Offcanvas classes; use .drawer-*",
  },
  {
    regex: /\bdropdown-(?:menu|item|divider|header|toggle-split|toggle)\b/g,
    describe: "v5 Dropdown classes; use .menu, .menu-item, etc.",
  },
  {
    regex: /\bform-select\b/g,
    describe: "v5 form-select; use .form-control on <select>",
    fix: () => "form-control",
  },
  {
    regex: /\bform-(?:check|check-inline|check-input|check-label)\b/g,
    describe: "v5 form-check; use .form-field, .radio, or .check",
  },
  {
    regex: /\bbtn-(?:primary|secondary|success|danger|warning|info|light|dark)\b/g,
    describe: "v5 btn-* color; use .btn-solid .theme-* or .btn-outline .theme-* (.btn-link remains valid)",
    fix: (whole) => {
      const m = whole.match(/^btn-(primary|secondary|success|danger|warning|info|light|dark)$/);
      return m ? `btn-solid theme-${m[1]}` : null;
    },
  },
  {
    regex: /\bbtn-outline-(?:primary|secondary|success|danger|warning|info|light|dark)\b/g,
    describe: "v5 btn-outline-*; use .btn-outline .theme-*",
    fix: (whole) => {
      const m = whole.match(/^btn-outline-(primary|secondary|success|danger|warning|info|light|dark)$/);
      return m ? `btn-outline theme-${m[1]}` : null;
    },
  },
  {
    regex: /\btext-(?:primary|secondary|success|danger|warning|info|muted)\b/g,
    describe:
      "v5 text-* semantic colors; use .fg-* (not text-center, contrast utilities like text-light/white, or text-body-*)",
    fix: (whole) => {
      const m = whole.match(/^text-(primary|secondary|success|danger|warning|info|muted)$/);
      return m ? `fg-${m[1]}` : null;
    },
  },
  {
    regex: /\balert-(?:primary|secondary|success|danger|warning|info|light|dark)\b/g,
    describe: "v5 alert-* variant; use .alert .theme-*",
    fix: (whole) => {
      const m = whole.match(/^alert-(primary|secondary|success|danger|warning|info|light|dark)$/);
      return m ? `theme-${m[1]}` : null;
    },
  },
  {
    regex: /\bbadge\s+bg-(?:primary|secondary|success|danger|warning|info|light|dark)\b/g,
    describe: "v5 badge bg-*; use .badge-subtle .theme-*",
    fix: (whole) => {
      const m = whole.match(/^badge\s+bg-(primary|secondary|success|danger|warning|info|light|dark)$/);
      return m ? `badge-subtle theme-${m[1]}` : null;
    },
  },
  {
    regex: /\bfs-[1-6]\b/g,
    describe: "v5 numeric font-size utilities; use .fs-4xl, .fs-md, etc.",
    fix: (whole) => {
      const m = whole.match(/^fs-([1-6])$/);
      return m && FS_V5_TO_V6[m[1]] ? FS_V5_TO_V6[m[1]] : null;
    },
  },
  {
    regex: /\bclearfix\b/g,
    describe: "v5 .clearfix; use .d-flow-root",
    fix: () => "d-flow-root",
  },
  {
    regex: /\b(?:needs-validation|was-validated)\b/g,
    describe: "v5 validation classes; use data-bs-validate on forms",
  },
  {
    regex: /data-bs-toggle="(?:modal|offcanvas|dropdown)"/g,
    describe: "v5 data-bs-toggle value; use dialog, drawer, or menu",
    fix: (whole) =>
      whole
        .replace('data-bs-toggle="modal"', 'data-bs-toggle="dialog"')
        .replace('data-bs-toggle="offcanvas"', 'data-bs-toggle="drawer"')
        .replace('data-bs-toggle="dropdown"', 'data-bs-toggle="menu"'),
  },
  {
    regex: /data-bs-dismiss="(?:modal|offcanvas|dropdown)"/g,
    describe: "v5 data-bs-dismiss value; use dialog, drawer, or menu",
    fix: (whole) =>
      whole
        .replace('data-bs-dismiss="modal"', 'data-bs-dismiss="dialog"')
        .replace('data-bs-dismiss="offcanvas"', 'data-bs-dismiss="drawer"')
        .replace('data-bs-dismiss="dropdown"', 'data-bs-dismiss="menu"'),
  },
];

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Bootstrap v5 class and attribute patterns in favor of Bootstrap v6 (see .github/skills/bootstrap-v5-v6-migration.md).",
    },
    messages: {
      forbidden:
        "Bootstrap v5-only pattern detected ({{hint}}). Use Bootstrap v6 equivalents per .github/skills/bootstrap-v5-v6-migration.md.",
    },
    fixable: "code",
    schema: [],
  },

  create(context) {
    const sourceCode = context.getSourceCode();

    return {
      Program() {
        const text = maskNonTemplateRegions(sourceCode.getText());
        const seen = new Set();

        for (const entry of PATTERNS) {
          const { regex, describe, fix: fixFn } = entry;
          const r = new RegExp(regex.source, regex.flags);
          let m;
          while ((m = r.exec(text))) {
            const start = m.index;
            if (seen.has(start)) {
              continue;
            }
            seen.add(start);
            const end = start + m[0].length;
            const matchedText = m[0];
            const replacement = fixFn ? fixFn(matchedText) : null;

            context.report({
              loc: {
                start: sourceCode.getLocFromIndex(start),
                end: sourceCode.getLocFromIndex(end),
              },
              messageId: "forbidden",
              data: { hint: describe },
              ...(replacement != null && replacement !== matchedText
                ? {
                    fix(fixer) {
                      return fixer.replaceTextRange([start, end], replacement);
                    },
                  }
                : {}),
            });
          }
        }
      },
    };
  },
};
