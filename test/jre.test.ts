import path from 'node:path'

import { expect, test } from 'vitest'
import { $ } from 'execa'

import {
  downloadJre,
  getJreJavaBin,
  getJreUrl,
  installJre,
} from '../src/helpers/java'
import { getJavaBin } from '../src'

const jarPath = path.join(process.cwd(), 'resources', 'swagger-codegen-cli.jar')

test('Get jre binary download url', async () => {
  const jreUrl = getJreUrl()
  expect(jreUrl).toBeDefined()
})

test(
  'Parse jre binary download url',
  async () => {
    const downloadMirrorOrigin = 'https://hub.fgit.ml'
    const { url } = await getJreUrl({
      normalizeGithubUrl: (url) => {
        return new URL(`${url.pathname}${url.search}`, downloadMirrorOrigin)
      },
    })
    expect(url.startsWith(downloadMirrorOrigin)).eq(true)
  },
  {
    timeout: 300e3,
  },
)

test(
  'Download JRE',
  async () => {
    const downloadMirrorOrigin = 'https://hub.fgit.ml'
    const { id, url } = await getJreUrl({
      normalizeGithubUrl: (url) => {
        return new URL(`${url.pathname}${url.search}`, downloadMirrorOrigin)
      },
    })
    const result = await downloadJre({ id, url })
    expect(result).toBeDefined()
  },
  {
    timeout: 300e3,
  },
)

test('Get jre path', async () => {
  const javaBin = await getJavaBin()
  expect(javaBin).includes('java')
})

test(
  'Run jar file after installed JRE',
  async () => {
    await installJre()
    const javaPath = await getJreJavaBin()
    const result = await $`${javaPath} -jar ${jarPath}`
    expect(result.exitCode).equal(0)
  },
  {
    timeout: 600e3,
  },
)
