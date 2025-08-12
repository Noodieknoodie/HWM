// frontend/src/components/Header.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const location = useLocation();
  
  const navItems = [
    { title: 'SUMMARY', path: '/dashboard/Summary' },
    { title: 'PAYMENTS', path: '/dashboard/Payments' },
    // { title: 'CONTACTS', path: '/dashboard/Contacts' },
    // { title: 'CONTRACTS', path: '/dashboard/Contracts' },
    // { title: 'DOCUMENTS', path: '/dashboard/Documents' },
    { title: 'EXPORT', path: '/dashboard/Export' },
  ];
  
  return (
    <header className="navbar-dark shadow-md relative z-40">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center">
          <Link to="/dashboard" className="text-xl font-semibold text-white mr-8 hover:text-blue-300 transition-colors duration-200">
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
        {/* Admin section removed */}
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