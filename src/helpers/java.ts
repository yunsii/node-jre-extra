import os from 'node:os'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { $ } from 'execa'
import fse from 'fs-extra'
import decompress from 'decompress'
import consola from 'consola'
import { DownloaderHelper } from 'node-downloader-helper'

// ref: https://sebhastian.com/dirname-is-not-defined-javascript/
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const supportedArchMap = {
  arm64: 'aarch64',
  arm: 'arm',
  ppc64: 'ppc64',
  x64: 'x64',
  ia32: 'x86-32',

  // 以下未找到根据 os.arch() 的对应值，但是 jre 存在

  sparcv9: 'sparcv9',
  ppc64le: 'ppc64le',
  x86: 'x86',
  x32: 'x32',
  s390x: 's390x',
  riscv64: 'riscv64',
} as const

export function checkArch() {
  const arch = os.arch()

  if (!(arch in supportedArchMap)) {
    throw new Error(
      `Unsupported CPU architecture, supported for now: ${Object.values(
        supportedArchMap,
      ).join(', ')}`,
    )
  }

  return supportedArchMap[arch as keyof typeof supportedArchMap]
}

const supportedPlatformMap = {
  'linux': 'linux',
  'aix': 'aix',
  'darwin': 'mac',
  'win32': 'windows',

  // 以下未找到根据 os.platform() 的对应值，但是 jre 存在

  'solaris': 'solaris',
  'alpine-linux': 'alpine-linux',
} as const

export function checkPlatform() {
  const platform = os.platform()

  if (!(platform in supportedPlatformMap)) {
    throw new Error(
      `Unsupported operating system platform, supported for now: ${Object.values(
        supportedPlatformMap,
      ).join(', ')}`,
    )
  }

  return supportedPlatformMap[platform as keyof typeof supportedPlatformMap]
}

export interface GetJreUrlOptions {
  /**
   * default: 8
   *
   * https://api.adoptium.net/v3/info/available_releases
   */
  version?: number
  /**
   * default: 'normal'
   */
  heapSize?: 'normal' | 'large'
  /**
   * default: 'jre
   */
  imageType?: 'jdk' | 'jre'
}

/**
 * ref: https://api.adoptium.net/q/swagger-ui/#/Binary
 */
export function getJreUrl(options: GetJreUrlOptions = {}) {
  const arch = checkArch()
  const platform = checkPlatform()

  const {
    version = Number(process.env.JRE_EXTRA_VERSION) || 8,
    heapSize = process.env.JRE_EXTRA_HEAP_SIZE || 'normal',
    imageType = process.env.JRE_EXTRA_IMAGE_TYPE || 'jre',
  } = options

  const urlSegments = [
    'https://api.adoptium.net/v3/binary/latest',
    `/${version}`,
    `/ga`,
    `/${platform}`,
    `/${arch}`,
    `/${imageType}`,
    `/hotspot`,
    `/${heapSize}`,
    `/eclipse`,
  ]

  return urlSegments.join('')
}

export function getDestinationDir() {
  const dir = path.join(process.cwd(), 'node_modules', '.jre-extra')
  return dir
}

export function getJreDecompressDir() {
  return path.join(getDestinationDir())
}

export interface DownloadJreOptions {
  jreOptions?: GetJreUrlOptions
  destDir?: string
}

export function downloadJre(options: DownloadJreOptions = {}) {
  const { jreOptions, destDir } = options

  const url = getJreUrl(jreOptions)
  const mergedDestDir = destDir || getDestinationDir()

  fse.ensureDirSync(mergedDestDir)

  consola.log(`JRE download url: ${url}`)

  return new Promise<string>((resolve, reject) => {
    const dl = new DownloaderHelper(url, mergedDestDir)
    dl.on('end', (event) => {
      consola.success(`Download completed, saved to: ${destDir}`)
      resolve(event.filePath)
    })
    dl.on('error', (err) => {
      reject(err)
    })
    dl.start().catch((err) => {
      reject(err)
    })
  })
}

export function getJreBinDir() {
  const jreDecompressDir = getJreDecompressDir()

  const target = fse
    .readdirSync(jreDecompressDir)
    .find((item) =>
      fse.lstatSync(path.join(jreDecompressDir, item)).isDirectory(),
    )

  if (!target) {
    throw new Error(
      'JRE bin directory can not found, maybe jre decompress failed?',
    )
  }

  return path.join(jreDecompressDir, target, 'bin')
}

export async function getJreJavaBin() {
  const jreBinDIr = getJreBinDir()

  const target = fse.readdirSync(jreBinDIr).find((item) => {
    return (
      fse.lstatSync(path.join(jreBinDIr, item)).isFile() &&
      path.parse(item).name === 'java'
    )
  })

  if (!target) {
    throw new Error(
      'Java executable file can not found, Maybe jre decompress cracked?',
    )
  }

  return path.join(jreBinDIr, target)
}

export async function getJavaBin() {
  if (await isJavaInstalled()) {
    return 'java'
  }

  return await getJreJavaBin()
}

export async function isJavaInstalled() {
  try {
    const result = await $`java -version`
    return result.exitCode === 0
  } catch (err) {
    return false
  }
}

export interface InstallJreOptions {
  downloadOptions?: DownloadJreOptions
  force?: boolean
}

export async function installJre(options: InstallJreOptions = {}) {
  const { downloadOptions, force = false } = options

  if (!force && fse.existsSync(getDestinationDir())) {
    consola.success('JRE installed')
    return
  }

  if (force) {
    fse.removeSync(getDestinationDir())
  }

  try {
    const filePath = await downloadJre(downloadOptions)
    await decompress(filePath, getJreDecompressDir())
  } catch (err) {
    fse.removeSync(getDestinationDir())
    throw err
  }
}
