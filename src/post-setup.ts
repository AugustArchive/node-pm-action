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
import { debug, getInput, info, setFailed, setOutput } from '@actions/core';
import { getExecOutput } from '@actions/exec';
import { hashFiles } from '@actions/glob';
import { saveCache } from '@actions/cache';
import { SemVer } from 'semver';

const os: Record<string, string> = {
  darwin: 'macos',
  linux: 'linux',
  win32: 'windows'
};

const main = async () => {
  info('Saving package manager and node-modules cache...');

  const nodeModulesDir = getInput('node-modules', { trimWhitespace: true });
  let packageManager = getInput('package-manager', { trimWhitespace: true }) as unknown as PackageManager;

  assertValidValue(packageManager);
  if (packageManager === 'detect') {
    packageManager = await detectPackageManager();
  }

  const [command, ...args] = await getCacheDirCommand(packageManager);
  const lockfile = getLockfile(packageManager);
  const result = await getExecOutput(command, args);
  const version = await getExecOutput('node', ['--version']).then((result) => new SemVer(result.stdout));

  info(`Resolved cache directory => ${result.stdout}`);
  setOutput('pkg-manager', packageManager);
  setOutput('lockfile', lockfile);

  const hash = await hashFiles(`**/${lockfile}`);
  debug(`lockfile hash [${lockfile}] => ${hash}`);

  const primaryKey = `${packageManager}-${os[process.platform]}-${version.major}-${hash}`;
  debug(`primary key => ${primaryKey}`);

  const nmHash = await hashFiles(nodeModulesDir);
  const nmPrimaryKey = `${packageManager}-${os[process.platform]}-node_modules-${version.major}-${nmHash}`;

  await saveCache([result.stdout.trim()], primaryKey);
  await saveCache([nodeModulesDir], nmPrimaryKey);

  info('done!');
};

main().catch((ex) => setFailed(ex));
