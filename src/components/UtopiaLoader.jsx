import React from 'react';

/**
 * UtopiaLoader component
 * Premium 3x3 grid pulsing squares loader.
 */
export default function UtopiaLoader({ scale = 1.0, squareBg }) {
  const scaleStyle = {
    transform: `scale(${scale})`,
  };

  const sqStyle = squareBg ? { backgroundColor: squareBg } : {};

  return (
    <div className="flex items-center justify-center py-6 select-none" style={scaleStyle}>
      <div className="loader">
        <div className="square" id="sq1" style={sqStyle} />
        <div className="square" id="sq2" style={sqStyle} />
        <div className="square" id="sq3" style={sqStyle} />
        <div className="square" id="sq4" style={sqStyle} />
        <div className="square" id="sq5" style={sqStyle} />
        <div className="square" id="sq6" style={sqStyle} />
        <div className="square" id="sq7" style={sqStyle} />
        <div className="square" id="sq8" style={sqStyle} />
        <div className="square" id="sq9" style={sqStyle} />
      </div>
    </div>
  );
}
