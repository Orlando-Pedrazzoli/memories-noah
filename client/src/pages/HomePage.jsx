import React from 'react';
import Navbar from '../components/layout/Navbar';
import Hero from '../components/common/Hero';
import Footer from '../components/layout/Footer';

const HomePage = () => {
  return (
    <div className='min-h-screen bg-gray-50'>
      <Navbar />
      <main>
        <Hero />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
