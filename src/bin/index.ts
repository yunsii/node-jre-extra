import { program } from 'commander'
import consola from 'consola'

import { ensureJavaEnv, getJavaPath } from '..'

program
  .command('install')
  .description('Install JRE')
  .action(async () => {
    await ensureJavaEnv()
  })

program
  .command('path')
  .description('Print jre path')
  .action(async () => {
    consola.log('Your current java path:', await getJavaPath())
  })

program.parse()
