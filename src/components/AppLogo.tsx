import { useEffect, useState } from 'react'

import darkLogo from '../../images/HimsogAI_Logo_DarkMode.png'
import lightLogo from '../../images/HimsogAI_Logo_LightMode.png'

function isDarkMode() {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

export function AppLogo(props: {
  className?: string
  alt?: string
  decorative?: boolean
}) {
  const [dark, setDark] = useState(() => isDarkMode())

  useEffect(() => {
    if (typeof document === 'undefined') return

    const root = document.documentElement

    function onChange() {
      setDark(isDarkMode())
    }

    const observer = new MutationObserver(() => onChange())
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    return () => {
      observer.disconnect()
    }
  }, [])

  const decorative = props.decorative ?? false

  return (
    <img
      src={dark ? darkLogo : lightLogo}
      className={props.className}
      alt={decorative ? '' : (props.alt ?? 'HimsogAI logo')}
      aria-hidden={decorative ? true : undefined}
      decoding="async"
    />
  )
}
