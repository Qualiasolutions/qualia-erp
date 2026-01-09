import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section className="container py-20 md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl"
      >
        <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
          Your Headline Here
        </h1>
        <p className="mt-6 text-xl text-gray-600">
          Your subheadline or description goes here. Make it compelling and
          clear about what value you provide.
        </p>
        <div className="mt-10 flex gap-4">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 font-medium text-white transition-colors hover:bg-brand-600"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/services"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-3 font-medium transition-colors hover:bg-gray-50"
          >
            Learn More
          </Link>
        </div>
      </motion.div>
    </section>
  )
}
