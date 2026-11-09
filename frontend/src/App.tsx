import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MechanicPage } from './pages/MechanicPage';
import { FactoryPage } from './pages/FactoryPage';

// 배포 구성(docs/deployment-eks.md)과 같게 '/'는 정비사 웹, '/factory'는 공장 대시보드
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MechanicPage />} />
        <Route path="/factory" element={<FactoryPage />} />
      </Routes>
    </BrowserRouter>
  );
}
