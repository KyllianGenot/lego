import React from 'react';
import { Github } from 'lucide-react';

function Footer() {
  return (
    <footer className="bg-[#0e1116] border-t border-gray-800/50 py-8">
      <div className="container mx-auto max-w-6xl px-6 text-center text-gray-400">
        <p className="mb-4">
          &copy; {new Date().getFullYear()} LEGO Deal Analyzer. All rights reserved.
        </p>
        <div className="flex justify-center space-x-6">
          <a
            href="https://github.com/KyllianGenot/lego"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors flex items-center"
          >
            GitHub <Github className="ml-1" size={16} />
          </a>
          <a
            href="/score-explanation"
            className="text-gray-400 hover:text-white transition-colors"
          >
            How Score is Calculated
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;