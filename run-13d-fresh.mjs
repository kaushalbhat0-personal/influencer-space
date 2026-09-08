import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE = 'https://influencer-space-alpha.vercel.app';
const PDF_PATH = path.resolve('public/marketing-assets/Resume/Kaushal_Bhat_Resume (2).pdf');
const TS = Date.now();
const EMAIL = `fresh.prof.13d.${TS}@test.local`;
const PASSWORD = 'TestFresh13D!';
const SIGNUP_NAME = 'Fresh Professional 13D';
const screenshotsDir = path.resolve('test-screenshots-13d-fresh');
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, {recursive:true});
const log = (...a)=> console.log(new Date().toISOString(), ...a);
const consoleMessages=[], pageErrors=[], failedRequests=[], networkLog=[];
let generationSessionId=null;

async function main(){
  const browser = await chromium.launch({headless:true});
  const context = await browser.newContext({ viewport:{width:1440,height:900} });
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  const page = await context.newPage();
  page.on('console', m=>{ const t=m.text(); consoleMessages.push({type:m.type(),text:t}); if(t.length<800) log('CONSOLE',m.type(),t.slice(0,400)); });
  page.on('pageerror', e=>{ pageErrors.push({message:e.message,stack:e.stack}); log('PAGEERROR',e.message); });
  page.on('requestfailed', r=>{ failedRequests.push({url:r.url(),method:r.method(),failure:r.failure()?.errorText}); log('REQFAILED',r.method(),r.url(),r.failure()?.errorText); });
  page.on('request', r=>{ const h=r.headers(); if(h['next-action']){ networkLog.push({time:Date.now(),type:'request',action:h['next-action'],url:r.url()}); log('REQ next-action',h['next-action']); }});
  page.on('response', async resp=>{
    try{
      const req=resp.request(); const h=req.headers();
      if(h['next-action']|| resp.url().includes('/api/')){
        const txt=await resp.text().catch(()=> '');
        if(txt.includes('progressPercent')||txt.includes('stages')||txt.includes('sessionId')||txt.includes('creatorName')){
          networkLog.push({time:Date.now(),type:'response',url:resp.url(),status:resp.status(),body:txt.slice(0,8000)});
          const snippet=txt.slice(0,1200).replace(/\n/g,' ');
          log('RESP',resp.status(),resp.url().slice(0,80),snippet.slice(0,500));
          try{ const str=JSON.stringify(JSON.parse(txt)); const m=str.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/); if(m && str.includes('progressPercent') && !generationSessionId){ generationSessionId=m[0]; log('Captured generationSessionId',generationSessionId); } }catch{}
        }
      }
    }catch{}
  });

  try{
    log('=== SIGNUP fresh ===',EMAIL, SIGNUP_NAME);
    await page.goto(`${BASE}/signup`, {waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForTimeout(3000);
    await page.screenshot({path:path.join(screenshotsDir,'13d-01-signup-welcome.png'),fullPage:true});
    let btn = page.getByRole('button',{name:'Continue'});
    if(await btn.count()>0){ await btn.first().click(); await page.waitForTimeout(1500); }
    await page.screenshot({path:path.join(screenshotsDir,'13d-02-persona.png'),fullPage:true});
    const personaCreator = page.locator('button').filter({hasText:'Creator'}).first();
    if(await personaCreator.count()>0){ await personaCreator.click(); await page.waitForTimeout(1500); }
    await page.screenshot({path:path.join(screenshotsDir,'13d-03-plan.png'),fullPage:true});
    btn = page.getByRole('button',{name:'Continue'});
    if(await btn.count()>0){ await btn.first().click(); await page.waitForTimeout(1500); }
    await page.screenshot({path:path.join(screenshotsDir,'13d-04-account.png'),fullPage:true});
    await page.getByLabel('Name').fill(SIGNUP_NAME);
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.screenshot({path:path.join(screenshotsDir,'13d-05-account-filled.png'),fullPage:true});
    const createBtn = page.getByRole('button',{name:'Create Account'});
    await createBtn.click();
    log('Clicked Create Account');
    await page.waitForTimeout(5000);
    await page.screenshot({path:path.join(screenshotsDir,'13d-06-provisioning.png'),fullPage:true});
    for(let i=0;i<15;i++){
      const txt = await page.evaluate(()=>document.body.innerText.slice(0,8000));
      if(txt.includes("Let's build your website") || txt.includes("Continue to Onboarding")) break;
      await page.waitForTimeout(2000);
    }
    let contBtn = page.getByRole('button',{name:'Continue to Onboarding'});
    if(await contBtn.count()==0) contBtn = page.getByRole('button',{name:'Continue'});
    if(await contBtn.count()>0){ await contBtn.first().click(); await page.waitForTimeout(4000); }
    else { await page.goto(`${BASE}/onboarding`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(3000); }
    log('After signup URL',page.url());
    await page.screenshot({path:path.join(screenshotsDir,'13d-07-onboarding.png'),fullPage:true});

    // Onboarding - Upload Resume
    const uploadCount = await page.getByText('Upload Resume').count();
    log('Upload Resume count',uploadCount);
    let resumeCard = page.locator('button').filter({hasText:'Upload Resume'}).first();
    if(await resumeCard.count()>0){ await resumeCard.click(); await page.waitForTimeout(2000); }
    await page.screenshot({path:path.join(screenshotsDir,'13d-08-provider-selected.png'),fullPage:true});
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(PDF_PATH);
    await page.waitForTimeout(1000);
    await page.screenshot({path:path.join(screenshotsDir,'13d-09-file-selected.png'),fullPage:true});
    const continueBtn = page.getByRole('button',{name:'Continue'});
    if(await continueBtn.count()>0){ await continueBtn.click(); log('Clicked Continue for upload'); }
    await page.waitForTimeout(5000);
    let profileDetected=false;
    for(let i=0;i<12;i++){
      const body=await page.evaluate(()=>document.body.innerText.slice(0,10000));
      if(body.includes('Profile Detected')){ profileDetected=true; break; }
      await page.waitForTimeout(2500);
    }
    log('ProfileDetected',profileDetected);
    await page.screenshot({path:path.join(screenshotsDir,'13d-10-profile-detected.png'),fullPage:true});
    const extractBody=await page.evaluate(()=>document.body.innerText.slice(0,10000));
    log('Extract body snippet',extractBody.slice(0,3000));
    const buildBtn = page.getByRole('button',{name:'Build My Storefront'});
    log('Build btn count',await buildBtn.count());
    await page.screenshot({path:path.join(screenshotsDir,'13d-11-before-build.png'),fullPage:true});
    const genStart=Date.now();
    await buildBtn.click();
    log('Clicked Build');
    await page.waitForTimeout(3000);
    await page.screenshot({path:path.join(screenshotsDir,'13d-12-generating-start.png'),fullPage:true});

    // Monitor generation with refresh once
    let progressHistory=[], lastProgress=-1, lastChange=Date.now(), refreshDone=false, completed=false, failed=false;
    for(let tick=0; tick<180; tick++){
      const info=await page.evaluate(()=>{
        const txt=document.body.innerText;
        const progMatch=txt.match(/(\d+)%/);
        const prog=progMatch?parseInt(progMatch[1]):null;
        const constructionStatus=document.querySelector('[data-testid="construction-status"]')?.innerText||null;
        const sections=Array.from(document.querySelectorAll('[data-construction-section]')).map(e=>e.getAttribute('data-construction-section'));
        const preview = document.querySelector('[data-testid="construction-preview"]')?.innerHTML?.slice(0,2000) || null;
        return {txt:txt.slice(0,8000),prog,constructionStatus,sections,preview};
      });
      const prog=info.prog;
      if(prog!==null && prog!==lastProgress){
        log(`TICK ${tick} prog ${prog}% construction ${info.constructionStatus} sections ${info.sections.length}`);
        progressHistory.push({tick,prog,sections:info.sections.length,constructionStatus:info.constructionStatus});
        lastProgress=prog; lastChange=Date.now();
      }
      const body=info.txt;
      if(body.includes("We couldn't build")||body.includes("Publishing failed")){
        failed=true; log('Failed state'); await page.screenshot({path:path.join(screenshotsDir,`13d-failed-${tick}.png`),fullPage:true}); break;
      }
      if(page.url().includes('/admin/dashboard')){
        completed=true; log('Dashboard redirect at tick',tick); await page.screenshot({path:path.join(screenshotsDir,`13d-13-dashboard-${tick}.png`),fullPage:true}); break;
      }
      if(prog===100){
        await page.waitForTimeout(2000);
        if(page.url().includes('/admin/dashboard')){ completed=true; break; }
      }
      if(tick===20 && !refreshDone && !completed && !failed){
        log('=== Refresh mid-generation ===');
        const beforeProg=prog, beforeURL=page.url();
        await page.reload({waitUntil:'domcontentloaded'});
        await page.waitForTimeout(5000);
        const after=await page.evaluate(()=>document.body.innerText.slice(0,3000));
        const afterProgMatch=after.match(/(\d+)%/);
        const afterProg=afterProgMatch?parseInt(afterProgMatch[1]):null;
        log('Refresh: before',beforeProg,'after',afterProg,'URL',beforeURL,'->',page.url());
        const recovered = afterProg!==null && afterProg >= (beforeProg||0)-5;
        log('Refresh recovered?',recovered);
        await page.screenshot({path:path.join(screenshotsDir,'13d-14-after-refresh.png'),fullPage:true});
        refreshDone=true; lastChange=Date.now();
      }
      if(Date.now()-lastChange>60000 && lastProgress<100 && !failed){
        log('Freeze >60s at',lastProgress); break;
      }
      await page.waitForTimeout(1500);
    }
    log('ProgressHistory',JSON.stringify(progressHistory,null,2));
    fs.writeFileSync(path.join(screenshotsDir,'13d-progress.json'),JSON.stringify(progressHistory,null,2));
    fs.writeFileSync(path.join(screenshotsDir,'13d-network.json'),JSON.stringify(networkLog,null,2));
    fs.writeFileSync(path.join(screenshotsDir,'13d-console.json'),JSON.stringify(consoleMessages,null,2));
    fs.writeFileSync(path.join(screenshotsDir,'13d-pageErrors.json'),JSON.stringify(pageErrors,null,2));
    await page.screenshot({path:path.join(screenshotsDir,'13d-15-final.png'),fullPage:true});
    // Dashboard
    if(!page.url().includes('/admin/dashboard')){
      await page.goto(`${BASE}/admin/dashboard`,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(5000);
    }
    await page.screenshot({path:path.join(screenshotsDir,'13d-16-dashboard-final.png'),fullPage:true});
    const dashBody=await page.evaluate(()=>document.body.innerText.slice(0,8000));
    log('Dashboard body snippet',dashBody.slice(0,3000));
    const sessResp=await page.request.get(`${BASE}/api/auth/session`);
    const sessTxt=await sessResp.text();
    log('Session',sessTxt.slice(0,3000));
    // FIX 13F: deterministic storefront capture — wait for View Website URL to hydrate, then navigate explicitly to published storefront
    // The fresh tenant slug is deterministic from signup name "Fresh Professional 13D" → fresh-professional-13d (lowercase, hyphenated, as seen in dashboard "·https://…/fresh-professional-13d")
    const expectedSlug = 'fresh-professional-13d';
    const expectedStorefrontUrl = `${BASE}/fresh-professional-13d`;
    log('Expected storefront URL (deterministic from signup name)', expectedStorefrontUrl);
    // Wait until deferred dashboard data hydrates and View Website link is present
    try {
      await page.waitForFunction(
        (slug) => document.body.innerText.includes(slug) || !!document.querySelector(`a[href*="${slug}"]`),
        expectedSlug,
        { timeout: 15000 }
      );
      log('View Website link hydrated for', expectedSlug);
    } catch (e) {
      log('View Website link not yet hydrated, will still navigate explicitly to', expectedStorefrontUrl);
    }
    await page.screenshot({path:path.join(screenshotsDir,'13d-17b-dashboard-hydrated.png'),fullPage:true});
    // Go to builder to verify structure (existing check)
    await page.goto(`${BASE}/builder`,{waitUntil:'domcontentloaded'}).catch(()=>{});
    await page.waitForTimeout(4000);
    await page.screenshot({path:path.join(screenshotsDir,'13d-17-builder.png'),fullPage:true});
    const builderBody=await page.evaluate(()=>document.body.innerText.slice(0,8000));
    log('Builder body snippet',builderBody.slice(0,4000));
    // Now navigate explicitly to published storefront and wait for render
    const storefrontUrl = expectedStorefrontUrl;
    log('Storefront URL (explicit, deterministic)',storefrontUrl);
    const storePage = await context.newPage();
    await storePage.goto(storefrontUrl,{waitUntil:'domcontentloaded'});
    await storePage.waitForTimeout(3000);
    // Wait for storefront to render (hero or main content)
    try {
      await storePage.waitForSelector('main, [data-testid="hero"], h1', {timeout:10000});
      log('Storefront rendered, main/hero visible');
    } catch (e) {
      log('Storefront waitForSelector timeout, continuing', e.message);
    }
    await storePage.waitForLoadState('networkidle').catch(()=>{});
    await page.waitForTimeout(1000);
    await storePage.screenshot({path:path.join(screenshotsDir,'13d-18-storefront-desktop.png'),fullPage:true});
    const storeText = await storePage.evaluate(()=>document.body.innerText.slice(0,12000));
    log('Storefront text snippet',storeText.slice(0,4000));
    fs.writeFileSync(path.join(screenshotsDir,'13d-storefront.txt'),storeText);
    const checks={
      hero: storeText.includes('KAUSHAL')||storeText.includes('Kaushal')||storeText.includes('Fresh Professional'),
      experience: storeText.includes('Experience')||storeText.includes('Professional Experience')||storeText.includes('Money Craft'),
      skills: storeText.includes('My Stack')||storeText.includes('Skills')||storeText.includes('TypeScript'),
      projects: storeText.includes('Things I')||storeText.includes('Projects')||storeText.includes('Legacy Modernization'),
      education: storeText.includes('Education')||storeText.includes('Credentials'),
      github: storeText.includes('github.com')||storeText.includes('Code & Work'),
      contact: storeText.includes('Contact')||storeText.includes('Get In Touch'),
      productsHidden: !storeText.includes('Products')||storeText.includes('Products')===false,
      noFabrication: !storeText.includes('Followers: 100k') && !storeText.includes('Award Winning'),
    };
    log('Storefront checks',checks);
    fs.writeFileSync(path.join(screenshotsDir,'13d-storefront-checks.json'),JSON.stringify(checks,null,2));
    // Responsive - run against STOREFRONT, not dashboard
    for(const vp of [{w:390,h:844},{w:768,h:1024},{w:1440,h:900}]){
      await storePage.setViewportSize({width:vp.w,height:vp.h});
      await storePage.waitForTimeout(2000);
      const overflow=await storePage.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth}));
      log(`Responsive storefront ${vp.w} overflow ${overflow.overflow} sw ${overflow.sw} cw ${overflow.cw}`);
      await storePage.screenshot({path:path.join(screenshotsDir,`13d-responsive-storefront-${vp.w}.png`),fullPage:true});
      const navVisible = await storePage.evaluate(()=> !!document.querySelector('nav'));
      log(`Responsive storefront ${vp.w} nav visible ${navVisible}`);
      // Also check hero, skills, projects visibility at each width
      const sectionCheck = await storePage.evaluate(()=> document.body.innerText.slice(0,3000).replace(/\n/g,' ').slice(0,500));
      log(`Responsive ${vp.w} section snippet`,sectionCheck.slice(0,300));
    }
    const htmlContent = await storePage.content();
    const sameAsMatch = htmlContent.match(/sameAs[^>]*\[[^\]]*\]/);
    log('sameAs snippet', sameAsMatch?sameAsMatch[0].slice(0,500):'none');
    const hasManual = htmlContent.includes('manual.com');
    log('Has manual.com contamination?',hasManual);
    const hasRawResume = htmlContent.includes('TECHNICAL SKILLS');
    log('Has raw resume contamination?',hasRawResume);
    await storePage.close();
    // Also check builder editing and publish
    // Publish already done via generation, but we can verify snapshot
    await page.goto(`${BASE}/admin/dashboard`,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(3000);
    // Try to publish via builder if needed? For now just check dashboard shows Live
    const dashText2 = await page.evaluate(()=>document.body.innerText.slice(0,5000));
    log('Dashboard Live check',dashText2.slice(0,2000));
    await context.tracing.stop({path:path.join(screenshotsDir,'13d-trace.zip')});
    log('DONE');
  }catch(e){
    log('FATAL',e.message,e.stack);
    try{ await page.screenshot({path:path.join(screenshotsDir,'13d-fatal.png'),fullPage:true}); }catch{}
  } finally{ await browser.close(); }
}
main();
