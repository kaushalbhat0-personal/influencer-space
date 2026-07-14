import { motion } from "framer-motion";

export function LoadingSpinner({ size = "md", text }: { size?: "sm" | "md" | "lg"; text?: string }) {
  const sizes = { sm: "h-6 w-6 border-2", md: "h-10 w-10 border-[3px]", lg: "h-16 w-16 border-4" };
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className={`${sizes[size]} rounded-full border-s8ul-cyan/30 border-t-s8ul-cyan`}
      />
      {text && <p className="text-sm text-gray-400">{text}</p>}
    </div>
  );
}
