import { InvalidArgumentError, program } from 'commander'
import consola from 'consola'

import { ensureJavaEnv, getJavaPath } from '..'

function customParseInt(value: string) {
  // parseInt takes a string and a radix
  const parsedValue = parseInt(value, 10)
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError('Not a number.')
  }
  return parsedValue
}

program
  .command('install')
  .option('-v, --version [number]', 'JRE version', customParseInt)
  .description('Install JRE')
  .action(async (options, command) => {
    await ensureJavaEnv({
      force: true,
      downloadOptions: {
        jreOptions: {
          version: options.version,
        },
      },
    })
  })

program
  .command('path')
  .description('Print jre path')
  .action(async () => {
    consola.log('Your current java path:', await getJavaPath())
  })

program.parse()
