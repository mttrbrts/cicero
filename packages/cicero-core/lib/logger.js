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
var winston = require('winston');
var fs = require('fs');
var env = process.env.NODE_ENV || 'development';
var tsFormat = function () { return (new Date()).toLocaleTimeString(); };
var logDir = 'log';
// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            colorize: true,
            timestamp: tsFormat,
            level: 'info'
        }),
        new (winston.transports.File)({
            name: 'logs-file',
            filename: logDir + "/trace.log",
            level: env === 'development' ? 'debug' : 'info'
        })
    ]
});
logger.entry = logger.debug;
logger.exit = logger.debug;
logger.log('info', 'Logging initialized.', new Date());
module.exports = logger;
