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
var Field = require('composer-common').Field;
var ModelManager = require('composer-common').ModelManager;
var ModelFile = require('composer-common').ModelFile;
var RelationshipDeclaration = require('composer-common').RelationshipDeclaration;
var EnumDeclaration = require('composer-common').EnumDeclaration;
var EnumValueDeclaration = require('composer-common').EnumValueDeclaration;
var ClassDeclaration = require('composer-common').ClassDeclaration;
var util = require('util');
var debug = require('debug')('cicero:grammarvisitor');
/**
 * Converts composer models and types to Nearley rules
 *
 * @private
 * @class
 * @memberof module:cicero-core
 */
var GrammarVisitor = /** @class */ (function () {
    function GrammarVisitor() {
    }
    /**
     * Visitor design pattern
     * @param {Object} thing - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    GrammarVisitor.prototype.visit = function (thing, parameters) {
        if (thing instanceof ModelManager) {
            return this.visitModelManager(thing, parameters);
        }
        else if (thing instanceof ModelFile) {
            return this.visitModelFile(thing, parameters);
        }
        else if (thing instanceof EnumDeclaration) {
            return this.visitEnumDeclaration(thing, parameters);
        }
        else if (thing instanceof ClassDeclaration) {
            return this.visitClassDeclaration(thing, parameters);
        }
        else if (thing instanceof Field) {
            return this.visitField(thing, parameters);
        }
        else if (thing instanceof RelationshipDeclaration) {
            return this.visitRelationshipDeclaration(thing, parameters);
        }
        else if (thing instanceof EnumValueDeclaration) {
            return this.visitEnumValueDeclaration(thing, parameters);
        }
        else {
            throw new Error('Unrecognised type: ' + typeof thing + ', value: ' + util.inspect(thing, { showHidden: true, depth: 2 }));
        }
    };
    /**
     * Visitor design pattern
     * @param {ModelManager} modelManager - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    GrammarVisitor.prototype.visitModelManager = function (modelManager, parameters) {
        var _this = this;
        debug('entering visitModelManager');
        // Save the model manager so that we have access to it later.
        parameters.modelManager = modelManager;
        // Visit all of the files in the model manager.
        modelManager.getModelFiles().forEach(function (modelFile) {
            modelFile.accept(_this, parameters);
        });
        // generate the primitive types
        parameters.writer.writeLine(0, "\n# Basic types\nNUMBER -> [0-9] \n{% (d) => {return parseInt(d[0]);}%}\n\nDOUBLE_NUMBER -> NUMBER NUMBER\n{% (d) => {return '' + d[0] + d[1]}%}\n\nMONTH -> DOUBLE_NUMBER\nDAY -> DOUBLE_NUMBER\nYEAR -> DOUBLE_NUMBER DOUBLE_NUMBER\n{% (d) => {return '' + d[0] + d[1]}%}\n\nDATE -> MONTH \"/\" DAY \"/\" YEAR\n{% (d) => {return '' + d[0] + '/' + d[2] + '/' + d[4]}%}\n\nWord -> [\\S]:*\n{% (d) => {return d[0].join('');}%}\n\nBRACKET_PHRASE -> \"[\" Word (__ Word):* \"]\" {% ((d) => {return d[1] + ' ' + flatten(d[2]).join(\" \");}) %}\n\nString -> dqstring {% id %}\nDouble -> decimal {% id %}\nInteger -> int {% id %}\nLong -> int {% id %}\nBoolean -> \"true\" {% id %} | \"false\" {% id %}\nDateTime -> DATE  {% id %}");
        return null;
    };
    /**
     * Visitor design pattern
     * @param {ModelFile} modelFile - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    GrammarVisitor.prototype.visitModelFile = function (modelFile, parameters) {
        var _this = this;
        debug('entering visitModelFile', modelFile.getNamespace());
        // Save the model file so that we have access to it later.
        parameters.modelFile = modelFile;
        // Visit all of class declarations, but ignore the abstract ones and system ones.
        modelFile.getAllDeclarations()
            .filter(function (declaration) {
            return !(declaration.isAbstract() || declaration.isSystemType());
        })
            .forEach(function (declaration) {
            declaration.accept(_this, parameters);
        });
        return null;
    };
    /**
     * Visitor design pattern
     * @param {EnumDeclaration} enumDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    GrammarVisitor.prototype.visitEnumDeclaration = function (enumDeclaration, parameters) {
        var _this = this;
        var result = '';
        enumDeclaration.getOwnProperties().forEach(function (property) {
            if (result.length > 0) {
                result += ' | ';
            }
            result += property.accept(_this, parameters);
        });
        parameters.writer.writeLine(0, enumDeclaration.getName() + " ->  " + result);
        return result;
    };
    /**
     * Visitor design pattern
     * @param {ClassDeclaration} classDeclaration - the object being visited
     * @param {Object} parameters - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    GrammarVisitor.prototype.visitClassDeclaration = function (classDeclaration, parameters) {
        var _this = this;
        debug('entering visitClassDeclaration', classDeclaration.getName());
        // do not visit the template model itself, as we need to generate
        // that from the template grammar, including all the source text.
        if (!classDeclaration.getDecorator('AccordTemplateModel')) {
            var result_1 = '';
            // Walk over all of the properties of this class and its super classes.
            classDeclaration.getProperties().forEach(function (property) {
                if (result_1.length > 0) {
                    result_1 += ' __ ';
                }
                result_1 += property.accept(_this, parameters);
            });
            parameters.writer.writeLine(0, classDeclaration.getName() + " ->  " + result_1 + "\n{% (data) => {\n      return {\n         $class : \"" + classDeclaration.getFullyQualifiedName() + "\",");
            // populate all the properties
            classDeclaration.getProperties().forEach(function (property, index) {
                var sep = index < classDeclaration.getProperties().length - 1 ? ',' : '';
                parameters.writer.writeLine(3, property.getName() + " : data[" + index * 2 + "]" + sep);
            });
            parameters.writer.writeLine(2, '};');
            parameters.writer.writeLine(1, '}');
            parameters.writer.writeLine(0, '%}\n');
            return null;
        }
    };
    /**
     * Visitor design pattern
     * @param {Field} field - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    GrammarVisitor.prototype.visitField = function (field, parameters) {
        debug('entering visitField', field.getName());
        var qualifier = '';
        if (field.isArray()) {
            if (field.isOptional()) {
                qualifier = ':*';
            }
            else {
                qualifier = ':+';
            }
        }
        else {
            if (field.isOptional()) {
                qualifier = ':?';
            }
        }
        return this.toGrammarType(field.getType()) + qualifier;
    };
    /**
     * Visitor design pattern
     * @param {EnumValueDeclaration} enumValueDeclaration - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    GrammarVisitor.prototype.visitEnumValueDeclaration = function (enumValueDeclaration, parameters) {
        debug('entering visitEnumValueDeclaration', enumValueDeclaration.getName());
        return "\"" + enumValueDeclaration.getName() + "\" {% id %}";
    };
    /**
     * Visitor design pattern
     * @param {Relationship} relationship - the object being visited
     * @param {Object} parameters  - the parameter
     * @return {Object} the result of visiting or null
     * @private
     */
    GrammarVisitor.prototype.visitRelationshipDeclaration = function (relationship, parameters) {
        debug('entering visitRelationshipDeclaration', relationship.getName());
        return 'String';
    };
    /**
     * Converts a Composer type to a Nearley grammar type.
     * @param {string} type  - the composer type
     * @return {string} the corresponding type to use for Nearley
     * @private
     */
    GrammarVisitor.prototype.toGrammarType = function (type) {
        return type;
    };
    return GrammarVisitor;
}());
module.exports = GrammarVisitor;
