import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const TENANT_SUBDOMAIN = 'northstar';
const TENANT_ID = '8a0206c6-5701-4487-b5e6-3975c7bb52e8';

async function main(){
  console.log('Seeding Northstar rich demo...');
  const tenant = await prisma.tenant.findFirst({ where:{ subdomain: TENANT_SUBDOMAIN }});
  if(!tenant){ console.error('northstar tenant not found'); process.exit(1); }
  // Use northstar ID (may differ from constant, use found)
  const tenantId = tenant.id;
  console.log('tenant', tenantId, tenant.subdomain);

  // Website - ensure exists, set theme to business-minimal for light verification baseline
  let website = await prisma.website.findUnique({ where:{ tenantId }});
  if(!website){
    website = await prisma.website.create({ data:{ tenantId, themePackageId:'com.creatos.business-minimal', themeColors:{}, themeFonts:{}, themeConfig:{} }});
    console.log('created website', website.id);
  } else {
    await prisma.website.update({ where:{ id: website.id }, data:{ themePackageId:'com.creatos.business-minimal' }});
    console.log('updated website theme to business-minimal');
  }

  // Brand - hero identity
  const brandData = {
    name:'Northstar Studio',
    tagline:'Ideas worth remembering.',
    bio:'We build visual identities, digital experiences, and campaigns for ambitious creators and modern brands. Strategy, design, and code — one studio.',
    avatarUrl:'https://picsum.photos/seed/northstar-avatar/400/400',
    bannerUrl:'https://picsum.photos/seed/northstar-banner/1600/900',
    socialLinks: [
      { platform:'instagram', label:'Instagram', url:'https://instagram.com/northstar.studio' },
      { platform:'youtube', label:'YouTube', url:'https://youtube.com/@northstarstudio' },
      { platform:'behance', label:'Behance', url:'https://behance.net/northstar' },
      { platform:'twitter', label:'X / Twitter', url:'https://twitter.com/northstarstudio' },
      { platform:'linkedin', label:'LinkedIn', url:'https://linkedin.com/company/northstar-studio' },
    ],
    hero: {
      title:'Ideas worth remembering.',
      subtitle:'Independent Creative Studio',
      description:'We build visual identities, digital experiences, and campaigns for ambitious creators and modern brands.',
      ctaText:'Start a Project',
      ctaLink:'#contact',
      ctaSecondaryText:'Explore Our Work',
      ctaSecondaryLink:'#gallery',
    }
  };

  // Upsert Brand
  const existingBrand = await prisma.brand.findUnique({ where:{ websiteId: website.id }});
  if(existingBrand){
    await prisma.brand.update({ where:{ websiteId: website.id }, data:{
      name: brandData.name, tagline: brandData.tagline, bio: brandData.bio,
      avatarUrl: brandData.avatarUrl, bannerUrl: brandData.bannerUrl,
      socialLinks: brandData.socialLinks
    }});
  } else {
    await prisma.brand.create({ data:{
      websiteId: website.id, name: brandData.name, tagline: brandData.tagline, bio: brandData.bio,
      avatarUrl: brandData.avatarUrl, bannerUrl: brandData.bannerUrl, socialLinks: brandData.socialLinks
    }});
  }
  console.log('brand upserted');

  // Settings - hero (some aggregates read from Setting hero)
  await prisma.setting.upsert({
    where:{ tenantId_key:{ tenantId, key:'hero' }},
    update:{ value: brandData.hero },
    create:{ tenantId, key:'hero', value: brandData.hero }
  });

  // Products - 6 realistic
  await prisma.product.deleteMany({ where:{ tenantId }});
  const products = [
    { name:'Brand Strategy Session', description:'2-hour intensive to define positioning, audience, and visual direction. Includes recording + action plan.', price: 15000, imageUrl:'https://picsum.photos/seed/northstar-prod1/600/400', isFeatured:true },
    { name:'Creative Direction Package', description:'Monthly creative leadership — art direction, reviews, and campaign systems for teams without a full-time CD.', price: 120000, imageUrl:'https://picsum.photos/seed/northstar-prod2/600/400', isFeatured:true },
    { name:'Social Content Kit', description:'30-day content system — templates, captions, and scheduling for Instagram, LinkedIn, and X.', price: 45000, imageUrl:'https://picsum.photos/seed/northstar-prod3/600/400', isFeatured:false },
    { name:'Visual Identity Audit', description:'Comprehensive audit of your current identity — logo, palette, typography, and applications. Report + recommendations.', price: 35000, imageUrl:'https://picsum.photos/seed/northstar-prod4/600/400', isFeatured:false },
    { name:'Studio Preset Pack', description:'Lightroom + Capture One presets crafted for editorial, portrait, and campaign work. One-time purchase.', price: 4900, imageUrl:'https://picsum.photos/seed/northstar-prod5/600/400', isFeatured:false },
    { name:'Creator Launch Kit', description:'Everything to launch — landing page, brand kit, and content calendar for your next drop.', price: 29000, imageUrl:'https://picsum.photos/seed/northstar-prod6/600/400', isFeatured:true },
  ];
  for(let i=0;i<products.length;i++){
    const p = products[i];
    await prisma.product.create({ data:{ tenantId, name:p.name, description:p.description, price:p.price, imageUrl:p.imageUrl, isFeatured:p.isFeatured, isActive:true, order:i, slug:`northstar-${i+1}` }});
  }
  console.log('products 6 created');

  // Gallery - 8 images
  await prisma.galleryImage.deleteMany({ where:{ tenantId }});
  const gallery = [
    { title:'Editorial Portrait', imageUrl:'https://picsum.photos/seed/northstar-gal1/800/600', category:'editorial' },
    { title:'Workspace — Studio Light', imageUrl:'https://picsum.photos/seed/northstar-gal2/800/600', category:'workspace' },
    { title:'Product — Brand Kit', imageUrl:'https://picsum.photos/seed/northstar-gal3/800/600', category:'product' },
    { title:'Architecture — Atelier', imageUrl:'https://picsum.photos/seed/northstar-gal4/800/600', category:'architecture' },
    { title:'Campaign — Summer Drop', imageUrl:'https://picsum.photos/seed/northstar-gal5/800/600', category:'campaign' },
    { title:'Lifestyle — Creator House', imageUrl:'https://picsum.photos/seed/northstar-gal6/800/600', category:'lifestyle' },
    { title:'Abstract — Texture Study', imageUrl:'https://picsum.photos/seed/northstar-gal7/800/600', category:'abstract' },
    { title:'Behind the Scenes', imageUrl:'https://picsum.photos/seed/northstar-gal8/800/600', category:'bts' },
  ];
  for(let i=0;i<gallery.length;i++){
    const g = gallery[i];
    await prisma.galleryImage.create({ data:{ tenantId, title:g.title, imageUrl:g.imageUrl, category:g.category, isActive:true, order:i }});
  }
  console.log('gallery 8 created');

  // Timeline - 4
  await prisma.timelineEvent.deleteMany({ where:{ tenantId }});
  const timeline = [
    { year:'2023', title:'Studio Founded', description:'Northstar began in a small atelier in Jaipur — two designers, one developer, and a shared notebook.' },
    { year:'2024', title:'First 50 Projects', description:'Across D2C, creator brands, and cultural institutions. Our identity system shipped to 12k+ creators.' },
    { year:'2025', title:'Campaigns + Digital Products', description:'Expanded into campaign production and digital products — presets, kits, and templates for modern creators.' },
    { year:'2026', title:'Northstar Platform Launch', description:'The studio behind the studio — a publishable website platform for every creator.' },
  ];
  for(let i=0;i<timeline.length;i++){
    const t = timeline[i];
    await prisma.timelineEvent.create({ data:{ tenantId, year:t.year, title:t.title, description:t.description, order:i }});
  }
  console.log('timeline 4 created');

  // Testimonials - 3
  // Check if testimonial model exists - try prisma.testimonial?
  try {
    // @ts-ignore
    if((prisma as any).testimonial){
      await (prisma as any).testimonial.deleteMany({ where:{ tenantId }});
      await (prisma as any).testimonial.createMany({ data:[
        { tenantId, author:'Maya Chen', role:'Founder, Atelier North', content:'Northstar rebuilt our entire brand system in 6 weeks. Sharp strategy, flawless delivery, and our conversion jumped 42% after launch.', rating:5 },
        { tenantId, author:'Arjun Mehta', role:'Creative Director, Signal House', content:'The team feels like an extension of ours. They simplified our product story and shipped a design system our engineers love.', rating:5 },
        { tenantId, author:'Sofia Laurent', role:'Independent Creator', content:'My launch kit paid for itself in 9 days. Clear, beautiful, and actually built for creators — not agencies.', rating:5 },
      ]});
      console.log('testimonials 3 created via testimonial');
    } else {
      // Fallback: try setting table via raw? Use setting for testimonials?
      console.log('no testimonial model, trying alternative');
      // Use prisma.setting for testimonials?
      await prisma.setting.upsert({ where:{ tenantId_key:{ tenantId, key:'testimonials' }}, update:{ value:[
        { author:'Maya Chen', role:'Founder, Atelier North', content:'Northstar rebuilt our entire brand system in 6 weeks. Sharp strategy, flawless delivery, and our conversion jumped 42% after launch.', rating:5 },
        { author:'Arjun Mehta', role:'Creative Director, Signal House', content:'The team feels like an extension of ours. They simplified our product story and shipped a design system our engineers love.', rating:5 },
        { author:'Sofia Laurent', role:'Independent Creator', content:'My launch kit paid for itself in 9 days. Clear, beautiful, and actually built for creators — not agencies.', rating:5 },
      ]}, create:{ tenantId, key:'testimonials', value:[
        { author:'Maya Chen', role:'Founder, Atelier North', content:'Northstar rebuilt our entire brand system in 6 weeks. Sharp strategy, flawless delivery, and our conversion jumped 42% after launch.', rating:5 },
        { author:'Arjun Mehta', role:'Creative Director, Signal House', content:'The team feels like an extension of ours. They simplified our product story and shipped a design system our engineers love.', rating:5 },
        { author:'Sofia Laurent', role:'Independent Creator', content:'My launch kit paid for itself in 9 days. Clear, beautiful, and actually built for creators — not agencies.', rating:5 },
      ]}});
    }
  } catch(e){ console.log('testimonial error', e); }

  // FAQ - 5 via setting or faq table? Try faq model
  try{
    if((prisma as any).faq){
      await (prisma as any).faq.deleteMany({ where:{ tenantId }});
      await (prisma as any).faq.createMany({ data:[
        { tenantId, question:'What is your typical project process?', answer:'Discover → Define → Design → Build → Launch. We start with strategy, iterate in Figma, then code and ship with your team.', category:'process', order:0 },
        { tenantId, question:'How long does a brand project take?', answer:'Strategy sprint is 2 weeks, full identity 4–6 weeks, website 6–8 weeks. We share a live timeline on day one.', category:'process', order:1 },
        { tenantId, question:'How many revisions are included?', answer:'Two major revision rounds per phase. Most projects finish within that; additional rounds are scoped transparently.', category:'process', order:2 },
        { tenantId, question:'Do you sell digital products separately?', answer:'Yes — presets, kits, and templates are available in our store. All products are one-time purchases with updates.', category:'products', order:3 },
        { tenantId, question:'What support do you offer after launch?', answer:'30 days of post-launch support, then optional retainer for iteration, analytics, and campaign production.', category:'support', order:4 },
      ]});
      console.log('faq 5 via faq model');
    } else {
      await prisma.setting.upsert({ where:{ tenantId_key:{ tenantId, key:'faq' }}, update:{ value:[
        { question:'What is your typical project process?', answer:'Discover → Define → Design → Build → Launch. We start with strategy, iterate in Figma, then code and ship with your team.', category:'process' },
        { question:'How long does a brand project take?', answer:'Strategy sprint is 2 weeks, full identity 4–6 weeks, website 6–8 weeks. We share a live timeline on day one.', category:'process' },
        { question:'How many revisions are included?', answer:'Two major revision rounds per phase. Most projects finish within that; additional rounds are scoped transparently.', category:'process' },
        { question:'Do you sell digital products separately?', answer:'Yes — presets, kits, and templates are available in our store. All products are one-time purchases with updates.', category:'products' },
        { question:'What support do you offer after launch?', answer:'30 days of post-launch support, then optional retainer for iteration, analytics, and campaign production.', category:'support' },
      ]}, create:{ tenantId, key:'faq', value:[
        { question:'What is your typical project process?', answer:'Discover → Define → Design → Build → Launch. We start with strategy, iterate in Figma, then code and ship with your team.', category:'process' },
        { question:'How long does a brand project take?', answer:'Strategy sprint is 2 weeks, full identity 4–6 weeks, website 6–8 weeks. We share a live timeline on day one.', category:'process' },
        { question:'How many revisions are included?', answer:'Two major revision rounds per phase. Most projects finish within that; additional rounds are scoped transparently.', category:'process' },
        { question:'Do you sell digital products separately?', answer:'Yes — presets, kits, and templates are available in our store. All products are one-time purchases with updates.', category:'products' },
        { question:'What support do you offer after launch?', answer:'30 days of post-launch support, then optional retainer for iteration, analytics, and campaign production.', category:'support' },
      ]}});
      console.log('faq 5 via setting');
    }
  } catch(e){ console.log('faq error', e); }

  // Affiliate Links / Content Feed - clear and add
  await prisma.affiliateLink.deleteMany({ where:{ tenantId }});
  await prisma.affiliateLink.createMany({ data:[
    { tenantId, title:'Instagram', url:'https://instagram.com/northstar.studio', order:0 },
    { tenantId, title:'YouTube', url:'https://youtube.com/@northstarstudio', order:1 },
    { tenantId, title:'Behance', url:'https://behance.net/northstar', order:2 },
    { tenantId, title:'Newsletter', url:'https://northstar.studio/newsletter', order:3 },
  ]});
  console.log('links 4');

  // Footer config - via Setting footer_config
  await prisma.setting.upsert({
    where:{ tenantId_key:{ tenantId, key:'footer_config' }},
    update:{ value:{
      description:'Design that moves your business forward. Strategy, identity, and digital products for ambitious modern brands.',
      copyright:`© ${new Date().getFullYear()} Northstar Studio — Crafted for ambitious brands.`,
      columns:[
        { title:'Explore', links:[{ label:'Home', href:'/' },{ label:'Work', href:'#gallery' },{ label:'Services', href:'#services' },{ label:'Products', href:'#products' }]},
        { title:'Studio', links:[{ label:'About', href:'#timeline' },{ label:'Process', href:'#process' },{ label:'Contact', href:'#contact' }]},
        { title:'Resources', links:[{ label:'FAQ', href:'#faq' },{ label:'Newsletter', href:'#newsletter' },{ label:'Community', href:'https://northstar.studio/community' }]},
        { title:'Legal', links:[{ label:'Privacy', href:'/privacy' },{ label:'Terms', href:'/terms' },{ label:'Refunds', href:'/refund' }]},
      ]
    }},
    create:{ tenantId, key:'footer_config', value:{
      description:'Design that moves your business forward. Strategy, identity, and digital products for ambitious modern brands.',
      copyright:`© ${new Date().getFullYear()} Northstar Studio — Crafted for ambitious brands.`,
      columns:[
        { title:'Explore', links:[{ label:'Home', href:'/' },{ label:'Work', href:'#gallery' },{ label:'Services', href:'#services' },{ label:'Products', href:'#products' }]},
        { title:'Studio', links:[{ label:'About', href:'#timeline' },{ label:'Process', href:'#process' },{ label:'Contact', href:'#contact' }]},
        { title:'Resources', links:[{ label:'FAQ', href:'#faq' },{ label:'Newsletter', href:'#newsletter' },{ label:'Community', href:'https://northstar.studio/community' }]},
        { title:'Legal', links:[{ label:'Privacy', href:'/privacy' },{ label:'Terms', href:'/terms' },{ label:'Refunds', href:'/refund' }]},
      ]
    }}
  });
  console.log('footer_config set');

  // Ensure website has at least one page with sections (if missing, create via builder service? For now assume existing page is fine)
  const pages = await prisma.page.findMany({ where:{ websiteId: website.id }, include:{ sections:true }});
  console.log('pages', pages.length, pages.map(p=>`${p.slug} sections:${p.sections.length}`).join(', '));

  await prisma.$disconnect();
  console.log('Northstar rich seed done');
}
main().catch(e=>{ console.error(e); process.exit(1); });
