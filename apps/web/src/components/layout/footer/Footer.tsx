import type { FooterConfig } from './config'
import { FooterBackgroundSwitcher } from './FooterBackgroundSwitcher'
import { FooterInfo } from './FooterInfo'
import { FooterThemeSwitcher } from './FooterThemeSwitcher'
import { LocaleSwitcher } from './LocaleSwitcher'

export const Footer = ({ footerConfig }: { footerConfig?: FooterConfig }) => (
  <footer data-hide-print className="relative z-[1] mt-32 pb-12 pt-9 md:pt-16">
    <div
      aria-hidden
      className="footer-wash pointer-events-none absolute inset-x-0 -top-24 bottom-0 -z-1"
    />
    <div className="px-4 sm:px-8">
      <div className="mx-auto min-w-0 max-w-7xl lg:px-8">
        <div className="relative py-[22px]">
          <div
            aria-hidden
            className="paper-hairline pointer-events-none absolute inset-y-0 -inset-x-5 hidden border md:block lg:-inset-x-[26px]"
          />
          <FooterInfo
            backgroundSwitcher={<FooterBackgroundSwitcher />}
            footerConfig={footerConfig}
            localeSwitcher={<LocaleSwitcher />}
            themeSwitcher={<FooterThemeSwitcher />}
          />
        </div>
      </div>
    </div>
  </footer>
)
