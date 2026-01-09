import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="text-xl font-bold">
              Logo
            </Link>
            <p className="mt-4 text-sm text-gray-600">
              Brief company description goes here.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">Pages</h4>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li><Link to="/" className="hover:text-brand">Home</Link></li>
              <li><Link to="/about" className="hover:text-brand">About</Link></li>
              <li><Link to="/services" className="hover:text-brand">Services</Link></li>
              <li><Link to="/contact" className="hover:text-brand">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">Contact</h4>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>hello@example.com</li>
              <li>+1 234 567 890</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">Follow Us</h4>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-brand">LinkedIn</a></li>
              <li><a href="#" className="hover:text-brand">Instagram</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t pt-8 text-center text-sm text-gray-600">
          &copy; {new Date().getFullYear()} Company Name. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
