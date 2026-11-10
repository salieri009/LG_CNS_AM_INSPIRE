import { Component, Suspense, lazy, type ComponentProps, type ReactNode } from 'react';

// three.js 묶음은 크기가 커서 첫 화면과 따로 불러온다. 화면(패널·검색)은 먼저 뜨고 3D는 뒤이어 들어온다
const RepairViewer = lazy(() => import('./RepairViewer').then(m => ({ default: m.RepairViewer })));
type Props = ComponentProps<typeof RepairViewer>;

/** 3D를 불러오지 못해도(그래픽 드라이버·WebGL 꺼짐 등) 매뉴얼 그림과 단계 안내로 계속 진행할 수 있게 한다 */
class ViewerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="viewer-msg" role="alert">
        <p>3D를 불러오지 못했습니다.</p>
        <p className="muted">아래 매뉴얼 그림과 단계 안내로 그대로 진행할 수 있습니다.</p>
        {/* lazy 불러오기는 실패 결과를 기억하므로 다시 시도는 페이지를 새로 불러온다 */}
        <button className="pill" onClick={() => window.location.reload()}>다시 불러오기</button>
      </div>
    );
  }
}

export function Viewer3D(props: Props) {
  return (
    <ViewerBoundary>
      <Suspense fallback={<div className="viewer-msg"><p className="muted">3D 준비 중…</p></div>}>
        <RepairViewer {...props} />
      </Suspense>
    </ViewerBoundary>
  );
}
