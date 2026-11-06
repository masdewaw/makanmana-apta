import type { Plugin } from 'vite'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { createHash } from 'node:crypto'

/** Precache only the emitted app and public assets, never backend responses. */
export function pwaBuild(): Plugin {
  return {
    name: 'makanmana-pwa', apply: 'build', enforce: 'post',
    writeBundle(options) {
      const output = resolve(options.dir || 'dist')
      const files = readdirSync(output, { recursive: true, withFileTypes: true })
        .filter(file => file.isFile())
        .map(file => relative(output, resolve(file.parentPath, file.name)).replaceAll('\\', '/'))
        .filter(file => file === 'index.html' || file === 'manifest.webmanifest' || file === 'favicon.svg' || /^(assets|brand|icons)\//.test(file))
        .filter(file => !file.endsWith('.map')).sort()
      const template = readFileSync(resolve('scripts/sw-template.js'), 'utf8')
      const hash = createHash('sha256').update(template)
      for (const file of files) hash.update(file).update(readFileSync(resolve(output, file)))
      const source = template.replace('__BUILD_VERSION__', hash.digest('hex').slice(0, 16))
        .replace('__PRECACHE_URLS__', JSON.stringify(files.map(file => `/${file}`)))
      writeFileSync(resolve(output, 'sw.js'), source)
    },
  }
}
