import React, { useState } from 'react';
import Landing from './pages/Landing';
import CGPACalculator from './pages/CGPACalculator';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');

  const navigateToCGPA = () => {
    setCurrentPage('cgpa');
  };

  const navigateHome = () => {
    setCurrentPage('landing');
  };

  return (
    <div className="App">
      {currentPage === 'landing' ? (
        <Landing onNavigateToCGPA={navigateToCGPA} />
      ) : (
        <CGPACalculator onNavigateHome={navigateHome} />
      )}
    </div>
  );
}

export default App;
