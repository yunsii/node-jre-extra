import fse from 'fs-extra'
import consola from 'consola'

import {
  decompressJre,
  downloadJre,
  getDestinationDir,
  getJavaBin,
  isJavaInstalled,
} from './helpers/java'

export async function installJre(force = false) {
  if (await isJavaInstalled()) {
    consola.log('You have installed java locally')
    return
  }

  if (!force && fse.existsSync(getDestinationDir())) {
    consola.success('JRE installed')
    return
  }

  if (force) {
    fse.removeSync(getDestinationDir())
  }

  try {
    await downloadJre()
    await decompressJre()
  } catch (err) {
    fse.removeSync(getDestinationDir())
    throw err
  }
}

export async function getJavaPath() {
  await installJre()
  return getJavaBin()
}
