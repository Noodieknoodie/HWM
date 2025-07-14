// frontend/src/components/Header.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const location = useLocation();
  
  const navItems = [
    { title: 'SUMMARY', path: '/Summary' },
    { title: 'PAYMENTS', path: '/Payments' },
    { title: 'CONTACTS', path: '/Contacts' },
    { title: 'CONTRACTS', path: '/Contracts' },
    { title: 'DOCUMENTS', path: '/Documents' },
    { title: 'EXPORT', path: '/Export' },
  ];
  
  return (
    <header className="navbar-dark shadow-md">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center">
          <Link to="/" className="text-xl font-semibold text-white mr-8 hover:text-blue-300 transition-colors duration-200">
            401k Payment Tracker
          </Link>
          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                to={item.path}
                className={`${
                  location.pathname === item.path 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-100 hover:bg-gray-800 hover:text-white'
                } rounded-md px-4 py-2 text-sm font-medium h-10 flex items-center transition-colors duration-200`}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <button className="flex items-center gap-2 p-2 text-gray-100 hover:text-white transition-colors duration-200">
            <span className="hidden sm:inline-block text-sm font-medium">Admin User</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
      </div>
      <div className="md:hidden overflow-x-auto bg-gray-800 px-3 border-t border-gray-700">
        <nav className="flex">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`${
                location.pathname === item.path
                  ? 'border-b-2 border-blue-500 text-white'
                  : 'text-gray-300 hover:text-white'
              } px-4 py-2 text-sm`}
            >
              {item.title}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;