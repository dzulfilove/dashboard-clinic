import { motion, AnimatePresence } from 'motion/react';
import { ReactNode, useState, useEffect } from 'react';
import Loader from './Loader.js';

interface PageTransitionProps {
  children: ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[50vh]">
      <AnimatePresence mode="wait">
        {showLoader ? (
          <motion.div
            key="loader"
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-transparent"
          >
            <Loader />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full h-full"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PageTransition;
