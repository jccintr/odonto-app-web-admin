import { createPortal } from 'react-dom';

/**
 * A folha para imprimir fica fora do #root: na impressão o app todo some (display: none) e só ela ocupa o papel.
 * Assim a impressão não herda a altura da tela (que gerava uma página em branco) nem o layout lateral.
 */
export default function PrintPortal({ children }) {
  return createPortal(children, document.body);
}
