'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Fragment, useEffect, useState } from 'react'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import LocalMallOutlinedIcon from '@mui/icons-material/LocalMallOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined'
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import ExpandLessOutlinedIcon from '@mui/icons-material/ExpandLessOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'

export type AppRole = 'admin' | 'owner' | 'pegawai' | 'pembeli'
type MenuIconKey =
  | 'dashboard'
  | 'user'
  | 'product'
  | 'order'
  | 'transaction'
  | 'report'
  | 'home'
  | 'shop'
  | 'cart'
  | 'my-order'
  | 'profile'
  | 'status'

type MenuChild = {
  label: string
  href: string
}

type MenuItem = {
  label: string
  href?: string
  icon: MenuIconKey
  children?: MenuChild[]
}

type MySidebarProps = {
  role: AppRole
  userInitial?: string
  onLogout?: () => void
}

const menuByRole: Record<AppRole, MenuItem[]> = {
  admin: [
    { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { label: 'Daftar User', href: '/admin/users', icon: 'user' },
    { label: 'Daftar hewan', href: '/admin/kambing', icon: 'product' },
    { label: 'Daftar Pesanan', href: '/admin/pesanan', icon: 'order' },
    { label: 'Laporan', href: '/admin/laporan', icon: 'report' }
  ],
  owner: [
    { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    // { label: 'Daftar Produk ', href: '/owner/produk', icon: 'product' },
    // { label: 'Daftar Pesanan', href: '/owner/pesanan', icon: 'order' },
    { label: 'Laporan', href: '/owner/laporan', icon: 'report' }
  ],
  pegawai: [
    { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { label: 'Update Status Pesanan', href: '/pegawai/pesanan', icon: 'order' },
    { label: 'Riwayat Pesanan', href: '/pegawai/update-status', icon: 'status' }
  ],
  pembeli: [
    { label: 'Home', href: '/dashboard', icon: 'home' },
    { label: 'Daftar Hewan', href: '/produk', icon: 'shop' },
    // { label: 'Keranjang', href: '/keranjang', icon: 'cart' },
    { label: 'Pesanan Saya', href: '/pesanan-saya', icon: 'my-order' },
    // { label: 'Profil', href: '/profil', icon: 'profile' }
  ]
}

function isLinkActive(pathname: string, href?: string) {
  if (!href) return false
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function menuIcon(icon: MenuIconKey) {
  const baseClass = 'text-[22px]'
  switch (icon) {
    case 'dashboard':
      return <HomeOutlinedIcon className={baseClass} />
    case 'user':
      return <GroupOutlinedIcon className={baseClass} />
    case 'product':
      return <Inventory2OutlinedIcon className={baseClass} />
    case 'order':
      return <ReceiptLongOutlinedIcon className={baseClass} />
    case 'transaction':
      return <AccountBalanceWalletOutlinedIcon className={baseClass} />
    case 'report':
      return <AssessmentOutlinedIcon className={baseClass} />
    case 'home':
      return <HomeOutlinedIcon className={baseClass} />
    case 'shop':
      return <StorefrontOutlinedIcon className={baseClass} />
    case 'cart':
      return <ShoppingCartOutlinedIcon className={baseClass} />
    case 'my-order':
      return <LocalMallOutlinedIcon className={baseClass} />
    case 'profile':
      return <PersonOutlinedIcon className={baseClass} />
    case 'status':
      return <TaskAltOutlinedIcon className={baseClass} />
    default:
      return <HomeOutlinedIcon className={baseClass} />
  }
}

export default function MySidebar({ role, onLogout }: MySidebarProps) {
  const pathname = usePathname()
  const [isDesktopPinnedOpen, setIsDesktopPinnedOpen] = useState(true)
  const [isHovering, setIsHovering] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Manajemen Transaksi': true
  })

  const menuItems = menuByRole[role] || []
  const isExpanded = isMobile ? isMobileOpen : isDesktopPinnedOpen || isHovering

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)')

    function syncMode() {
      const nextMobile = media.matches
      setIsMobile(nextMobile)
      if (nextMobile) {
        setIsDesktopPinnedOpen(false)
        setIsHovering(false)
      } else {
        setIsMobileOpen(false)
      }
    }

    syncMode()
    media.addEventListener('change', syncMode)
    return () => media.removeEventListener('change', syncMode)
  }, [])

  function closeMobileSidebar() {
    if (isMobile) {
      setIsMobileOpen(false)
    }
  }

  function handleSidebarToggle() {
    if (isMobile) {
      setIsMobileOpen((prev) => !prev)
      return
    }
    setIsDesktopPinnedOpen((prev) => !prev)
  }

  return (
    <Fragment>
      <button
        type="button"
        onClick={handleSidebarToggle}
        className="fixed left-4 top-4 z-40 grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-700 shadow-md lg:hidden"
        aria-label="Buka menu"
      >
        <MenuRoundedIcon className="text-[20px]" />
      </button>

      {isMobile && isMobileOpen ? (
        <button
          type="button"
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-30 bg-slate-900/35 lg:hidden"
          aria-label="Tutup menu"
        />
      ) : null}

      <aside
        onMouseEnter={() => {
          if (!isMobile) setIsHovering(true)
        }}
        onMouseLeave={() => {
          if (!isMobile) setIsHovering(false)
        }}
        className={`fixed left-0 top-0 z-40 flex h-[100dvh] shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-[#f7f7f9] p-3 transition-all duration-300 lg:sticky lg:top-0 lg:z-10 ${
          isExpanded ? 'w-[280px]' : 'w-[84px]'
        } ${isMobile ? (isMobileOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}`}
      >
        <div className="mb-4 flex items-center justify-between px-1 py-1">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-slate-300/70">
              <Image src="/icon.png" alt="Hasan Farm" fill className="object-cover" sizes="36px" priority />
            </div>
            {isExpanded ? (
              <div className="min-w-0">
                <p className="truncate text-[24px] font-bold leading-none text-slate-800">Hasan Farm </p>
                {/* <p className="mt-0.5 truncate text-[11px] text-slate-500">Role: {roleLabel}</p> */}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleSidebarToggle}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-200"
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isExpanded ? <ChevronLeftOutlinedIcon className="text-[20px]" /> : <ChevronRightOutlinedIcon className="text-[20px]" />}
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {menuItems.map((item) => {
            const hasChildren = Boolean(item.children?.length)
            const isOpen = openGroups[item.label]
            const activeParent = isLinkActive(pathname, item.href)
            const hasActiveChild = item.children?.some((child) => isLinkActive(pathname, child.href)) || false
            const isParentActive = activeParent || hasActiveChild

            if (!hasChildren) {
              return (
                <Link
                  key={item.label}
                  href={item.href || '/'}
                  title={!isExpanded ? item.label : undefined}
                  onClick={closeMobileSidebar}
                  className={`flex items-center rounded-xl py-2.5 transition ${
                    isExpanded ? 'gap-2.5 px-3' : 'justify-center px-2'
                  } ${
                    isParentActive
                      ? 'bg-[#e8e8ee] text-slate-900 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]'
                      : 'text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  {menuIcon(item.icon)}
                  {isExpanded ? <span className="text-[15px] font-medium leading-none">{item.label}</span> : null}
                </Link>
              )
            }

            return (
              <div key={item.label} className="space-y-1">
                <button
                  type="button"
                  title={!isExpanded ? item.label : undefined}
                  onClick={() => setOpenGroups((prev) => ({ ...prev, [item.label]: !prev[item.label] }))}
                  className={`flex w-full items-center rounded-xl py-2.5 text-left transition ${
                    isExpanded ? 'justify-between px-3' : 'justify-center px-2'
                  } ${
                    isParentActive ? 'bg-[#e8e8ee] text-slate-900' : 'text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  <span className={`flex items-center ${isExpanded ? 'gap-3' : ''}`}>
                    {menuIcon(item.icon)}
                    {isExpanded ? <span className="text-[15px] font-medium leading-none">{item.label}</span> : null}
                  </span>
                  {isExpanded ? (
                    isOpen ? (
                      <ExpandLessOutlinedIcon className="text-[18px] text-slate-500" />
                    ) : (
                      <ExpandMoreOutlinedIcon className="text-[18px] text-slate-500" />
                    )
                  ) : null}
                </button>

                {isExpanded && isOpen ? (
                  <ul className="ml-8 space-y-1 py-1">
                    {item.children?.map((child) => {
                      const childActive = isLinkActive(pathname, child.href)
                      return (
                        <li key={child.label}>
                          <Link
                            href={child.href}
                            onClick={closeMobileSidebar}
                            className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition ${
                              childActive ? 'bg-white font-semibold text-slate-900' : 'text-slate-600 hover:bg-white/70'
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            <span className="text-[14px] leading-none">{child.label}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                ) : null}
              </div>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={onLogout}
          title={!isExpanded ? 'Keluar Akun' : undefined}
          className={`mt-3 flex items-center rounded-xl bg-red-500 py-2.5 text-base font-semibold text-white transition hover:bg-red-600 ${
            isExpanded ? 'justify-center gap-2 px-3' : 'justify-center px-2'
          }`}
        >
          <LogoutOutlinedIcon className="text-[20px]" />
          {isExpanded ? <span className="text-[15px] leading-none">Keluar Akun</span> : null}
        </button>
      </aside>
    </Fragment>
  )
}
