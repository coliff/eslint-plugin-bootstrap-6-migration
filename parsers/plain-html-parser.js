"use strict";

/**
 * Minimal ESLint parser so HTML files are treated as a single source string
 * (see rules/no-v5-classes.js). ESLint has no built-in HTML parser.
 */
module.exports = {
  parseForESLint(code) {
    const lines = code.split(/\r\n|\r|\n/);
    const lastLine = lines.length;
    const lastLineText = lines[lines.length - 1] ?? "";
    return {
      ast: {
        type: "Program",
        body: [],
        range: [0, code.length],
        sourceType: "module",
        tokens: [],
        comments: [],
        loc: {
          start: { line: 1, column: 0 },
          end: { line: lastLine, column: lastLineText.length },
        },
      },
      scopeManager: null,
      visitorKeys: {
        Program: [],
      },
    };
  },
};
