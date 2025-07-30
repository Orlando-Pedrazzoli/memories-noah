import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll para o topo quando a rota mudar
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth', // Scroll suave (opcional, pode usar 'auto' para instantâneo)
    });
  }, [pathname]);

  return null; // Componente não renderiza nada
};

export default ScrollToTop;
