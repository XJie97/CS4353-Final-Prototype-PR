import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import BorrowHome from './pages/borrow/BorrowHome';

createRoot(document.getElementById('root')!).render(<StrictMode><BorrowHome /></StrictMode>);
