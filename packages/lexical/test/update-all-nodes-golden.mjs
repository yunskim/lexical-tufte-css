import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,parse} from 'node:path';
import {createRequire} from 'node:module';
import {validateDocument,NODE_SCHEMA} from '@lexical-tufte/document';
import {TESTED_LEXICAL_VERSION} from '../dist/index.js';
import {createAllNodesDocument,collectNodes} from './all-nodes-fixture.mjs';
assert.equal(process.env.UPDATE_ALL_NODES_GOLDEN,'1','Use explicit UPDATE_ALL_NODES_GOLDEN=1 to generate');
const require=createRequire(import.meta.url);let directory=dirname(require.resolve('lexical')),installed;
while(true){const path=join(directory,'package.json');if(existsSync(path)){const data=JSON.parse(readFileSync(path,'utf8'));if(data.name==='lexical'){installed=data.version;break;}}if(directory===parse(directory).root)break;directory=dirname(directory);}
assert.equal(installed,TESTED_LEXICAL_VERSION,'Refuse to generate from another Lexical version');
const destination=new URL(`./golden/lexical-${TESTED_LEXICAL_VERSION}-all-nodes.json`,import.meta.url);
assert.ok(!existsSync(destination)||process.env.OVERWRITE_ALL_NODES_GOLDEN==='1','Existing golden is protected; inspect and explicitly authorize overwrite');
const document=createAllNodesDocument(),checked=validateDocument(document);assert.equal(checked.ok,true,JSON.stringify(checked.diagnostics));
assert.deepEqual([...new Set(collectNodes(document.lexicalState.root).map(({node})=>node.type))].sort(),Object.keys(NODE_SCHEMA).sort());
writeFileSync(destination,JSON.stringify(document,null,2)+'\n');
console.log(`Generated ${TESTED_LEXICAL_VERSION} all-node golden with ${Object.keys(NODE_SCHEMA).length} node types`);
