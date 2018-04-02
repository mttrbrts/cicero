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
var logger = require('cicero-core').logger;
/**
 * <p>
 * A logger class, exposed to logic
 * </p>
 * @public
 * @memberof module:cicero-engine
 */
var Logger = /** @class */ (function () {
    /**
     * Create the Logger.
     * @param {Serializer} serializer - the composer serializer to use to convert objects to JSON
     */
    function Logger(serializer) {
        this.serializer = serializer;
    }
    /**
     * Log an info level message
     * @param {object} obj - the object to log
     */
    Logger.prototype.info = function (obj) {
        if (typeof obj === 'object') {
            var printable_1 = {};
            var keys = Object.keys(obj);
            keys.forEach(function (key) {
                var element = obj[key];
                if (element.getType) {
                    printable_1[key] = this.serializer.toJSON(element, { validate: false, permitResourcesForRelationships: true });
                }
                else {
                    printable_1[key] = element;
                }
            }, this);
            logger.info('CICERO-ENGINE', JSON.stringify(printable_1));
        }
        else {
            logger.info('CICERO-ENGINE', obj);
        }
    };
    return Logger;
}());
module.exports = Logger;
