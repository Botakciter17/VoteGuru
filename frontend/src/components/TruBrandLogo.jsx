import React from 'react';
import {
  Sparkles,
  Smile,
  Heart,
  Shield,
  Lightbulb,
  Trophy,
  Award,
  Star,
  BookOpen,
} from 'lucide-react';

/**
 * Brand Logo bergaya geometric merah tegas (#E11D23) di atas latar gelap (#141414)
 */
export function TruBrandLogo({ size = 'md', showText = true }) {
  const boxSizes = {
    sm: 'w-9 h-9 rounded-xl text-sm',
    md: 'w-10 h-10 rounded-xl text-base',
    lg: 'w-14 h-14 rounded-2xl text-xl',
  };

  return (
    <div className="inline-flex items-center gap-3 select-none">
      <div
        className={`${boxSizes[size] || boxSizes.md} flex items-center justify-center font-extrabold tracking-tight bg-[#E11D23] text-white`}
      >
        VG
      </div>
      {showText && (
        <div>
          <span className="font-extrabold tracking-tight text-base sm:text-lg leading-none block text-white">
            VOTING <span className="text-[#E11D23]">GURU</span>
          </span>
          <span className="text-[11px] font-medium mt-0.5 block text-[#9E9E9E]">
            Disiplin, Terampil, Prestasi
          </span>
        </div>
      )}
    </div>
  );
}

export function CategoryGlyph({ icon, className = 'w-5 h-5' }) {
  switch (icon) {
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'smile':
      return <Smile className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'lightbulb':
      return <Lightbulb className={className} />;
    case 'trophy':
      return <Trophy className={className} />;
    case 'star':
      return <Star className={className} />;
    case 'book':
      return <BookOpen className={className} />;
    default:
      return <Award className={className} />;
  }
}

/**
 * Kartu Statistik Glassmorphism tanpa gradasi
 */
export function BentoStatCard({ value, suffix = '', label, sublabel, highlight = false }) {
  return (
    <div
      className={`rounded-2xl p-5 flex flex-col justify-between ${
        highlight ? 'glass-card-selected' : 'glass-card'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`text-3xl sm:text-4xl font-extrabold tracking-tight leading-none ${
            highlight ? 'text-[#E11D23]' : 'text-white'
          }`}
        >
          {value}
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3]">
          {suffix}
        </span>
      </div>
      <div className="mt-3">
        <span className="text-sm font-bold block text-white">{label}</span>
        {sublabel && <p className="text-xs mt-1 text-[#A3A3A3]">{sublabel}</p>}
      </div>
    </div>
  );
}
