import React from 'react';

/**
 * UtopiaLoader component
 * Replicates the visual progress bar and double leading-tip spark flickering animation from the app.
 * Utilizes high-performance CSS transforms and opacity keyframes.
 */
export default function UtopiaLoader({ scale = 1.0 }) {
  const barHeight = 2.5 * scale;
  const paddingY = 8 * scale;

  return (
    <div 
      className="relative w-full max-w-[120px] mx-auto select-none"
      style={{ padding: `${paddingY}px 6px` }}
    >
      {/* Background track */}
      <div 
        className="absolute inset-x-1.5 bg-text/15 dark:bg-text/25 rounded-full"
        style={{ 
          height: `${barHeight}px`,
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      >
        {/* Filled progress bar with tip sparks inside the track */}
        <div 
          className="absolute left-0 top-0 h-full bg-text rounded-full animate-loaderProgress origin-left"
        >
          {/* Glow effect on dark themes (using Tailwind dark: class) */}
          <div className="absolute inset-0 bg-text/45 blur-[4px] rounded-full hidden dark:block" />

          {/* Spark 1 (-45deg) */}
          <div 
            className="absolute right-0 top-1/2 w-[6px] h-[0.8px] bg-text origin-left -rotate-45 animate-loaderSpark1"
            style={{
              width: `${6 * scale}px`,
              height: `${0.8 * scale}px`,
              marginTop: `${1.5 * scale}px`
            }}
          />

          {/* Spark 2 (+45deg) */}
          <div 
            className="absolute right-0 top-1/2 w-[6px] h-[0.8px] bg-text origin-left rotate-45 animate-loaderSpark2"
            style={{
              width: `${6 * scale}px`,
              height: `${0.8 * scale}px`,
              marginTop: `-${1.5 * scale}px`
            }}
          />
        </div>
      </div>
    </div>
  );
}
