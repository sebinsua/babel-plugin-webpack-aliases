import test from 'ava';

import { transformFileSync } from 'babel-core';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function transformFile(path, configuration = { config: './runtime.webpack.config.js' }) {
    const out = transformFileSync(resolve(__dirname, path), {
        plugins: [
            [ '../../src/index.js', configuration ]
        ]
    });
    return out && out.code ? out.code.trim() : '';
}

function read(path) {
    return readFileSync(resolve(__dirname, path), 'utf8').trim();
}

test('basic require with the absolute resolve path', t => {
    const actual = transformFile('fixtures/basic.absolute.js', { config: './runtime.webpack.config.js' });
    const expected = read('fixtures/basic.expected.js');
    t.is(actual, expected);
});

test('basic require with the relative resolve path', t => {
    const actual = transformFile('fixtures/basic.relative.js', { config: './runtime.webpack.config.js' });
    const expected = read('fixtures/basic.expected.js');
    t.is(actual, expected);
});

test('filename require', t => {
    const actual = transformFile('fixtures/filename.js', { config: './runtime.webpack.config.js' });
    const expected = read('fixtures/filename.expected.js');
    t.is(actual, expected);
});

test('variable assignment', t => {
    const actual = transformFile('fixtures/variables.js', { config: './runtime.webpack.config.js' });
    const expected = read('fixtures/variables.expected.js');
    t.is(actual, expected);
});

test('requiring files from the root', t => {
    const actual = transformFile('fixtures/rootfolder.js', { config: './runtime.webpack.config.js' });
    const expected = read('fixtures/rootfolder.expected.js');
    t.is(actual, expected);
});

test('using the import syntax', t => {
    const actual = transformFile('fixtures/import.js', { config: './runtime.webpack.config.js' });
    const expected = read('fixtures/import.expected.js');

    t.is(actual, expected);
});

test('dont throw an exception if the config is found', t => {
    t.notThrows(() => transformFile('fixtures/basic.absolute.js', {
        config: "runtime.webpack.config.js",
        findConfig: true
    }));
});

test('throw an exception when we cant find the config', t => {
    t.throws(() => transformFile('fixtures/basic.absolute.js', {
        config: "DoesNotExist.js",
        findConfig: true
    }));
});

test('using config path from project root', t => {
    t.notThrows(() => transformFile('fixtures/basic.absolute.js', {
        config: "test/runtime.webpack.config.js",
        findConfig: true
    }));
});
