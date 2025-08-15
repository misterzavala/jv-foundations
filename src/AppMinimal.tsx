// Minimal App component for debugging
import React from "react";

const AppMinimal = () => {
  console.log("AppMinimal is rendering");
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: 'red', fontSize: '32px' }}>🚨 MINIMAL APP WORKING</h1>
      <p>If you can see this, React and the basic app structure work.</p>
      <p>Current URL: {window.location.href}</p>
      <button onClick={() => alert('Button works!')}>Test Click</button>
      <div style={{ marginTop: '20px', backgroundColor: '#f0f0f0', padding: '10px' }}>
        <h3>Debug Info:</h3>
        <ul>
          <li>React: Working ✅</li>
          <li>JavaScript: Working ✅</li>
          <li>DOM: Working ✅</li>
        </ul>
      </div>
    </div>
  );
};

export default AppMinimal;