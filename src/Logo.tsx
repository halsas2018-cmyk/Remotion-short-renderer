import React from "react";
import { useCurrentFrame } from "remotion";

export const Logo: React.FC<{
  size?: number;
}> = ({ size = 1 }) => {
  const frame = useCurrentFrame();

  // Slow continuous rotation around the S letter
  const rotationY = frame * 0.03;
  const rotationX = Math.sin(frame * 0.04) * 0.15;

  // Gentle floating up/down
  const floatY = Math.sin(frame * 0.06) * 0.05;

  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <div
        style={{
          width: 120 * size,
          height: 120 * size,
          perspective: 800,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            transformStyle: "preserve-3d",
            transform: `translateY(${floatY * 20}px) rotateX(${rotationX}rad) rotateY(${rotationY}rad)`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <svg
            viewBox="0 0 100 100"
            width="100%"
            height="100%"
            style={{
              filter: "drop-shadow(0 4px 12px rgba(249, 115, 22, 0.5))",
            }}
          >
            <defs>
              <linearGradient
                id="sGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
              <filter id="sShadow">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                <feOffset dx="0" dy="2" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.5" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <text
              x="50"
              y="50"
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="72"
              fontWeight="900"
              fill="url(#sGradient)"
              filter="url(#sShadow)"
              letterSpacing="-4"
            >
              S
            </text>
            <text
              x="50"
              y="78"
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="12"
              fontWeight="700"
              fill="#f97316"
              letterSpacing="2"
            >
              NEWS
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};
