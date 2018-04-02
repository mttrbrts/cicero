/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const ModelManager = require('composer-common').ModelManager;
const Writer = require('composer-common').Writer;
const GrammarVisitor = require('../src/grammarvisitor');
const Template = require('../src/template');
const logger = require('../src/logger');

const fs = require('fs');
const path = require('path');

const chai = require('chai');
chai.should();
chai.use(require('chai-things'));
chai.use(require('chai-as-promised'));

describe('GrammarVisitor', () => {

    describe('#visit', () => {

        it('should generate grammar from a modelmanager', async () => {

            const mm = new ModelManager();

            const model = fs.readFileSync(path.resolve(__dirname, 'data/latedeliveryandpenalty/models', 'model.cto'), 'utf8');
            mm.addModelFile(model, 'model.cto', true);

            const test = fs.readFileSync(path.resolve(__dirname, 'data/latedeliveryandpenalty/models', 'test.cto'), 'utf8');
            mm.addModelFile(test, 'test.cto', true);

            await mm.updateExternalModels();
            mm.validateModelFiles();

            const writer = new Writer();
            const parameters = {
                writer: writer
            };
            const gv = new GrammarVisitor();
            mm.accept(gv, parameters);

            const generatedGrammar = parameters.writer.getBuffer();
            generatedGrammar.should.not.be.null;
            logger.debug('Generated grammar', generatedGrammar);

            // check we can parse the generated grammar
            const ast = Template.compileGrammar(generatedGrammar);
            ast.should.not.be.null;
        });
    });
});