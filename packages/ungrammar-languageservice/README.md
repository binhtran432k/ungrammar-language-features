# ungrammar-languageservice

A language service for Ungrammar can be reused in various applications, such as
the Monaco editor or Language Server Protocol (LSP) implementations.

[![NPM Version](https://img.shields.io/npm/v/ungrammar-languageservice.svg?style=flat-square)](https://www.npmjs.org/package/ungrammar-languageservice)
[![NPM Downloads](https://img.shields.io/npm/dm/ungrammar-languageservice.svg)](https://npmjs.org/package/ungrammar-languageservice)

## Why?

The _ungrammar-languageservice_ contains the language smarts behind the
Ungrammar editing experience of Visual Studio Code and the Monaco editor.

For the complete API see
[ungramLanguageService.ts](./src/ungramLanguageService.ts) and
[ungramLanguageTypes.ts](./src/ungramLanguageTypes.ts)

## Installation

    bun install --save ungrammar-languageservice

## Development

    git clone https://github.com/binhtran432k/ungrammar-language-features
    cd ungrammar-language-features/packages/ungrammar-languageservice
    bun install

Use `bun test` to compile and run tests
