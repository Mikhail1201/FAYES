import { useEffect, useState } from "react";

type ErrorDivProps = {
  message?: string;
  onClose: () => void;
};

export default function ErrorDiv({ message, onClose }: ErrorDivProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);

      // Fade out before removing completely
      const timer = setTimeout(() => {
        setVisible(false); // activa fade-out

        // espera la animación antes de cerrar
        setTimeout(() => {
          onClose();
        }, 300); // ms debe coincidir con la duración de fade-out
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      className={`
        fixed bottom-4 right-4 
        bg-red-600 text-white px-4 py-3 
        rounded-xl shadow-lg
        transition-opacity duration-300 
        ${visible ? "opacity-100" : "opacity-0"}
      `}
    >
      {message}
    </div>
  );
}
