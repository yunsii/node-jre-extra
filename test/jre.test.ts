import path from 'node:path'

import { expect, test } from 'vitest'
import { $ } from 'execa'
import fse from 'fs-extra'

import { getJavaPath } from '../src'
import {
  downloadJre,
  getJreJavaBin,
  getJreUrl,
  installJre,
} from '../src/helpers/java'

const jarPath = path.join(process.cwd(), 'resources', 'swagger-codegen-cli.jar')

test('Get jre binary download url', async () => {
  const jreUrl = getJreUrl()
  expect(jreUrl).toBeDefined()
})

test(
  'Download JRE',
  async () => {
    const result = await downloadJre({ destDir: __dirname })
    fse.removeSync(result)
    expect(result).toBeDefined()
  },
  {
    timeout: 30e3,
  },
)

test('Get jre path', async () => {
  const javaPath = await getJavaPath()
  expect(javaPath).includes('java')
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
    timeout: 60e3,
  },
)
