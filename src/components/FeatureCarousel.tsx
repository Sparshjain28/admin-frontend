import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, FileText, BarChart3, Shield, Zap, Users, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

const FEATURES = [
  {
    icon: <FileText size={28} />,
    title: 'Loan Management',
    description: 'Track applications from submission to disbursement with real-time status updates.',
    gradient: 'from-blue-600 to-cyan-500',
    link: '/loans',
    cta: 'View Loans',
  },
  {
    icon: <BarChart3 size={28} />,
    title: 'Reports & Analytics',
    description: 'Get detailed insights on loan volume, bank distribution, and performance metrics.',
    gradient: 'from-purple-600 to-pink-500',
    link: '/reports',
    cta: 'View Reports',
  },
  {
    icon: <Users size={28} />,
    title: 'Broker Network',
    description: 'Manage your broker partnerships, track commissions, and monitor referrals.',
    gradient: 'from-emerald-600 to-teal-500',
    link: '/brokers',
    cta: 'Manage Brokers',
  },
  {
    icon: <Shield size={28} />,
    title: 'Secure & Reliable',
    description: 'Bank-grade security with role-based access and encrypted data.',
    gradient: 'from-amber-500 to-orange-500',
    link: '/settings',
    cta: 'Settings',
  },
  {
    icon: <Zap size={28} />,
    title: 'Quick Disbursement',
    description: 'Streamlined workflow for faster loan processing and approval turnaround.',
    gradient: 'from-rose-500 to-red-500',
    link: '/loans/new',
    cta: 'New Application',
  },
];

export default function FeatureCarousel() {
  const [current, setCurrent] = useState(0);
  const total = FEATURES.length;

  const next = useCallback(() => setCurrent(i => (i + 1) % total), [total]);
  const prev = useCallback(() => setCurrent(i => (i - 1 + total) % total), [total]);

  useEffect(() => {
    const timer = setInterval(next, 4500);
    return () => clearInterval(timer);
  }, [next]);

  const feature = FEATURES[current];

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl">
      {/* Gradient Background */}
      <div className={`bg-gradient-to-br ${feature.gradient} p-5 sm:p-6 transition-all duration-500 min-h-[140px] sm:min-h-[160px] flex flex-col justify-between`}>
        {/* Content */}
        <div className="flex items-start gap-4 text-white">
          <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm shrink-0">
            {feature.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold mb-1">{feature.title}</h3>
            <p className="text-sm text-white/80 line-clamp-2">{feature.description}</p>
          </div>
        </div>

        {/* Bottom row: CTA + dots + arrows */}
        <div className="flex items-center justify-between mt-4">
          <Link
            to={feature.link}
            className="text-xs sm:text-sm font-semibold text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-1.5 rounded-full transition-colors"
          >
            {feature.cta} →
          </Link>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {FEATURES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === current ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40'
                }`}
              />
            ))}
          </div>

          {/* Arrows - desktop only */}
          <div className="hidden sm:flex items-center gap-1">
            <button onClick={prev} className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={next} className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
