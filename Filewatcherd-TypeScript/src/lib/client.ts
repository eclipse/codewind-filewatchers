/*******************************************************************************
* Copyright (c) 2019, 2020 IBM Corporation and others.
* All rights reserved. This program and the accompanying materials
* are made available under the terms of the Eclipse Public License v2.0
* which accompanies this distribution, and is available at
* http://www.eclipse.org/legal/epl-v20.html
*
* Contributors:
*     IBM Corporation - initial API and implementation
*******************************************************************************/

import * as log from "./Logger";

import { FileLogger } from "./FileLogger";
import { FileWatcher } from "./FileWatcher";

import crypto = require("crypto");
import fs = require("fs");
import os = require("os");
import path = require("path");
import { IAuthTokenProvider } from "./IAuthTokenProvider";
import { IWatchService } from "./IWatchService";
import { WatchService } from "./WatchService";

/**
 * This is the client-facing constructor for the filewatcher (and should only be called
 * once per Codewind server instance).
 * @param codewindURL - Eg, http://localhost:9090
 * @param logDir - Directory to write logs to, by default ~/.codewind.
 */
export default async function createWatcher(codewindURL: string, pathToInstaller: string, logDir?: string,
                                            externalWatchService?: IWatchService,
                                            authTokenProvider?: IAuthTokenProvider)
    : Promise<FileWatcher> {

    // Default log level
    let logLevel = log.LogLevel.INFO;

    // Allow the user to set DEBUG log level via a case-nonspecific environment variable
    outer_for: for (const key in process.env) {
        if (process.env.hasOwnProperty(key) && key.toLowerCase() === "filewatcher_log_level") {
            if (process.env[key] === "debug") {
                logLevel = log.LogLevel.DEBUG;
                break outer_for;
            }
        }
    }

    if (!log.LogSettings.getInstance().internalGetFileLogger()) {
        log.setLogLevel(logLevel);

        if (!logDir) {
            logDir = path.join(os.homedir(), ".codewind");
        }

        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir);
        }

        console.log("codewind-filewatcher logging to " + logDir + " with log level " + log.logLevelToString(logLevel)
            + " on platform '" + process.platform + "'");

        const fileLogger = new FileLogger(logDir);

        log.LogSettings.getInstance().setFileLogger(fileLogger);
        log.LogSettings.getInstance().setOutputLogsToScreen(true);

    }

    if(pathToInstaller.trim().length === 0) {
        throw new Error("Path to installer must be specified.");
    }

    const watchService = new WatchService();

    const clientUuid = crypto.randomBytes(16).toString("hex");

    const fw = new FileWatcher(codewindURL, watchService, (externalWatchService) ? externalWatchService : undefined,
        pathToInstaller, clientUuid, authTokenProvider);

    return fw;
}
