import React from "react";

export default function LoadingSpinner({ text = "MEMUAT SISTEM SMARTCLASS..." }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "radial-gradient(ellipse at center, #0f0e1a 0%, #080710 100%)",
      gap: "32px", zIndex: 9999,
    }}>
      {/* Outer ambient glow */}
      <div style={{
        position: "absolute", width: "280px", height: "280px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(138,99,255,0.12) 0%, transparent 70%)",
        animation: "pulse 3s ease-in-out infinite",
      }} />

      {/* Multi-ring SVG loader */}
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8a63ff" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="g2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#b48fff" />
          </linearGradient>
          <linearGradient id="g3" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6e3fff" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>

        {/* Outer ring - fast CW */}
        <circle cx="60" cy="60" r="52"
          stroke="url(#g1)" strokeWidth="3"
          strokeLinecap="round" strokeDasharray="240 90" fill="none"
          style={{ transformOrigin: "60px 60px", animation: "spin 1.6s linear infinite" }}
        />

        {/* Middle ring - slow CCW */}
        <circle cx="60" cy="60" r="38"
          stroke="url(#g2)" strokeWidth="2.5"
          strokeLinecap="round" strokeDasharray="130 60" fill="none"
          style={{ transformOrigin: "60px 60px", animation: "spinReverse 2.4s linear infinite" }}
        />

        {/* Inner ring - medium CW */}
        <circle cx="60" cy="60" r="24"
          stroke="url(#g3)" strokeWidth="2"
          strokeLinecap="round" strokeDasharray="60 40" fill="none"
          style={{ transformOrigin: "60px 60px", animation: "spin 1s linear infinite" }}
        />

        {/* Pulsing core */}
        <circle cx="60" cy="60" r="10" fill="url(#g1)"
          style={{ transformOrigin: "60px 60px", animation: "pulse 1.8s ease-in-out infinite" }}
        />

        {/* Orbiting dot outer */}
        <circle cx="60" cy="8" r="5" fill="#22d3ee"
          style={{ transformOrigin: "60px 60px", animation: "spin 1.6s linear infinite" }}
        />

        {/* Orbiting dot inner */}
        <circle cx="60" cy="22" r="3.5" fill="#8a63ff" opacity="0.85"
          style={{ transformOrigin: "60px 60px", animation: "spinReverse 2.4s linear infinite" }}
        />
      </svg>

      {/* Wave bar animation
      <div style={{ display: "flex", gap: "5px", alignItems: "center", height: "28px" }}>
        {[0, 0.15, 0.3, 0.45, 0.6, 0.45, 0.3, 0.15, 0].map((delay, i) => (
          <div key={i} style={{
            width: "4px", height: "100%",
            background: "linear-gradient(to top, #8a63ff, #22d3ee)",
            borderRadius: "999px",
            animation: `wave 1.2s ease-in-out ${delay}s infinite`,
          }} />
        ))}
      </div> */}

      {/* Animated text */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
        <div style={{ display: "flex", gap: "2px" }}>
          {text.split("").map((ch, i) => (
            <span key={i} style={{
              fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em",
              color: ch === " " ? "transparent" : "var(--text-secondary)",
              display: "inline-block",
              animation: `textReveal 0.5s ease ${i * 0.03}s both, pulse 2s ease-in-out ${i * 0.08}s infinite`,
            }}>
              {ch === " " ? "\u00a0\u00a0" : ch}
            </span>
          ))}
        </div>
        <div style={{
          width: "140px", height: "2px",
          background: "linear-gradient(90deg, transparent, #8a63ff, #22d3ee, transparent)",
          borderRadius: "999px",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s linear infinite",
        }} />
      </div>
    </div>
  );
}
