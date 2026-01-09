import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navigation from '@/components/Navigation/Navigation'
import Footer from '@/components/Footer/Footer'

// Lazy load pages for better performance
const Home = lazy(() => import('@/pages/Home'))
const About = lazy(() => import('@/pages/About'))
const Services = lazy(() => import('@/pages/Services'))
const Contact = lazy(() => import('@/pages/Contact'))

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="flex h-96 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

export default App
