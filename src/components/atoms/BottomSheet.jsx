import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { vibrateTouch } from '../../utils/haptic';

export default function BottomSheet({ 
  isOpen, 
  onClose, 
  title, 
  children,
  className = "" 
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              vibrateTouch();
              onClose();
            }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Sheet Container */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "relative z-10 w-full max-h-[85vh] bg-gradient-to-b from-[#13110f] to-black",
              "border-t-2 border-magic-gold/30 rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.9)]",
              "flex flex-col overflow-hidden pb-safe",
              className
            )}
          >
            {/* Grab/Drag indicator handle */}
            <div 
              onClick={() => {
                vibrateTouch();
                onClose();
              }}
              className="w-full flex justify-center py-4 cursor-pointer"
            >
              <div className="w-16 h-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors" />
            </div>

            {/* Header */}
            {title && (
              <div className="px-6 pb-4 border-b border-white/5 flex justify-between items-center shrink-0">
                <h3 className="font-cinzel text-lg font-bold text-magic-gold tracking-wide">
                  {title}
                </h3>
                <button
                  onClick={() => {
                    vibrateTouch();
                    onClose();
                  }}
                  className="text-white/40 hover:text-white p-1 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
