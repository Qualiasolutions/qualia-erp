import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/contact', label: 'Contact' },
]

export default function Navigation() {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
      <nav className="container flex h-16 items-center justify-between">
        <Link to="/" className="text-xl font-bold">
          Logo
        </Link>

        {/* Desktop Nav */}
        <ul className="hidden gap-8 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                to={link.href}
                className={`text-sm font-medium transition-colors hover:text-brand ${
                  location.pathname === link.href
                    ? 'text-brand'
                    : 'text-gray-600'
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="border-t bg-white md:hidden">
          <ul className="container py-4">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`block py-2 text-sm font-medium ${
                    location.pathname === link.href
                      ? 'text-brand'
                      : 'text-gray-600'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  )
}
