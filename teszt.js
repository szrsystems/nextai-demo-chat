/* Helyi teszt: hamis Gemini vegponttal ellenorzi a teljes utat.
   Futtatas:  node teszt.js                                          */
const http = require('http');

let utolsoKeres = null;
const hamis = http.createServer((req, res) => {
  let b = '';
  req.on('data', d => b += d);
  req.on('end', () => {
    utolsoKeres = JSON.parse(b);
    if (req.headers['x-goog-api-key'] !== 'TESZT_KULCS') {
      res.writeHead(403, {'content-type':'application/json'});
      return res.end(JSON.stringify({error:{message:'rossz kulcs'}}));
    }
    const sz = utolsoKeres.contents[utolsoKeres.contents.length-1].parts[0].text;
    let ki = 'Az implantatum 320 000 Ft-tol indul. **Vastag** – gondolatjel teszt.';
    if (/idopont|foglal/i.test(sz)) ki = 'Szivesen segitek. Kerem a nevet es a telefonszamat. [KONTAKT]';
    if (/hiba/i.test(sz)) { res.writeHead(500); return res.end('{"error":"szandekos"}'); }
    res.writeHead(200, {'content-type':'application/json'});
    res.end(JSON.stringify({candidates:[{content:{parts:[{text:ki}]},finishReason:'STOP'}]}));
  });
});

const KI = [];
function all(nev, felt) { KI.push((felt?'OK   ':'BUKTA')+' | '+nev); }

hamis.listen(9999, async () => {
  process.env.GEMINI_BASE = 'http://127.0.0.1:9999';
  process.env.GEMINI_API_KEY = 'TESZT_KULCS';
  process.env.PORT = '9998';
  process.env.ALLOWED_ORIGINS = 'https://nextai.hu';
  require('./server.js');
  await new Promise(r => setTimeout(r, 400));

  const hivas = (test, origin, ut) => fetch('http://127.0.0.1:9998'+(ut||'/chat'), {
    method: test ? 'POST' : 'GET',
    headers: Object.assign({'content-type':'application/json'}, origin ? {origin} : {}),
    body: test ? JSON.stringify(test) : undefined
  });

  let r = await hivas(null, null, '/health');
  let j = await r.json();
  all('health valaszol es jelzi a kulcsot', r.status===200 && j.ok===true && j.kulcs===true);

  r = await hivas({message:'Mennyibe kerul egy implantatum?', vertical:'fogaszat'}, 'https://gonosz.hu');
  all('idegen origin tiltva (403)', r.status===403);

  r = await hivas({message:'Mennyibe kerul egy implantatum?', vertical:'fogaszat'}, 'https://nextai.hu');
  j = await r.json();
  all('normal valasz megjon', r.status===200 && j.ok===true && j.valasz.length>10);
  all('markdown vastag eltavolitva', !/\*\*/.test(j.valasz));
  all('gondolatjel eltavolitva', !/[–—]/.test(j.valasz));
  all('HTML escape-elve', !/<[a-z]/i.test(j.valasz));
  all('nem ker kontaktot alapbol', j.kontakt===false);

  r = await hivas({message:'Szeretnek idopontot foglalni', vertical:'fogaszat'}, 'https://nextai.hu');
  j = await r.json();
  all('[KONTAKT] jelolo felismerve', j.kontakt===true);
  all('[KONTAKT] jelolo kiszurve a szovegbol', !/KONTAKT/.test(j.valasz));

  r = await hivas({message:'Hivjon a 06 30 123 4567 szamon', vertical:'fogaszat'}, 'https://nextai.hu');
  await r.json();
  const kuldott = utolsoKeres.contents[utolsoKeres.contents.length-1].parts[0].text;
  all('telefonszam nem megy ki a modellhez', /\[telefonszam\]/.test(kuldott) && !/123/.test(kuldott));

  r = await hivas({message:'kerlek hiba', vertical:'fogaszat'}, 'https://nextai.hu');
  j = await r.json();
  all('modellhiba eseten 502 (a weboldal visszavalt)', r.status===502 && j.ok===false);

  r = await hivas({message:'Mennyi egy tomes?', vertical:'kivitelezo'}, 'https://nextai.hu');
  await r.json();
  const rendszer = utolsoKeres.system_instruction.parts[0].text;
  all('kivitelezo vertikal sajat tenyeket kap', /napelem/i.test(rendszer) && !/implantatum|implantátum/i.test(rendszer));

  r = await hivas({message:'x'.repeat(5000), vertical:'fogaszat'}, 'https://nextai.hu');
  await r.json();
  all('bemenet 300 karakterre vagva',
      utolsoKeres.contents[utolsoKeres.contents.length-1].parts[0].text.length===300);

  r = await hivas({message:'', vertical:'fogaszat'}, 'https://nextai.hu');
  all('ures uzenet elutasitva', r.status===400);

  let db429 = 0;
  for (let i=0;i<30;i++){
    const rr = await hivas({message:'teszt '+i, vertical:'fogaszat'}, 'https://nextai.hu');
    if (rr.status===429) db429++;
    await rr.text();
  }
  all('IP-korlat bekapcsol (25/ora)', db429>0);

  console.log('\n' + KI.join('\n'));
  const buk = KI.filter(s=>s.startsWith('BUKTA')).length;
  console.log('\n' + KI.length + ' teszt, ' + buk + ' bukta.');
  process.exit(buk ? 1 : 0);
});
