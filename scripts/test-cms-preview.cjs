/* Verify Pages CMS option generation and preview assets with no external dependencies. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const yaml=fs.readFileSync(path.join(root,'.pages.yml'),'utf8');
const source=fs.readFileSync(path.join(root,'scripts/sync-pages-cms.cjs'),'utf8');

function entries(collection) {
  return fs.readdirSync(path.join(root,'content',collection))
    .filter(s=>s.endsWith('.json'))
    .map(name=>JSON.parse(fs.readFileSync(path.join(root,'content',collection,name),'utf8')));
}
for(const [name,folder] of [['SECTIONS','sections'],['TAGS','tags'],['GROUPS','groups']]) {
  const start='            # GARAGE_'+name+'_START';
  const end='            # GARAGE_'+name+'_END';
  const a=yaml.indexOf(start),b=yaml.indexOf(end,a);
  assert(a>=0&&b>a,'Missing option block: '+name);
  const body=yaml.slice(a+start.length,b);
  const matches=[...body.matchAll(/- \{name: ("(?:\\.|[^"])*"), label: ("(?:\\.|[^"])*")\}/g)];
  const options=matches.map(m=>({id:JSON.parse(m[1]),name:JSON.parse(m[2])}));
  const expected=entries(folder);
  assert.equal(options.length,expected.length,'Wrong '+name+' option count');
  for(const e of expected) {
    assert(options.some(o=>o.id===e.id),
      'Pages CMS missing '+name+' option for '+e.id);
    const o=options.find(o=>o.id===e.id);
    assert(o.name.startsWith(e.name),'Incorrect option display label '+e.id);
  }
}
assert(/- name: section[\s\S]*?type: select[\s\S]*?GARAGE_SECTIONS_START/.test(yaml),
 'A simple dropdown is required instead of reference filtering');
assert(!yaml.includes('compositionAlign')&&!yaml.includes('compositionFont'),
 'Redundant composition layout controls should not appear in CMS');
assert(!yaml.includes('type: reference'),
 'User-facing category editors should be ordinary dropdowns');

const html=fs.readFileSync(path.join(root,'preview.html'),'utf8');
assert(html.includes('js/menu-data.js')&&html.includes('js/text-answer.js'),'Preview must use actual renderer');
assert(html.includes('GARAGE_answerSrc(altered)'),'Preview must render live draft data');
assert(html.includes('input",updatePreview'),'Composition must redraw without saving');
assert(html.includes('navigator.clipboard.writeText(value)'),'Preview copy-back action missing');
const scripts=[...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
assert(scripts.length>=1,'Missing preview controller');
for(const code of scripts) new (require('vm').Script)(code,{filename:'preview.html inline'});
console.log('OK: CMS options match current sections/tags/groups; all preview code parses');
