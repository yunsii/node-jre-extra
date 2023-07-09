# node-jre-extra

[![NPM version](https://img.shields.io/npm/v/node-jre-extra?color=a1b858&label=)](https://www.npmjs.com/package/node-jre-extra)

This module will embed the Java Runtime Environment (JRE) into a Node.js app. It will download the platform specific JRE at installation time. Afterwards the embedding app can be bundled into a platform specific package. This package would not require any further JRE installation steps by users.

## Build & Publish

- `npm run build`
- `npx changeset`
- `npx changeset version`
- `git commit`
- `npx changeset publish`
- `git push --follow-tags`

> [`changeset` prerelease doc](https://github.com/changesets/changesets/blob/main/docs/prereleases.md)

## Credit

- [schreiben/node-jre](https://github.com/schreiben/node-jre/tree/master)

## License

[MIT](./LICENSE) License © 2022 [Yuns](https://github.com/yunsii)
