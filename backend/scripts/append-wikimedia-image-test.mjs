#!/usr/bin/env node
// Complète un lot visuel de test avec des entités précises, une par thème.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const entries = [
  ["afrique", "Kilimandjaro"], ["anime", "Osamu Tezuka"], ["culture", "Sagrada Família"], ["histoire", "Timbuktu"],
  ["geographie", "lac Victoria"], ["sciences", "télescope spatial Hubble"], ["sport", "Serena Williams"], ["cinema", "Charlie Chaplin"],
  ["musique", "Fela Kuti"], ["celebrites", "Nelson Mandela"], ["technologie", "Apple I"], ["nature", "Panda géant"],
  ["gastronomie", "pizza Margherita"], ["litterature", "Victor Hugo"],
];
const distractors = ["Le Colisée", "Saturne", "Marie Curie", "Le Nil", "Wolfgang Amadeus Mozart", "La Joconde", "Le mont Fuji", "Usain Bolt"];
async function media(term) {
  const s = new URL("https://www.wikidata.org/w/api.php"); s.search = new URLSearchParams({ action:"wbsearchentities", search:term, language:"fr", format:"json", limit:"8", origin:"*" }).toString();
  const search = await fetch(s, { headers:{"User-Agent":"QuizArenaClassic/1.0 content-curation"}, signal:AbortSignal.timeout(20_000) }); if (!search.ok) return null;
  const ids = ((await search.json()).search ?? []).map((x)=>x.id).filter(Boolean); if(!ids.length)return null;
  const e = new URL("https://www.wikidata.org/w/api.php");e.search=new URLSearchParams({action:"wbgetentities",ids:ids.join("|"),props:"labels|claims",languages:"fr",format:"json",origin:"*"}).toString();
  const entities = (await (await fetch(e,{headers:{"User-Agent":"QuizArenaClassic/1.0 content-curation"},signal:AbortSignal.timeout(20_000)})).json()).entities ?? {};
  for (const entity of Object.values(entities)) { const file=entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value; const label=entity.labels?.fr?.value; if(!file||!label)continue;
    const i=new URL("https://commons.wikimedia.org/w/api.php");i.search=new URLSearchParams({action:"query",prop:"imageinfo",iiprop:"url|extmetadata",iiurlwidth:"768",titles:`File:${file}`,format:"json",origin:"*"}).toString();
    const data=await (await fetch(i,{headers:{"User-Agent":"QuizArenaClassic/1.0 content-curation"},signal:AbortSignal.timeout(20_000)})).json();const info=Object.values(data.query?.pages??{})[0]?.imageinfo?.[0];
    if(info?.thumburl&&info?.descriptionurl&&info?.extmetadata?.LicenseShortName?.value)return {label,mediaUrl:info.thumburl,sourceUrl:info.descriptionurl,license:info.extmetadata.LicenseShortName.value};
  } return null;
}
let added=0;
for (const [categoryId, term] of entries) {
  if (added >= 10) break;
  try { const item=await media(term); if(!item)continue; const exists=await prisma.question.findFirst({where:{mediaUrl:item.mediaUrl}});if(exists)continue;
    const options=[item.label,...distractors.filter(x=>x!==item.label).slice(0,3)].sort(()=>Math.random()-.5);const text=`Quel sujet reconnais-tu sur cette image de la catégorie ${categoryId} ?`;
    await prisma.question.create({data:{categoryId,textFr:text,textEn:text,options,answerIndex:options.indexOf(item.label),active:true,source:"wikimedia_test_2026",subcategory:`Visuel · ${item.license}`,mediaUrl:item.mediaUrl,mediaAlt:item.label,sourceUrl:item.sourceUrl,verifiedAt:new Date()}});added++;console.log(`+ ${item.label}`);
  }catch(error){console.warn(`${term}: ${error.message}`);} }
console.log(`Ajoutées: ${added}`);await prisma.$disconnect();
