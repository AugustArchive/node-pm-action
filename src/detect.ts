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

import { getExecOutput } from '@actions/exec';
import { assertIsError } from '@noelware/utils';
import { satisfies } from 'semver';
import { info } from '@actions/core';

const packageManagers: PackageManager[] = ['npm', 'pnpm', 'yarn', 'detect'];
export type PackageManager = 'yarn' | 'pnpm' | 'npm' | 'detect';

export const assertValidValue = (value: unknown) => {
  if (typeof value !== 'string') throw new TypeError(`Expected \`string\`, but received \`${value}\``);

  const isValid = packageManagers.some((i) => value === i);
  if (!isValid) throw new TypeError(`Expected ${packageManagers.join(', ')}, but received \`${value}\`.`);
};

export const detectPackageManager = async (): Promise<PackageManager> => {
  // pnpm > yarn > npm
  try {
    const version = await getExecOutput('pnpm', ['--version']);
    info(`Detected and using pnpm! (v${version.stdout.trim()})`);

    return 'pnpm';
  } catch (e) {
    // do nothing.
  }

  try {
    const version = await getExecOutput('yarn', ['--version']);
    info(`Detected and using Yarn v${version.stdout.trim()}!`);

    return 'yarn';
  } catch (e) {
    // do nothing.
  }

  try {
    const version = await getExecOutput('npm', ['--version']);
    info(`Unable to locate Yarn or pnpm, defaulting to npm v${version.stdout.trim()}...`);

    return 'npm';
  } catch (e) {
    assertIsError(e);
    throw new Error('Unable to detect npm, did you install Node.js via actions/setup-node?');
  }
};

export const getCacheDirCommand = async (packageManager: PackageManager): Promise<[string, ...string[]]> => {
  switch (packageManager) {
    case 'npm':
      return ['npm', 'config', 'get', 'cache'];

    case 'yarn': {
      const version = await getExecOutput('yarn', ['--version']);

      // Yarn 2.x+ changed the cache dir command.
      if (satisfies(version.stdout, '>=2.x')) {
        return ['yarn', 'config', 'get', 'cacheFolder'];
      }

      return ['yarn', 'cache', 'dir'];
    }

    case 'pnpm':
      return ['pnpm', 'get', 'store'];

    default:
      throw new Error('Unable to get cache dir command.');
  }
};

export const getLockfile = (packageManager: PackageManager) => {
  switch (packageManager) {
    case 'npm':
      return 'package-lock.json';
    case 'yarn':
      return 'yarn.lock';
    case 'pnpm':
      return 'pnpm-lock.yaml';
    default:
      throw new Error('Unable to get lockfile for package manager.');
  }
};
