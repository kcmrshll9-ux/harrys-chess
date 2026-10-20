'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const suites = [
  'real_input_capture_regression_20261020.cjs',
  'render_geometry_regression_20261020.cjs',
  'gameplay_lifecycle_regression.cjs',
  'gameplay_ai_regression.cjs',
  'ai_ui_slice_regression.cjs',
  'move_record_regression.cjs',
  'resize_regression.cjs',
];

let failures = 0;
for (const suite of suites) {
  const result = spawnSync(process.execPath, [path.join(__dirname, suite)], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    failures++;
    console.error(`FAIL ${suite}`);
    if (result.error) console.error(result.error.message);
    if (result.stdout) console.error(result.stdout.trim());
    if (result.stderr) console.error(result.stderr.trim());
  } else {
    console.log(`PASS ${suite}`);
  }
}

console.log(`${suites.length - failures}/${suites.length} regression suites passed.`);
process.exitCode = failures ? 1 : 0;
