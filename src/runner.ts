/*
 * 🦆 node-pm-cache: GitHub action to cache Yarn, NPM, and PNPM cache directories!
 * Copyright (c) 2022 Noel <cutie@floofy.dev>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { type PackageManager, assertValidValue, detectPackageManager, getCacheDirCommand, getLockfile } from './detect';
import { getExecOutput } from '@actions/exec';
import { hashFiles } from '@actions/glob';
import { SemVer } from 'semver';
import * as cache from '@actions/cache';
import * as core from '@actions/core';

const os: Record<string, string> = {
  darwin: 'macos',
  linux: 'linux',
  win32: 'windows'
};

const main = async () => {
  const nodeModulesDir = core.getInput('node-modules', { trimWhitespace: true });
  let packageManager = core.getInput('package-manager', { trimWhitespace: true }) as unknown as PackageManager;

  assertValidValue(packageManager);

  if (packageManager === 'detect') {
    core.info('Detecting package manager from environment...');
    packageManager = await detectPackageManager();
  }

  const [command, ...args] = await getCacheDirCommand(packageManager);
  const lockfile = getLockfile(packageManager);
  const result = await getExecOutput(command, args);
  const version = await getExecOutput('node', ['--version']).then((result) => new SemVer(result.stdout));

  core.info(`Resolved cache directory => ${result.stdout}`);
  core.setOutput('pkg-manager', packageManager);
  core.setOutput('lockfile', lockfile);

  const hash = await hashFiles(`**/${lockfile}`);
  core.debug(`lockfile hash [${lockfile}] => ${hash}`);

  const primaryKey = `${packageManager}-${os[process.platform]}-${version.major}-${hash}`;
  core.debug(`primary key => ${primaryKey}`);

  const key = await cache.restoreCache([result.stdout], primaryKey, [
    `${packageManager}-${os[process.platform]}-${version.major}-`
  ]);

  core.setOutput('cache-hit', Boolean(key));
  core.saveState('nodepm:cachePrimaryKey', primaryKey);

  if (key !== undefined && key === primaryKey) {
    core.info(`Received cache hit with primary key ${primaryKey}`);
  } else {
    core.warning(`Unable to hit cache with primary key [${primaryKey}]`);
  }

  const nmHash = await hashFiles(`**/${nodeModulesDir}`);
  const nmPrimaryKey = `${packageManager}-${os[process.platform]}-node_modules-${version.major}-${nmHash}`;
  const nodeModulesCache = await cache.restoreCache([nodeModulesDir], nmPrimaryKey, [
    `${packageManager}-${os[process.platform]}-node_modules-${version.major}-`
  ]);

  core.setOutput('node-modules-cache-hit', Boolean(nodeModulesCache));
  core.saveState('nodepm:nmPrimaryKey', nmPrimaryKey);

  if (nodeModulesCache === nmPrimaryKey) {
    core.info(`Received node_modules cache hit with primary key ${nmPrimaryKey}`);
  } else {
    core.warning(`Unable to hit cache with primary key [${nmPrimaryKey}]`);
  }
};

main().catch((ex) => core.setFailed(ex));
