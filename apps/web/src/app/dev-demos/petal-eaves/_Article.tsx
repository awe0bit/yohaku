const PARAGRAPHS = [
  '三月末的傍晚，雨刚停，老街两侧的屋檐还在一滴一滴往下落水。巷口那棵樱树开到了第七天，风一过，花瓣就成片地往下走，像有人在高处慢慢翻一本很薄的书。',
  '我站在檐下等人。花瓣先落在对面的瓦上，停一会儿，再顺着瓦沟滑下来；有几片落在我脚边的石阶上，被雨水粘住，再也走不动了。',
  '小时候总以为花是一下子谢的。后来才知道，它们是一片一片离开的，每一片都有自己的时辰，有的在枝头多留一夜，有的刚开就被风带走。',
  '屋檐是很奇怪的东西。它替人挡雨，却也替花瓣留了一块停脚的地方。等风再起，它们又从檐角出发，落到更低的地方去。',
  '那天等的人终究没来。我把伞收好，沿着檐下往回走，一路踩着湿的花，鞋底沾满了淡粉色，像是把整条街的春天都带回了家。',
]

const Figure = ({ caption }: { caption: string }) => (
  <figure className="my-10">
    <div
      className="aspect-[16/9] w-full rounded-[2px] border-t-2 border-neutral-6 bg-neutral-2"
      data-eave
    />
    <figcaption className="mt-2 text-center text-xs text-neutral-6">
      {caption}
    </figcaption>
  </figure>
)

const Section = ({ index, title }: { index: number; title: string }) => (
  <>
    <h2
      className="mb-4 mt-14 inline-block border-t border-neutral-6 pt-2 text-xl text-neutral-9"
      data-eave
    >
      {title}
    </h2>
    {PARAGRAPHS.map((_, i) => PARAGRAPHS[(i + index) % PARAGRAPHS.length]).map(
      (text) => (
        <p className="my-5" key={text}>
          {text}
        </p>
      ),
    )}
  </>
)

export const Article = () => (
  <div className="mx-auto max-w-2xl px-2 pb-[40vh] pt-16 font-serif text-[17px] leading-[1.9] text-neutral-8">
    <h1 className="mb-2 text-3xl text-neutral-9">檐下</h1>
    <p className="mb-12 text-sm text-neutral-6">
      html-in-canvas spike · 以块为檐：落樱 / 夕立 / 红叶 /
      檐雪，滚动后仍停在原檐上
    </p>
    <p>{PARAGRAPHS[0]}</p>
    <Figure caption="巷口 · 第七天" />
    <Section index={1} title="瓦沟" />
    <blockquote
      className="my-10 border-t border-neutral-5 bg-neutral-1 px-6 py-5 text-neutral-7"
      data-eave
    >
      它们是一片一片离开的，每一片都有自己的时辰。
    </blockquote>
    <Section index={2} title="檐角" />
    <Figure caption="石阶" />
    <Section index={3} title="归途" />
  </div>
)
