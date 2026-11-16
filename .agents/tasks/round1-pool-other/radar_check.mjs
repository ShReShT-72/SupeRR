import fs from 'node:fs';
const src = fs.readFileSync(new URL('../../../scoring.mjs', import.meta.url),'utf8');
const mk = async (v) => (await import('data:text/javascript;base64,'+Buffer.from(src.replace(/const APPLY_PLAYER_EXCLUSIONS = \w+;/, `const APPLY_PLAYER_EXCLUSIONS = ${v};`)).toString('base64'))).ratePlayers;
const d=JSON.parse(fs.readFileSync(new URL('../../../analysis_data.json', import.meta.url)));
const names={Batter:['Tilak Varma','Shreyas Iyer','Sanju Samson','Jos Buttler','Ayush Badoni','Aniket Verma','Nitish Reddy'],Bowler:['Sakib Hussain','Akash Madhwal','Rasikh Salam','Kartik Tyagi','Nitish Reddy']};
for (const v of [true,false]) { const rp = await mk(v);
 for (const season of ['All','2026']) {
  const r=rp(d.records,{format:'IPL',season});
  console.log('== excl',v,'IPL season',season,'eligible',r.batters.length,r.bowlers.length,r.allrounders.length);
  for (const p of r.batters) if (names.Batter.some(n=>p.player.includes(n))) console.log(' BAT',p.rank,p.player,p.score,p.pressureBalls+'b',p.pressureMatches+'m',p.pressureRate);
  for (const p of r.bowlers) if (names.Bowler.some(n=>p.player.includes(n))) console.log(' BOWL',p.rank,p.player,p.score,p.pressureBalls+'b',p.pressureMatches+'m',p.pressureEconomy);
  for (const p of r.allrounders) console.log(' AR',p.rank,p.player,p.score,p.batting.index,p.bowling.index);
 } }
