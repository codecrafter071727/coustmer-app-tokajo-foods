#!/usr/bin/env node
/**
 * NativeWind hoists react-native-css-interop; a nested copy under
 * nativewind/node_modules can be incomplete and break Metro with:
 *   Unable to resolve "../native/styles"
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const stylesFile = path.join(
  root,
  'node_modules',
  'react-native-css-interop',
  'dist',
  'runtime',
  'native',
  'styles.js'
);

if (!fs.existsSync(stylesFile)) {
  console.error(
    '[verify-css-interop] Missing react-native-css-interop runtime. Run: rm -rf node_modules && npm install'
  );
  process.exit(1);
}

const nested = path.join(
  root,
  'node_modules',
  'nativewind',
  'node_modules',
  'react-native-css-interop'
);

if (fs.existsSync(nested)) {
  const nestedStyles = path.join(nested, 'dist', 'runtime', 'native', 'styles.js');
  if (!fs.existsSync(nestedStyles)) {
    console.error(
      '[verify-css-interop] Incomplete nested react-native-css-interop under nativewind. Delete node_modules and reinstall.'
    );
    process.exit(1);
  }
}
