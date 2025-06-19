// src/components/IconProvider.js
import React from 'react';

// Use actual Material Design Icons
const IconProvider = ({ name, color, size }) => {
  return (
    <i 
      className={`mdi mdi-${name}`} // Use curly braces + backticks for dynamic classNames
      style={{ 
        color, 
        fontSize: size || 24,
        lineHeight: `${(size || 24) + 4}px`,
      }}
    ></i>
  );
};

export default IconProvider;