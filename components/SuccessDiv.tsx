import { useEffect, useState } from "react";

type SuccessDivProps = {
  message?: string;
  onClose: () => void;
};

export default function SuccessDiv({ message, onClose }: SuccessDivProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);

        setTimeout(() => {
          onClose();
        }, 300); // misma duración que fade-out
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      className={`
        fixed bottom-4 right-4 
        bg-green-600 text-white px-4 py-3 
        rounded-xl shadow-lg
        transition-opacity duration-300 
        ${visible ? "opacity-100" : "opacity-0"}
      `}
    >
      {message}
    </div>
  );
}
