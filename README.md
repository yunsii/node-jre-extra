# node-jre-extra

[![NPM version](https://img.shields.io/npm/v/node-jre-extra?color=a1b858&label=)](https://www.npmjs.com/package/node-jre-extra)

This module will embed the Java Runtime Environment (JRE) into a Node.js app. It will download the platform specific JRE at installation time. Afterwards the embedding app can be bundled into a platform specific package. This package would not require any further JRE installation steps by users.

## Usage

After install the package, it will install JRE automatically (support JRE 8u for now), and then:

```ts
import { getJavaPath } from 'node-jre-extra'
import { $ } from 'execa'

const jarPath = 'hello.jar'
const javaPath = await getJavaPath()
const result = await $`${javaPath} -jar ${jarPath}`
console.log(result)
```

Also, you can clone the repo and run `test` script.

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
