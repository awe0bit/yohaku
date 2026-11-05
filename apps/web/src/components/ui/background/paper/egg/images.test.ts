import { describe, expect, it, vi } from 'vitest'

import { clipOf, ghostImages, isUndrawableImage, upgradeToCors } from './images'

const page = 'https://innei.in'
const img = (src: string, crossOrigin: string | null = null) => ({
  currentSrc: src,
  crossOrigin,
})

describe('isUndrawableImage', () => {
  it('flags cross-origin images loaded without CORS', () => {
    expect(isUndrawableImage(img('https://cdn.example.com/a.jpg'), page)).toBe(
      true,
    )
  })

  it('trusts same-origin, inline and CORS-enabled images', () => {
    expect(isUndrawableImage(img('https://innei.in/a.jpg'), page)).toBe(false)
    expect(isUndrawableImage(img('data:image/png;base64,AAAA'), page)).toBe(
      false,
    )
    expect(isUndrawableImage(img('blob:https://innei.in/1'), page)).toBe(false)
    expect(
      isUndrawableImage(
        img('https://cdn.example.com/a.jpg', 'anonymous'),
        page,
      ),
    ).toBe(false)
  })

  it('ignores images that have not resolved a source', () => {
    expect(isUndrawableImage(img(''), page)).toBe(false)
  })
})

describe('ghostImages', () => {
  it('places each ghost where the image sat before the page moved', () => {
    const ghost = {
      style: {} as Record<string, string>,
      removeAttribute: vi.fn(),
      remove: vi.fn(),
    }
    const img = { cloneNode: () => ghost }
    const layer = { prepend: vi.fn() }
    const ghosts = ghostImages(layer as never, [
      {
        img: img as never,
        rect: { left: 120, top: 340, width: 600, height: 338 },
        objectFit: 'cover',
        objectPosition: '50% 50%',
        clip: 'border-radius:4px;',
      },
    ])
    expect(ghosts.count).toBe(1)
    expect(layer.prepend).toHaveBeenCalledWith(ghost)
    expect(ghost.style.cssText).toContain(
      'left:120px;top:340px;width:600px;height:338px;',
    )
    expect(ghost.style.cssText).toContain('object-fit:cover;')
    expect(ghost.style.cssText).toContain('border-radius:4px;')
    ghosts.remove()
    expect(ghost.remove).toHaveBeenCalled()
  })
})

describe('clipOf', () => {
  const plain = {
    borderRadius: '0px',
    overflow: 'visible',
    clipPath: 'none',
    maskImage: 'none',
    maskSize: 'auto',
    maskPosition: '0% 0%',
    maskRepeat: 'repeat',
  }
  const box = { width: 30, height: 30 }

  it('borrows the mask of a same-size wrapper that shapes the image', () => {
    const squircle = 'url("data:image/svg+xml,squircle")'
    const clip = clipOf([
      { rect: box, style: { ...plain, overflow: 'clip' } },
      {
        rect: box,
        style: {
          ...plain,
          overflow: 'hidden',
          maskImage: squircle,
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
        },
      },
    ])
    expect(clip).toBe(
      `mask-image:${squircle};mask-size:contain;mask-position:center;mask-repeat:no-repeat;`,
    )
  })

  it('takes a rounded clipping wrapper when the image has no radius', () => {
    expect(
      clipOf([
        { rect: box, style: plain },
        {
          rect: box,
          style: { ...plain, overflow: 'hidden', borderRadius: '50%' },
        },
      ]),
    ).toBe('border-radius:50%;')
  })

  it('ignores wrappers larger than the image', () => {
    expect(
      clipOf([
        { rect: box, style: plain },
        {
          rect: { width: 300, height: 200 },
          style: { ...plain, overflow: 'hidden', borderRadius: '12px' },
        },
      ]),
    ).toBe('')
  })

  it('keeps the radius drawn on the image itself', () => {
    expect(
      clipOf([{ rect: box, style: { ...plain, borderRadius: '8px' } }]),
    ).toBe('border-radius:8px;')
  })
})

describe('upgradeToCors', () => {
  const page = 'https://innei.in'
  const img = (src: string) => ({
    currentSrc: src,
    crossOrigin: null as string | null,
    decode: vi.fn(async () => {}),
  })

  it('switches images whose host allows CORS so they can be drawn', async () => {
    const ok = img('https://object.innei.in/a.jpg')
    const blocked = img('https://friend.example.com/b.jpg')
    const probe = vi.fn(async (url: string) => url.includes('object.innei.in'))
    await upgradeToCors([ok, blocked] as never, page, probe)
    expect(ok.crossOrigin).toBe('anonymous')
    expect(ok.decode).toHaveBeenCalled()
    expect(isUndrawableImage(ok, page)).toBe(false)
    expect(blocked.crossOrigin).toBeNull()
    expect(isUndrawableImage(blocked, page)).toBe(true)
  })

  it('leaves drawable images alone', async () => {
    const same = img('https://innei.in/a.jpg')
    const probe = vi.fn(async () => true)
    await upgradeToCors([same] as never, page, probe)
    expect(probe).not.toHaveBeenCalled()
    expect(same.crossOrigin).toBeNull()
  })

  it('keeps going when the re-decoded image fails', async () => {
    const flaky = img('https://object.innei.in/a.jpg')
    flaky.decode.mockRejectedValueOnce(new Error('EncodingError'))
    await expect(
      upgradeToCors([flaky] as never, page, async () => true),
    ).resolves.toBeUndefined()
    expect(flaky.crossOrigin).toBe('anonymous')
  })
})
