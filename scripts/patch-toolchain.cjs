const fs = require('node:fs');
const path = require('node:path');
if (process.platform === 'win32') {
  // SDK54 autolinking stops before checking a drive root. Our ASCII M: alias
  // deliberately puts package.json at the drive root, so include that directory.
  const file = path.resolve(__dirname, '../node_modules/expo-modules-autolinking/build/commands/autolinkingOptions.js');
  let code = fs.readFileSync(file, 'utf8');
  const oldLoop = 'for (let dir = root; path_1.default.dirname(dir) !== dir; dir = path_1.default.dirname(dir)) {';
  if (code.includes(oldLoop)) {
    code = code.replace(oldLoop, 'for (let dir = root; ; dir = path_1.default.dirname(dir)) { // myBody: check drive root');
    code = code.replace('return file;\n        }\n    }', 'return file;\n        }\n        if (path_1.default.dirname(dir) === dir) break;\n    }');
    fs.writeFileSync(file, code);
  }
  // Restore the diagnostic experiment; SDK54's original cmd wrapper is retained.
  const os = path.resolve(__dirname, '../node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin-shared/src/main/kotlin/expo/modules/plugin/Os.kt');
  const source = fs.readFileSync(os, 'utf8');
  if (source.includes('args // myBody: invoke node directly on Windows')) fs.writeFileSync(os, source.replace('args // myBody: invoke node directly on Windows', 'listOf("cmd", "/c") + args'));
  // Normalize Expo module CMake paths as well as React Native package paths.
  const builder=path.resolve(__dirname,'../node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin-shared/src/main/kotlin/expo/modules/plugin/AutolinkigCommandBuilder.kt');
  const builderSource=fs.readFileSync(builder,'utf8');
  if(!builderSource.includes('MYBODY_AUTOLINK_SCRIPT'))fs.writeFileSync(builder,builderSource.replace('private val baseCommand = listOf(', 'private val baseCommand = System.getenv("MYBODY_AUTOLINK_SCRIPT")?.let { listOf("node", it) } ?: listOf('));
}
