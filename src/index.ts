import consola from 'consola'

import { getJavaBin, installJre, isJavaInstalled } from './helpers/java'

import type { InstallJreOptions } from './helpers/java'

export async function ensureJavaEnv(options: InstallJreOptions = {}) {
  if (await isJavaInstalled()) {
    consola.log('You have installed java locally')
    return
  }

  await installJre(options)
}

export async function getJavaPath(options: InstallJreOptions = {}) {
  await ensureJavaEnv(options)
  return getJavaBin()
}
