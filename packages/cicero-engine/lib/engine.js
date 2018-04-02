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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var Logger = require('./logger');
var logger = require('cicero-core').logger;
var ResourceValidator = require('composer-common/lib/serializer/resourcevalidator');
var _a = require('vm2'), VM = _a.VM, VMScript = _a.VMScript;
/**
 * <p>
 * Engine class. Stateless execution of clauses against a request object, returning a response to the caller.
 * </p>
 * @class
 * @public
 * @memberof module:cicero-engine
 */
var Engine = /** @class */ (function () {
    /**
     * Create the Engine.
     */
    function Engine() {
        this.scripts = {};
    }
    /**
     * Compile and cache a clause with Jura logic
     * @param {Clause} clause  - the clause to compile
     * @private
     */
    Engine.prototype.compileJuraClause = function (clause) {
        var allJuraScripts = '';
        var template = clause.getTemplate();
        template.getScriptManager().getScripts().forEach(function (element) {
            if (element.getLanguage() === '.jura') {
                allJuraScripts += element.getContents();
            }
        }, this);
        if (allJuraScripts === '') {
            throw new Error('Did not find any Jura logic');
        }
        allJuraScripts += this.buildJuraDispatchFunction(clause);
        // console.log(allJuraScripts);
        var script = new VMScript(allJuraScripts);
        this.scripts[clause.getIdentifier()] = script;
    };
    /**
     * Compile and cache a clause with JavaScript logic
     * @param {Clause} clause  - the clause to compile
     * @private
     */
    Engine.prototype.compileJsClause = function (clause) {
        var allJsScripts = '';
        var template = clause.getTemplate();
        template.getScriptManager().getScripts().forEach(function (element) {
            if (element.getLanguage() === '.js') {
                allJsScripts += element.getContents();
            }
        }, this);
        if (allJsScripts === '') {
            throw new Error('Did not find any JavaScript logic');
        }
        allJsScripts += this.buildJsDispatchFunction(clause);
        // console.log(allJsScripts);
        var script = new VMScript(allJsScripts);
        this.scripts[clause.getIdentifier()] = script;
    };
    /**
     * Generate the runtime dispatch logic for Jura
     * @param {Clause} clause  - the clause to compile
     * @return {string} the Javascript code for dispatch
     * @private
     */
    Engine.prototype.buildJuraDispatchFunction = function (clause) {
        // get the function declarations of all functions
        // that have the @clause annotation
        var functionDeclarations = clause.getTemplate().getScriptManager().getScripts().map(function (ele) {
            return ele.getFunctionDeclarations();
        })
            .reduce(function (flat, next) {
            return flat.concat(next);
        })
            .filter(function (ele) {
            return ele.getDecorators().indexOf('AccordClauseLogic') >= 0;
        }).map(function (ele) {
            return ele;
        });
        if (functionDeclarations.length === 0) {
            throw new Error('Did not find any function declarations with the @AccordClauseLogic annotation');
        }
        var code = "\n        __dispatch(data,request);\n\n        function __dispatch(data,request) {\n            // Jura dispatch call\n            let context = {this: data, request: serializer.toJSON(request), this: data, now: moment()};\n            return serializer.fromJSON(dispatch(context));\n        } \n        ";
        logger.debug(code);
        return code;
    };
    /**
     * Generate the runtime dispatch logic for JavaScript
     * @param {Clause} clause  - the clause to compile
     * @return {string} the Javascript code for dispatch
     * @private
     */
    Engine.prototype.buildJsDispatchFunction = function (clause) {
        // get the function declarations of all functions
        // that have the @clause annotation
        var functionDeclarations = clause.getTemplate().getScriptManager().getScripts().map(function (ele) {
            return ele.getFunctionDeclarations();
        })
            .reduce(function (flat, next) {
            return flat.concat(next);
        })
            .filter(function (ele) {
            return ele.getDecorators().indexOf('AccordClauseLogic') >= 0;
        }).map(function (ele) {
            return ele;
        });
        if (functionDeclarations.length === 0) {
            throw new Error('Did not find any function declarations with the @AccordClauseLogic annotation');
        }
        var head = "\n        __dispatch(data,request);\n\n        function __dispatch(data,request) {\n            switch(request.getFullyQualifiedType()) {\n        ";
        var methods = '';
        functionDeclarations.forEach(function (ele, n) {
            methods += "\n            case '" + ele.getParameterTypes()[1] + "':\n                let type" + n + " = '" + ele.getParameterTypes()[2] + "';\n                let ns" + n + " = type" + n + ".substr(0, type" + n + ".lastIndexOf('.'));\n                let clazz" + n + " = type" + n + ".substr(type" + n + ".lastIndexOf('.')+1);\n                let response" + n + " = factory.newTransaction(ns" + n + ", clazz" + n + ");\n                let context" + n + " = {request: request, response: response" + n + ", data: data};\n                " + ele.getName() + "(context" + n + ");\n                return context" + n + ".response;\n            break;";
        });
        var tail = "\n            default:\n                throw new Error('No function handler for ' + request.getFullyQualifiedType() );\n            } // switch\n            return 'oops';\n        }\n        ";
        var code = head + methods + tail;
        logger.debug(code);
        return code;
    };
    /**
     * Execute a clause, passing in the request object
     * @param {Clause} clause  - the clause to execute
     * @param {object} request  - the request, a JS object that can be deserialized
     * using the Composer serializer.
     * @param {boolean} forcejs  - whether to force JS logic.
     * @return {Promise} a promise that resolves to a result for the clause
     * @private
     */
    Engine.prototype.execute = function (clause, request, forcejs) {
        return __awaiter(this, void 0, void 0, function () {
            var template, tx, script, data, factory, vm, Fs, Path, jurRuntime, response, result;
            return __generator(this, function (_a) {
                template = clause.getTemplate();
                template.logicjsonly = forcejs;
                tx = template.getSerializer().fromJSON(request, { validate: false, acceptResourcesForRelationships: true });
                tx.$validator = new ResourceValidator({ permitResourcesForRelationships: true });
                tx.validate();
                logger.debug('Engine processing ' + request.$class);
                script = this.scripts[clause.getIdentifier()];
                if (!script) {
                    if (template.logicjsonly) {
                        this.compileJsClause(clause);
                    }
                    else {
                        // Attempt jura compilation first
                        try {
                            this.compileJuraClause(clause);
                        }
                        catch (err) {
                            logger.debug('Error compiling Jura logic, falling back to JavaScript' + err);
                            this.compileJsClause(clause);
                        }
                    }
                }
                script = this.scripts[clause.getIdentifier()];
                if (!script) {
                    throw new Error('Failed to created executable script for ' + clause.getIdentifier());
                }
                data = clause.getData();
                factory = template.getFactory();
                vm = new VM({
                    timeout: 1000,
                    sandbox: {
                        moment: require('moment'),
                        serializer: template.getSerializer(),
                        logger: new Logger(template.getSerializer())
                    }
                });
                // add immutables to the context
                vm.freeze(tx, 'request'); // Second argument adds object to global.
                vm.freeze(data, 'data'); // Second argument adds object to global.
                vm.freeze(factory, 'factory'); // Second argument adds object to global.
                Fs = require('fs');
                Path = require('path');
                jurRuntime = Fs.readFileSync(Path.join(__dirname, '..', '..', '..', 'node_modules', 'jura-engine', 'lib', 'juraruntime.js'), 'utf8');
                vm.run(jurRuntime);
                response = vm.run(script);
                response.$validator = new ResourceValidator({ permitResourcesForRelationships: true });
                response.validate();
                result = {
                    'clause': clause.getIdentifier(),
                    'request': request,
                    'response': template.getSerializer().toJSON(response, { convertResourcesToRelationships: true })
                };
                return [2 /*return*/, result];
            });
        });
    };
    return Engine;
}());
module.exports = Engine;
