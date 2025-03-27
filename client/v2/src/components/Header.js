import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Github } from 'lucide-react';

function Header() {
  return (
    <header className="bg-[#0e1116] border-b border-gray-800/50">
      <div className="container mx-auto max-w-6xl px-6 py-6 flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-3">
          <Package className="text-blue-400" size={32} />
          <h1 className="text-2xl font-bold gradient-text">
            LEGO Deal Analyzer
          </h1>
        </Link>
        <nav className="flex space-x-6">
          <Link
            to="/score-explanation"
            className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
          >
            How Score is Calculated
          </Link>
          <a
            href="https://github.com/KyllianGenot/lego"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors text-sm font-medium flex items-center"
          >
            GitHub <Github className="ml-1" size={16} />
          </a>
        </nav>
      </div>
    </header>
  );
}

export default Header;