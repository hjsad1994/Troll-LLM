'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function NotFound() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center">
      {/* Animated background grid */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] animate-pulse-slow" />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_600px,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent transition-all duration-300 ease-out"
          style={{
            transform: `translate(${(mousePosition.x - window.innerWidth / 2) / 20}px, ${(mousePosition.y - window.innerHeight / 2) / 20}px)`,
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-indigo-400/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Glowing 404 */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 bg-indigo-500/20 rounded-full blur-[120px] animate-pulse-slow" />
          </div>

          <h1
            className="relative text-[12rem] md:text-[16rem] font-black leading-none bg-gradient-to-b from-white via-indigo-200 to-indigo-500/30 bg-clip-text text-transparent select-none"
            style={{
              textShadow: '0 0 80px rgba(99, 102, 241, 0.3)',
            }}
          >
            404
          </h1>

          {/* Glitch effect lines */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent animate-scan" />
          </div>
        </div>

        {/* Error message */}
        <div className="space-y-4 mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Page Not Found
          </h2>
          <p className="text-lg text-slate-500 max-w-md mx-auto leading-relaxed">
            The page you're looking for seems to have drifted into the void. Let's get you back on track.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="group relative px-8 py-4 rounded-xl bg-white text-black font-semibold text-lg hover:bg-slate-200 hover:shadow-lg hover:shadow-white/20 transition-all duration-300 overflow-hidden"
          >
            {/* Button glow effect */}
            <div className={`absolute inset-0 bg-white opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-xl`} />

            <span className="relative flex items-center gap-2">
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Go Home
            </span>
          </Link>

          <Link
            href="/docs"
            className="group px-8 py-4 rounded-xl border border-white/10 text-white font-semibold text-lg hover:bg-white/5 hover:border-white/20 transition-all duration-300"
          >
            <span className="flex items-center gap-2">
              View Docs
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </Link>
        </div>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 0.3;
          }
          50% {
            transform: translateY(-100px) translateX(50px);
            opacity: 0.5;
          }
          90% {
            opacity: 0.3;
          }
        }

        @keyframes scan {
          0% {
            transform: translateY(-200px);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(200px);
            opacity: 0;
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }

        .animate-float {
          animation: float linear infinite;
        }

        .animate-scan {
          animation: scan 8s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
