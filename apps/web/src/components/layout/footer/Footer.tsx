import type { FooterConfig } from './config'
import { FooterBackgroundSwitcher } from './FooterBackgroundSwitcher'
import { FooterBgmSwitcher } from './FooterBgmSwitcher'
import { FooterInfo } from './FooterInfo'
import { FooterThemeSwitcher } from './FooterThemeSwitcher'
import { LocaleSwitcher } from './LocaleSwitcher'

export const Footer = ({ footerConfig }: { footerConfig?: FooterConfig }) => (
  <footer data-hide-print className="relative z-[1] mt-32 pb-10 pt-6 md:pt-10">
    <div className="px-4 sm:px-8">
      <div className="mx-auto min-w-0 max-w-7xl lg:px-8">
        <FooterInfo
          backgroundSwitcher={<FooterBackgroundSwitcher />}
          bgmSwitcher={<FooterBgmSwitcher />}
          footerConfig={footerConfig}
          localeSwitcher={<LocaleSwitcher />}
          themeSwitcher={<FooterThemeSwitcher />}
        />
      </div>
    </div>
  </footer>
)
