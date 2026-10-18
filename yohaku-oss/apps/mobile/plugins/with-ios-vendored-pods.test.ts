import { describe, expect, it } from 'vitest'

import { patchPodfile, vendoredPods } from './with-ios-vendored-pods.cjs'

const bare = `target 'Yohaku' do
  use_react_native!(
    :path => config[:reactNativePath],
  )

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
    )
  end
end
`

const count = (src: string, needle: string) => src.split(needle).length - 1

const pods = vendoredPods()

describe('vendoredPods', () => {
  it('lists every vendored podspec with a Podfile-relative path', () => {
    const byName = Object.fromEntries(pods)
    expect(byName.SwiftMath).toBe(
      '../modules/yohaku/ios/Vendor/SwiftMath.podspec',
    )
    expect(byName.TreeSitter).toBe(
      '../modules/yohaku/ios/Vendor/TreeSitter/TreeSitter.podspec',
    )
    expect(byName.TreeSitterTSX).toBe(
      '../modules/yohaku/ios/Vendor/TreeSitter/TreeSitterTSX.podspec',
    )
    expect(byName.SwiftTreeSitterLayer).toBeDefined()
  })
})

describe('patchPodfile', () => {
  it('removes the replaced Mermaid pods without touching other pods', () => {
    const old = bare.replace(
      '  use_react_native!(',
      `  pod 'BeautifulMermaid', :podspec => 'old'\n  pod 'ElkSwift', :podspec => 'old'\n  pod 'SwiftMath', :podspec => 'math'\n  use_react_native!(`,
    )
    const next = patchPodfile(old, pods)
    expect(next).not.toContain("pod 'BeautifulMermaid'")
    expect(next).not.toContain("pod 'ElkSwift'")
    expect(next).toContain("pod 'SwiftMath', :podspec => 'math'")
    expect(patchPodfile(next, pods)).toBe(next)
  })

  it('adds every vendored pod after use_react_native!', () => {
    const src = patchPodfile(bare, pods)
    for (const [name, path] of pods) {
      expect(count(src, `pod '${name}', :podspec => '${path}'`)).toBe(1)
      expect(src.indexOf(`pod '${name}'`)).toBeGreaterThan(
        src.indexOf('use_react_native!'),
      )
    }
  })

  it('adds only the missing pods to a partially patched Podfile, once', () => {
    const withoutMath = patchPodfile(bare, pods).replace(
      /\n {2}pod 'SwiftMath'[^\n]*/,
      '',
    )
    expect(withoutMath).not.toContain("pod 'SwiftMath'")
    const once = patchPodfile(withoutMath, pods)
    expect(count(once, "pod 'SwiftMath'")).toBe(1)
    expect(count(once, "pod 'TreeSitter',")).toBe(1)
    expect(patchPodfile(once, pods)).toBe(once)
  })
})
