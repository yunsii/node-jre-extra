import consola from 'consola'

import { getJavaBin, installJre, isJavaInstalled } from './helpers/java'

export async function ensureJavaEnv(force = false) {
  if (await isJavaInstalled()) {
    consola.log('You have installed java locally')
    return
  }

  await installJre(force)
}

export async function getJavaPath() {
  await ensureJavaEnv()
  return getJavaBin()
}
