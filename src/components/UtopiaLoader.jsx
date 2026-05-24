import React from 'react';

/**
 * UtopiaLoader component
 * Premium 3x3 grid pulsing squares loader.
 */
export default function UtopiaLoader({ scale = 1.0 }) {
  const scaleStyle = {
    transform: `scale(${scale})`,
  };

  return (
    <div className="flex items-center justify-center py-6 select-none" style={scaleStyle}>
      <div className="loader">
        <div className="square" id="sq1" />
        <div className="square" id="sq2" />
        <div className="square" id="sq3" />
        <div className="square" id="sq4" />
        <div className="square" id="sq5" />
        <div className="square" id="sq6" />
        <div className="square" id="sq7" />
        <div className="square" id="sq8" />
        <div className="square" id="sq9" />
      </div>
    </div>
  );
}
