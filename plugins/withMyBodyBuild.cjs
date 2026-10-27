const {withSettingsGradle,withProjectBuildGradle,withAndroidStyles}=require('expo/config-plugins');
module.exports=config=>{
 config=withAndroidStyles(config,config=>{
  const theme=config.modResults.resources.style.find(style=>style.$.name==='AppTheme');
  if(theme){theme.item??=[];const contrast=theme.item.find(item=>item.$.name==='android:enforceNavigationBarContrast');if(contrast)contrast._='false';else theme.item.push({$:{name:'android:enforceNavigationBarContrast','tools:targetApi':'29'},_:'false'});}
  return config;
 });
 config=withSettingsGradle(config,config=>{
 config.modResults.contents=config.modResults.contents.replace(
  'ex.autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)',
  'ex.autolinkLibrariesFromCommand(["node", new File(rootDir.parentFile, "scripts/native-autolinking.cjs").absolutePath], rootDir.parentFile, settings.layout.rootDirectory.dir("../").files("package.json", "package-lock.json", "scripts/native-autolinking.cjs"))'
 );
 return config;
 });
 return withProjectBuildGradle(config,config=>{
  let contents=config.modResults.contents.replace(/\n\/\/ myBody native job limits[\s\S]*?\/\/ end myBody native job limits\n?/,'\n');
  if(contents.includes('// myBody native job limits'))contents=contents.replace(/\n\/\/ myBody native job limits[\s\S]*$/,'\n');
  const limits=`// myBody native job limits\nsubprojects { p ->\n  p.afterEvaluate {\n    if (p.hasProperty('android')) {\n      p.android.defaultConfig.externalNativeBuild.cmake.arguments.addAll([\n        '-DCMAKE_JOB_POOLS=compile_pool=1;link_pool=1',\n        '-DCMAKE_JOB_POOL_COMPILE=compile_pool',\n        '-DCMAKE_JOB_POOL_LINK=link_pool'\n      ])\n    }\n  }\n}\n// end myBody native job limits\n\n`;
  config.modResults.contents=contents.replace('apply plugin: "expo-root-project"',limits+'apply plugin: "expo-root-project"');
  return config;
 });
};
