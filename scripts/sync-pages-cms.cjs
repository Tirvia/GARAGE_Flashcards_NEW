/* Keep Pages CMS select options in sync with the editable section/tag/group catalog.
   The user never has to maintain dropdown values or technical codes manually. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const configPath = path.join(root, '.pages.yml');
let yaml = fs.readFileSync(configPath, 'utf8');
const sets = [
  ['SECTIONS', 'sections'],
  ['TAGS', 'tags'],
  ['GROUPS', 'groups'],
];

function read(collection) {
  return fs.readdirSync(path.join(root, 'content', collection))
    .filter(file => file.endsWith('.json'))
    .map(file => {
      const data = JSON.parse(fs.readFileSync(path.join(root, 'content', collection, file), 'utf8'));
      if (!data.id) data.id = file.replace(/\.json$/, '');
      return data;
    })
    .sort((a,b) => (a.order ?? 9999) - (b.order ?? 9999));
}

for (const [marker, collection] of sets) {
  const begin = '            # GARAGE_' + marker + '_START';
  const end = '            # GARAGE_' + marker + '_END';
  const p = yaml.indexOf(begin);
  const q = yaml.indexOf(end, p + begin.length);
  if (p < 0 || q < 0) throw new Error('Missing CMS options markers for ' + marker);
  const choices = read(collection)
    .map(x => {
      const name = String(x.name || x.id || '');
      const label = x.status === 'archived' ? name + ' (архив)' : name;
      return '            - {name: ' + JSON.stringify(x.id) +
        ', label: ' + JSON.stringify(label) + '}';
    });
  const block = begin + '\n' + choices.join('\n') + '\n' + end;
  yaml = yaml.slice(0,p) + block + yaml.slice(q + end.length);
  console.log(marker + ': ' + choices.length + ' options');
}

if (fs.readFileSync(configPath, 'utf8') !== yaml) {
  fs.writeFileSync(configPath, yaml, 'utf8');
  console.log('Updated .pages.yml dropdowns');
}
