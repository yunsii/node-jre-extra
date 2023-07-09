import path from 'node:path'

import { expect, test } from 'vitest'
import { $ } from 'execa'

import { getJavaPath } from '../src'
import { getJreJavaBin, installJre } from '../src/helpers/java'

const jarPath = path.join(process.cwd(), 'resources', 'swagger-codegen-cli.jar')

test('Get jre path', async () => {
  const javaPath = await getJavaPath()
  expect(javaPath).includes('java')
})

test('Run jar file', async () => {
  const javaPath = await getJavaPath()
  const result = await $`${javaPath} -jar ${jarPath}`
  expect(result.exitCode).equal(0)
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
