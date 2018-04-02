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
var logger = require('./logger');
var crypto = require('crypto');
/**
 * A Clause is executable business logic, linked to a natural language (legally enforceable) template.
 * A Clause must be constructed with a template and then prior to execution the data for the clause must be set.
 * Set the data for the clause (an instance of the template model) by either calling the setData method or by
 * calling the parse method and passing in natural language text that conforms to the template grammar.
 * @public
 * @class
 * @memberof module:cicero-core
 */
var Clause = /** @class */ (function () {
    /**
     * Create the Clause and link it to a Template.
     * @param {Template} template  - the template for the clause
     */
    function Clause(template) {
        this.template = template;
        this.data = null;
    }
    /**
     * Set the data for the clause
     * @param {object} data  - the data for the clause, must be an instance of the
     * template model for the clause's template
     */
    Clause.prototype.setData = function (data) {
        // verify that data is an instance of the template model
        var templateModel = this.getTemplate().getTemplateModel();
        if (data.$class !== templateModel.getFullyQualifiedName()) {
            throw new Error("Invalid data, must be a valid instance of the template model " + templateModel.getFullyQualifiedName() + " but got: " + JSON.stringify(data) + " ");
        }
        // validate the data using the template model
        logger.debug('Setting clause data: ' + JSON.stringify(data));
        var resource = this.template.getSerializer().fromJSON(data);
        resource.validate();
        // passed validation!
        this.data = data;
    };
    /**
     * Get the data for the clause
     * @return {object} - the data for the clause, or null if it has not been set
     */
    Clause.prototype.getData = function () {
        return this.data;
    };
    /**
     * Set the data for the clause by parsing natural language text.
     * @param {string} text  - the data for the clause
     */
    Clause.prototype.parse = function (text) {
        var parser = this.getTemplate().getParser();
        parser.feed(text);
        if (parser.results.length !== 1) {
            var head_1 = JSON.stringify(parser.results[0]);
            parser.results.forEach(function (element) {
                if (head_1 !== JSON.stringify(element)) {
                    throw new Error('Ambigious clause text. Got ' + parser.results.length + ' ASTs for text: ' + text);
                }
            }, this);
        }
        var ast = parser.results[0];
        logger.debug('Result of parsing: ' + ast);
        if (!ast) {
            throw new Error('Parsing clause text returned a null AST. This may mean the text is valid, but not complete.');
        }
        this.setData(ast);
    };
    /**
     * Returns the identifier for this clause. The identifier is the identifier of
     * the template plus '-' plus a hash of the data for the clause (if set).
     * @return {String} the identifier of this clause
     */
    Clause.prototype.getIdentifier = function () {
        var hash = '';
        if (this.data) {
            var textToHash = JSON.stringify(this.data);
            var hasher = crypto.createHash('sha256');
            hasher.update(textToHash);
            hash = '-' + hasher.digest('hex');
        }
        return this.getTemplate().getIdentifier() + hash;
    };
    /**
     * Returns the template for this clause
     * @return {Template} the template for this clause
     */
    Clause.prototype.getTemplate = function () {
        return this.template;
    };
    /**
     * Returns a JSON representation of the clause
     * @return {object} the JS object for serialization
     */
    Clause.prototype.toJSON = function () {
        return {
            template: this.getTemplate().getIdentifier(),
            data: this.getData()
        };
    };
    return Clause;
}());
module.exports = Clause;
