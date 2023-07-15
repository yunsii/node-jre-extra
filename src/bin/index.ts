import { InvalidArgumentError, program } from 'commander'
import consola from 'consola'
import { execaCommandSync } from 'execa'

import { getJavaBin, installJre, list } from '@/helpers/java'

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
  .option('-v, --version [number]', 'JRE version', customParseInt, 8)
  .option('-f, --force', 'Force install', false)
  .option('-m, --mirror', 'Install with mirror speeder, fastgit for now', false)
  .option('-v, --verbose', 'Verbose mode', false)
  .description('Install JRE')
  .action(async (options, command) => {
    const { version, force, mirror, verbose } = options

    if (verbose) {
      consola.debug('Install options', options)
    }
    const downloadMirrorOrigin = 'https://hub.fgit.ml'

    await installJre({
      force,
      jreOptions: {
        version,
        normalizeGithubUrl: mirror
          ? (url) => {
              return new URL(
                `${url.pathname}${url.search}`,
                downloadMirrorOrigin,
              )
            }
          : undefined,
      },
    })
  })

program
  .command('run')
  .argument('<arguments>', 'Run java with arguments')
  .option(
    '-v, --version [number]',
    'Assign specific JRE version',
    customParseInt,
  )
  .option('-l, --use-local', 'Whether use local JRE', true)
  .description('Run java with arguments')
  .action(async (_arguments, options) => {
    const { version, useLocal = true } = options

    const javaBin = await getJavaBin({
      jreOptions: {
        version,
      },
      useLocal,
    })
    execaCommandSync(`${javaBin} ${_arguments}`, {
      stdio: 'inherit',
    })
  })

program
  .command('list')
  .description('List all installed JRE(s)')
  .action(async () => {
    consola.log(
      'Installed JRE(s):',
      list()
        .map((item) => `\n* ${item}`)
        .join(''),
    )
  })

program.parse()
