const {chromium}=require('playwright-core');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--font-render-hinting=none','--disable-gpu']});
 const out='../';
 for(const [dsf,name] of [[1,'x-banner.png'],[2,'x-banner@2x.png']]){
  const pg=await b.newPage({viewport:{width:1500,height:500},deviceScaleFactor:dsf});
  await pg.goto('file://'+__dirname+'/banner.html');await pg.evaluate(()=>window.ready);
  await pg.screenshot({path:out+name});await pg.close();}
 const pg=await b.newPage({viewport:{width:400,height:400},deviceScaleFactor:1});
 await pg.goto('file://'+__dirname+'/avatar.html');await pg.screenshot({path:out+'x-avatar.png'});
 await b.close();})();
