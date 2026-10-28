const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
process.env.PWA_PORT='4187';require('./preview-pwa.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const originalSW=fs.readFileSync(path.join(root,'dist-pwa/sw.js'),'utf8');
 const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto('http://127.0.0.1:4187');await page.getByText('健康摘要',{exact:true}).waitFor();await page.getByText('可离线使用 · 请定期导出备份',{exact:true}).waitFor();
 const codes={};for(const name of ['domain','calculations','validation','repository.web','backupFormat','archive','browserFiles','media.web'])codes[name]=ts.transpileModule(fs.readFileSync(path.join(root,'src/mybody',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 await page.addScriptTag({content:fs.readFileSync(path.join(root,'node_modules/fflate/umd/index.js'),'utf8')});
 await page.evaluate(codes=>{const cache={};function load(name){name=name.replace(/^\.\//,'');if(name==='fflate')return window.fflate;if(cache[name])return cache[name].exports;const module={exports:{}};cache[name]=module;new Function('require','exports','module',codes[name])(load,module.exports,module);return module.exports;}window.repo=load('repository.web');window.domain=load('domain');window.backup=load('backupFormat');window.archive=load('archive');window.media=load('media.web');},codes);
 const result=await page.evaluate(async()=>{
 const r=window.repo;await r.initialize();const row={id:'test-row',metric_id:'weight',measured_at:'2026-10-27T00:00:00Z',value:70,value2:null,unit:'kg',context:'',note:'中文测试',reference_min:null,reference_max:null};await r.saveBatch([row]);
 await r.saveBatch([{...row,value:69}]);if((await r.readSnapshot()).readings.find(x=>x.id===row.id).value!==69)throw Error('Edit failed');await r.saveBatch([row,{...row,id:'remove-me'}]);await r.removeReading('remove-me');if((await r.readSnapshot()).readings.some(x=>x.id==='remove-me'))throw Error('Delete failed');await r.saveBatch([{...row,id:'text-test',metric_id:'exercise_notes',value:0,unit:'',text_value:'跑步十分钟'}]);if(!(await r.readSnapshot()).readings.some(x=>x.text_value==='跑步十分钟'))throw Error('Text reading failed');
 let failed=false;try{await r.saveBatch([{...row,id:'rollback'},{...row,id:'bad',metric_id:'missing'}]);}catch{failed=true;}if(!failed||(await r.readSnapshot()).readings.some(x=>x.id==='rollback'))throw Error('Batch did not rollback');
 await r.saveProfile({name:'网页验证',height:'175',birthday:'1990-01-01',theme:'dark'});
 const png=await fetch('/icon-512.png').then(r=>r.arrayBuffer());await r.storePhoto({id:'photo-test',uri:'x',pose:'front',taken_at:row.measured_at,note:'测试照片'},png);
 const saved=await r.transact();const manifest={app:'myBody',version:2,exported_at:new Date().toISOString(),snapshot:{...saved.snapshot,photos:saved.snapshot.photos.map(p=>({...p,uri:'photos/0.jpg'}))}};
 const bytes=window.archive.encodeArchive({'manifest.json':new TextEncoder().encode(JSON.stringify(manifest)),'photos/0.jpg':new Uint8Array(png)});const files=window.archive.decodeArchive(bytes);window.backup.validateManifest(JSON.parse(new TextDecoder().decode(files['manifest.json'])));
 const legacy=structuredClone(manifest);legacy.version=1;window.backup.validateManifest(legacy);
 let corrupt=false;try{window.archive.decodeArchive(bytes.slice(0,100));}catch{corrupt=true;}if(!corrupt)throw Error('Corrupt archive accepted');
 const before=(await r.transact()).snapshot.readings.length;let aborted=false;try{await r.transact(v=>{v.snapshot.readings=[];throw Error('simulated write failure');});}catch{aborted=true;}if(!aborted||(await r.transact()).snapshot.readings.length!==before)throw Error('Failed write changed data');
 return {rows:before,photos:saved.snapshot.photos.length,zipBytes:bytes.length};});
 await page.reload();await page.getByText('健康摘要',{exact:true}).waitFor();await page.getByText('70',{exact:false}).first().waitFor();
 await page.getByRole('tab',{name:'照片',exact:true}).click();await page.getByText('测试照片',{exact:true}).waitFor();
 await page.addScriptTag({content:fs.readFileSync(path.join(root,'node_modules/fflate/umd/index.js'),'utf8')});
 await page.evaluate(codes=>{const cache={};function load(name){name=name.replace(/^\.\//,'');if(name==='fflate')return window.fflate;if(cache[name])return cache[name].exports;const module={exports:{}};cache[name]=module;new Function('require','exports','module',codes[name])(load,module.exports,module);return module.exports;}window.repo=load('repository.web');window.domain=load('domain');window.backup=load('backupFormat');window.archive=load('archive');window.media=load('media.web');},codes);
 await page.evaluate(()=>window.media.exportBackup());const downloadEvent=page.waitForEvent('download');await page.getByRole('link',{name:'下载文件',exact:true}).click();const download=await downloadEvent;const backupPath=path.join(root,'.verification/web-backup.zip');await download.saveAs(backupPath);await page.getByRole('button',{name:'关闭',exact:true}).click();
 const chooserPromise=page.waitForEvent('filechooser');await page.evaluate(()=>{window.importResult=window.media.importBackup();});await (await chooserPromise).setFiles(backupPath);assert.equal(await page.evaluate(()=>window.importResult),true);
 await page.screenshot({path:path.join(root,'.verification/pwa-photos.png'),fullPage:true});
 await context.setOffline(true);await page.reload();await page.getByText('健康摘要',{exact:true}).waitFor();await page.getByRole('tab',{name:'照片',exact:true}).click();await page.getByText('测试照片',{exact:true}).waitFor();await context.setOffline(false);
 await page.getByLabel('照片备注（选填）',{exact:true}).fill('网页相册测试');const pick=page.waitForEvent('filechooser');await page.getByRole('button',{name:'从相册选择',exact:true}).click();await (await pick).setFiles(path.join(root,'assets/icon.png'));await page.getByText('网页相册测试',{exact:true}).waitFor();
 page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'删除照片',exact:true}).first().click();assert.equal(await page.getByRole('button',{name:'删除照片',exact:true}).count(),2);
 fs.writeFileSync(path.join(root,'dist-pwa/sw.js'),originalSW.replace(/mybody-shell-[a-f0-9]+/,'mybody-shell-test-update'));
 await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});await page.getByRole('button',{name:'新版本已准备，更新应用',exact:true}).waitFor();
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'新版本已准备，更新应用',exact:true}).click();await page.waitForEvent('load');await page.getByText('健康摘要',{exact:true}).waitFor();await page.getByRole('tab',{name:'照片',exact:true}).click();await page.getByText('网页相册测试',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,result,scenarios:['startup','IDB persistence','record edit/delete and text entries','atomic batch rollback','profile persistence','photo persistence','ZIP v2/v1 compatibility','corrupt ZIP rejection','failed transaction preserves state','ZIP download and file restore','offline reload with photos','gallery upload and JPEG conversion','cancel delete confirmation','manual service worker update preserves data'],errors},null,2));
 }catch(e){console.error({errors,body:await page.locator('body').innerText()});await page.screenshot({path:path.join(root,'.verification/pwa-failure.png')});throw e;}finally{fs.writeFileSync(path.join(root,'dist-pwa/sw.js'),originalSW);await browser.close();}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
