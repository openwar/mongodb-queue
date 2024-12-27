# Changelog

All notable changes to this project will be documented in this file. See
[standard-version](https://github.com/conventional-changelog/standard-version)
for commit guidelines.

## [6.2.0](https://github.com/openwar/mongodb-queue/compare/v6.1.0...v6.2.0) (2024-12-27)

### Features

- :wrench: use rollup config with TS
  ([14fa7e7](https://github.com/openwar/mongodb-queue/commit/14fa7e7f9b9109cf7aa53b984fe53bf1dfacec91))

## [6.1.0](https://github.com/openwar/mongodb-queue/compare/v6.0.0...v6.1.0) (2024-12-27)

### Features

- :arrow_up: use rollup 4.x
  ([ae4369e](https://github.com/openwar/mongodb-queue/commit/ae4369ef14003da4f0ea009a250ef38b32b8539d))

## [6.0.0](https://github.com/openwar/mongodb-queue/compare/v5.0.2...v6.0.0) (2024-12-27)

### ⚠ BREAKING CHANGES

- drop support for NodeJS 16.x. Active maintenance ended in 2023-09-11.

### Features

- drop support for NodeJS 16.x
  ([8a3e870](https://github.com/openwar/mongodb-queue/commit/8a3e87073522c327c38b482551549cdb3b5f8e8b))

### [5.0.2](https://github.com/openwar/mongodb-queue/compare/v5.0.1...v5.0.2) (2024-12-27)

### [5.0.1](https://github.com/openwar/mongodb-queue/compare/v5.0.0...v5.0.1) (2024-12-27)

### Bug Fixes

- use node imports for builtin modules
  ([2939eb9](https://github.com/openwar/mongodb-queue/commit/2939eb9eb51ea3ae2d498c8f763a8b37e98db0b5))

## [5.0.0](https://github.com/openwar/mongodb-queue/compare/v4.0.1...v5.0.0) (2023-12-14)

### ⚠ BREAKING CHANGES

- drop support for mongodb@4.x.

We are supporting the latest 2 major versions.

- drop support for Node 14.x

NodeJS isn't giving active maintenance on these versions anymore:
https://nodejs.org/en/about/previous-releases

### Features

- add peerDep support for mongodb@6.x
  ([0d73881](https://github.com/openwar/mongodb-queue/commit/0d73881c3535a823d12bad51e46ff7585f4a5957))

### Bug Fixes

- drop support for NodeJS 14.x
  ([34e6b03](https://github.com/openwar/mongodb-queue/commit/34e6b03b5bacad5ed3a523bce7326000668acd76))

### [4.0.1](https://github.com/openwar/mongodb-queue/compare/v4.0.0...v4.0.1) (2023-10-30)

## [4.0.0](https://github.com/openwar/mongodb-queue/compare/v3.1.0...v4.0.0) (2022-07-13)

### ⚠ BREAKING CHANGES

- use the new `add(payload, options)` signature.

If you are using the `hashKey` param of `add` method, please migrate your code
to pass it as an optional param. Example:

```diff
- queue.add(payload, 'id');
+ queue.add(payload, { hashKey: 'id' })
```

or a more generic example,

```diff
- queue.add(payload, hashKey);
+ queue.add(payload, { hashKey })
```

- drop support for Node 12.x

NodeJS isn't giving active maintenance on these versions anymore:
https://nodejs.org/en/about/releases/ The EOL on this version was 2022-04-30.

### Features

- remove legacy `add` method signature
  ([635bba1](https://github.com/openwar/mongodb-queue/commit/635bba10583ee26d7dd7f52dc39d8a1699ab2ecc))

### Bug Fixes

- drop support for NodeJS 12.x
  ([c50909f](https://github.com/openwar/mongodb-queue/commit/c50909f3e4abb35d5ce24cca1baa1eb302768ac0))

## [3.1.0](https://github.com/openwar/mongodb-queue/compare/v3.0.0...v3.1.0) (2022-07-13)

### Features

- allow delay param to add method
  ([6b86dac](https://github.com/openwar/mongodb-queue/commit/6b86dacbd99fbcce3976a2d1dffbe5b4ca04ab61))

## [3.0.0](https://github.com/openwar/mongodb-queue/compare/v2.0.0...v3.0.0) (2022-01-19)

### ⚠ BREAKING CHANGES

- it is hard to support both versions (3.x and 4.x) of native driver on the same
  branch because 4.x has native types definitions and they diverge from the ones
  provided by @types/mongodb.

This means that this version might still be compatible with previous versions of
mongodb native driver (3.6.x and 3.7.x), but we aren't testing them due to
typescript mismatch.

Please open an issue and we will try to support your use case.

### Features

- add mongodb@4.x support
  ([3e37498](https://github.com/openwar/mongodb-queue/commit/3e37498adf1aaa290cf97c5e86b7a526cef91b13))

## [2.0.0](https://github.com/openwar/mongodb-queue/compare/v1.4.3...v2.0.0) (2022-01-17)

### ⚠ BREAKING CHANGES

- drop support for Node 13.x and 15.x

NodeJS isn't giving active maintenance on these versions anymore:
https://nodejs.org/en/about/releases/

### Features

- add official support to node@16
  ([4b6ab7d](https://github.com/openwar/mongodb-queue/commit/4b6ab7d4ec845d7898d8d37d295df1f5d5ac190d))
- add types to peerDeps (optional)
  ([a981e3e](https://github.com/openwar/mongodb-queue/commit/a981e3e865ed08913574ad03a352ca6be485326e))
- use returnDocument instead of returnOriginal
  ([9fe1521](https://github.com/openwar/mongodb-queue/commit/9fe1521b54374426b1d05bcdd5700f6453b1edbf))

### Bug Fixes

- drop support for NodeJS 13.x and 15.x
  ([02aced2](https://github.com/openwar/mongodb-queue/commit/02aced2c39aa598744ba4fd58b887928042228f5))

### [1.4.3](https://github.com/openwar/mongodb-queue/compare/v1.4.2...v1.4.3) (2021-04-02)

### [1.4.2](https://github.com/openwar/mongodb-queue/compare/v1.4.1...v1.4.2) (2021-04-02)

### Bug Fixes

- **deps:** [security] bump ini from 1.3.5 to 1.3.8
  ([ebcd446](https://github.com/openwar/mongodb-queue/commit/ebcd4467309e8d3896abb43643efffc334f741db))

### [1.4.1](https://github.com/openwar/mongodb-queue/compare/v1.4.0...v1.4.1) (2020-07-09)

## [1.4.0](https://github.com/openwar/mongodb-queue/compare/v1.3.2...v1.4.0) (2020-07-09)

### Features

- throw when add/get returns unexpected data
  ([370d786](https://github.com/openwar/mongodb-queue/commit/370d78633e00a353fd1132899db262321b29de63))
- **types:** payload as `unknown`
  ([2fc7d74](https://github.com/openwar/mongodb-queue/commit/2fc7d7440a46ae9b464d30f01448559e61baae11))

### [1.3.2](https://github.com/openwar/mongodb-queue/compare/v1.3.1...v1.3.2) (2020-05-23)

### [1.3.1](https://github.com/openwar/mongodb-queue/compare/v1.3.0...v1.3.1) (2020-03-21)

## [1.3.0](https://github.com/openwar/mongodb-queue/compare/v1.2.0...v1.3.0) (2020-03-21)

### Features

- support duplicate message check
  ([f38a35b](https://github.com/openwar/mongodb-queue/commit/f38a35b078f9e3b45dd51a5b174a693230c28e00))

## [1.2.0](https://github.com/openwar/mongodb-queue/compare/v1.1.4...v1.2.0) (2020-03-21)

### Features

- better typescript support for payload
  ([035164f](https://github.com/openwar/mongodb-queue/commit/035164fd777b88b4350fb1e592e65f76819bd499))

### [1.1.4](https://github.com/openwar/mongodb-queue/compare/v1.1.3...v1.1.4) (2020-03-10)

### Bug Fixes

- types for the payload
  ([97d8311](https://github.com/openwar/mongodb-queue/commit/97d8311f01a00111b77a7b64952592d4b89600b9))

### [1.1.3](https://github.com/openwar/mongodb-queue/compare/v1.1.2...v1.1.3) (2020-03-10)

### [1.1.2](https://github.com/openwar/mongodb-queue/compare/v1.1.0...v1.1.2) (2020-03-10)

### Bug Fixes

- date fields in DB
  ([b4d60ad](https://github.com/openwar/mongodb-queue/commit/b4d60ad33ff128266e82b4a736c38667fa54be83))

### [1.1.1](https://github.com/openwar/mongodb-queue/compare/v1.1.0...v1.1.1) (2020-03-10)

### Bug Fixes

- date fields in DB
  ([b4d60ad](https://github.com/openwar/mongodb-queue/commit/b4d60ad33ff128266e82b4a736c38667fa54be83))

# [1.1.0](https://github.com/openwar/mongodb-queue/compare/1.0.1...1.1.0) (2020-02-28)

### Features

- allow passing type of payload
  ([0b2271f](https://github.com/openwar/mongodb-queue/commit/0b2271fb57dd57347ecd047005baa884db7bd1a3))

## [1.0.1](https://github.com/openwar/mongodb-queue/compare/1.0.0...1.0.1) (2020-02-28)

### Bug Fixes

- types on Message were incorrect
  ([c15682f](https://github.com/openwar/mongodb-queue/commit/c15682f25047611809f88d493bd3eb487ad7fd5d))

# [1.0.0](https://github.com/openwar/mongodb-queue/compare/a9f608ab418c27873ea84065efe1c4abc162cde2...1.0.0) (2020-02-28)

### Features

- first draft for mongodb-queue with types
  ([a9f608a](https://github.com/openwar/mongodb-queue/commit/a9f608ab418c27873ea84065efe1c4abc162cde2))
