import { LayoutDrawerPortal } from './LayoutDrawerPortal'

export const Content: Component = ({ children }) => (
  <main className="fill-content relative z-[1] flex lg:pointer-events-none lg:pt-[4.5rem] lg:[&>*]:pointer-events-auto">
    <div className="min-w-0 flex-1 px-4 md:px-0">{children}</div>
    <LayoutDrawerPortal />
  </main>
)
