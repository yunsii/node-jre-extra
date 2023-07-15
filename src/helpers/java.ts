import os from 'node:os'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import axios, { AxiosError } from 'axios'
import { $ } from 'execa'
import fse from 'fs-extra'
import decompress from 'decompress'
import consola from 'consola'
import { DownloaderHelper } from 'node-downloader-helper'
import { globbySync } from 'globby'
import envPaths from 'env-paths'
import ora from 'ora'

// ref: https://sebhastian.com/dirname-is-not-defined-javascript/
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const paths = envPaths('.jre-extra')

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

export function prepare() {
  fse.ensureDirSync(paths.data)
  fse.ensureDirSync(paths.cache)
}

export interface GetJreUrlOptions {
  /**
   * 由于众所周知的原因，支持重新标准化 GitHub 下载地址
   */
  normalizeGithubUrl?: (url: URL) => URL
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
export async function getJreUrl(options: GetJreUrlOptions = {}) {
  const arch = checkArch()
  const platform = checkPlatform()

  const {
    version = Number(process.env.JRE_EXTRA_VERSION) || 8,
    heapSize = process.env.JRE_EXTRA_HEAP_SIZE || 'normal',
    imageType = process.env.JRE_EXTRA_IMAGE_TYPE || 'jre',
    normalizeGithubUrl,
  } = options

  const id = [version, heapSize, imageType].join('_')

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

  const rawUrl = urlSegments.join('')

  if (normalizeGithubUrl) {
    try {
      await axios.get(rawUrl, { maxRedirects: 0 })
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 307) {
        const githubAssetLocation = err.response.headers.location
        const originUrl = new URL(githubAssetLocation)
        const mirrorUrl = normalizeGithubUrl(originUrl)
        return {
          id,
          url: `${mirrorUrl.origin}${mirrorUrl.pathname}${mirrorUrl.search}`,
        }
      } else {
        throw err
      }
    }
  }

  return { id, url: rawUrl }
}

export function getManifestJsonPath() {
  const manifestJsonPath = path.join(paths.data, 'manifest.json')
  return manifestJsonPath
}

export function getManifestJson(): Partial<
  Record<
    string,
    {
      decompressed: string
      downloaded: string
    }
  >
> {
  if (!fse.existsSync(getManifestJsonPath())) {
    return {}
  }

  return fse.readJsonSync(getManifestJsonPath(), {
    encoding: 'utf-8',
  })
}

export interface DownloadJreOptions {
  id: string
  url: string
}

export function downloadJre(options: DownloadJreOptions) {
  const { id, url } = options

  if (isJreDownloaded(id)) {
    consola.log(`JRE download by cached`)
    return getManifestJson()[id]!.downloaded
  }

  consola.log(`JRE download url: ${url}`)
  prepare()

  const spinner = ora(`Downloading`).start()
  return new Promise<string>((resolve, reject) => {
    const dl = new DownloaderHelper(url, paths.cache, {
      httpsRequestOptions: {
        rejectUnauthorized: false,
      },
    })
    dl.on('end', (event) => {
      spinner.succeed()
      consola.success(`Download completed, saved to: ${event.filePath}`)
      resolve(event.filePath)
    })
    dl.on('error', (err) => {
      spinner.fail()
      spinner.stopAndPersist()
      reject(err)
    })
    dl.on('progress.throttled', (stats) => {
      spinner.text = `Downloading ${stats.progress.toFixed(2)}%`
    })
    dl.start().catch((err) => {
      reject(err)
    })
  })
}

export interface GetJreJavaBinOptions extends GetJreUrlOptions {}

/** 获取 node-jre-extra 可用的 java 可执行文件 */
export async function getJreJavaBin(options: GetJreJavaBinOptions = {}) {
  const { id } = await getJreUrl(options)
  const manifest = getManifestJson()

  if (!isJreReady(id)) {
    throw new Error(
      'Decompressed can not found, you should install it firstly?',
    )
  }

  const manifestDecompressDir = manifest[id]!.decompressed

  const target = globbySync(manifestDecompressDir).find((item) => {
    return (
      fse.lstatSync(path.join(item)).isFile() &&
      path.parse(item).name === 'java'
    )
  })

  if (!target) {
    throw new Error(
      'Java executable file can not found, maybe jre decompress cracked?',
    )
  }

  return target
}

export interface GetJavaBinOptions {
  jreOptions?: GetJreUrlOptions
  /**
   * 是否本地优先模式，默认 true
   *
   * 当用户本地环境已安装 Java 时，使用本地 JRE 环境，此时指定 JRE 版本无效
   */
  useLocal?: boolean
}

/** 优先判断用户环境是否已经 Java 运行环境 */
export async function getJavaBin(options: GetJavaBinOptions = {}) {
  const { jreOptions, useLocal = true } = options

  if (useLocal && (await isJavaInstalled())) {
    return 'java'
  }

  return await getJreJavaBin(jreOptions)
}

/** 根据 `java -version` 判断用户环境是否已安装 Java 运行环境 */
export async function isJavaInstalled() {
  try {
    const result = await $`java -version`
    return result.exitCode === 0
  } catch (err) {
    return false
  }
}

/** 根据 id 判断 jre-extra 是否能提供匹配的 JRE */
export function isJreReady(id: string) {
  const manifest = getManifestJson()
  const manifestDecompressDir = manifest[id]

  if (!manifestDecompressDir?.decompressed) {
    return false
  }

  return fse.existsSync(manifestDecompressDir.decompressed)
}

/** 根据 id 判断 jre-extra 是否已下载过匹配的 JRE */
export function isJreDownloaded(id: string) {
  const manifest = getManifestJson()
  const manifestDecompressDir = manifest[id]

  if (!manifestDecompressDir?.downloaded) {
    return false
  }

  return fse.existsSync(manifestDecompressDir.downloaded)
}

export interface InstallJreOptions {
  jreOptions?: GetJreUrlOptions
  /** 已安装过 JRE 是否会尝试重新安装，默认 false */
  force?: boolean
}

/**
 * 安装 JRE
 *
 * 优先根据 ID 判断是否已安装 JRE。
 */
export async function installJre(options: InstallJreOptions = {}) {
  const { force = false, jreOptions } = options

  prepare()

  const { id, url } = await getJreUrl(jreOptions)
  const manifest = getManifestJson()

  if (!force && isJreReady(id)) {
    consola.log(`JRE [${id}] is ready by cached`)
    return
  }

  const filePath = await downloadJre({ id, url })
  const fileName = path.basename(filePath)
  const decompressDirName = fileName.split('.')[0]
  const decompressDir = path.join(paths.data, decompressDirName)
  fse.emptyDirSync(decompressDir)
  await decompress(filePath, decompressDir)
  fse.writeJSONSync(
    getManifestJsonPath(),
    {
      ...manifest,
      [id]: { decompressed: decompressDir, downloaded: filePath },
    },
    {
      encoding: 'utf-8',
    },
  )
  consola.success(`Install [${id}] to ${decompressDirName}`)
}

export function list() {
  const manifest = getManifestJson()
  return Object.keys(manifest)
}
