#!/usr/bin/env node
// PreToolUse hook: block Write/Edit on src/locales/** when the incoming text
// contains an em dash (—). Keeps translation JSON (en + sq) free of em dashes.
// Reads the hook payload as JSON on stdin; emits a deny decision when it hits.

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    process.exit(0); // malformed payload — don't block
  }

  const input = payload.tool_input || {};
  const filePath = String(input.file_path || '').replace(/\\/g, '/');

  // Only guard translation locale files.
  if (!/\/src\/locales\//.test(filePath) && !/^src\/locales\//.test(filePath)) {
    process.exit(0);
  }

  // Write uses `content`; Edit uses `old_string`/`new_string`.
  const text = `${input.content || ''}${input.new_string || ''}`;
  if (text.includes('—')) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason:
            'Em dashes (—) are not allowed in src/locales translation files. Use a comma, "and", "like", or a colon instead.',
        },
      })
    );
  }
  process.exit(0);
});
