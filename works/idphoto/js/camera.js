// The visitor's own camera, only after they ask for it. The stream feeds a <video> that never
// leaves this page; nothing is uploaded or stored. Tracks stop on 끄기, on pagehide, and after
// the tab has been hidden for a minute.
export function createCamera() {
  let stream = null, video = null, hiddenTimer = 0;

  async function start() {
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw Object.assign(new Error('unsupported'), { kind: 'unsupported' });
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
    } catch (err) {
      const name = err && err.name;
      const kind = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied'
        : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'none' : 'error';
      throw Object.assign(new Error(kind), { kind });
    }
    video = document.createElement('video');
    video.muted = true; video.playsInline = true; video.setAttribute('playsinline', '');
    video.srcObject = stream;
    await video.play().catch(() => {});
    if (!video.videoWidth) await new Promise((r) => { video.addEventListener('loadedmetadata', r, { once: true }); setTimeout(r, 1500); });
    return video;
  }
  function stop() {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    if (video) { video.srcObject = null; video = null; }
  }
  addEventListener('pagehide', stop);
  document.addEventListener('visibilitychange', () => {
    clearTimeout(hiddenTimer);
    if (document.hidden && stream) hiddenTimer = setTimeout(() => { if (document.hidden) { stop(); onLost && onLost(); } }, 60000);
  });
  let onLost = null;
  return {
    start, stop,
    get live() { return !!stream; },
    set onLost(fn) { onLost = fn; },
  };
}

export const CAMERA_TEXT = {
  idle: '카메라를 켜면 영상은 이 화면 안에서만 씁니다. 어디에도 보내지 않고 저장하지 않습니다. 셔터로 찍은 장면도 이 페이지 안에만 있다가 페이지를 닫으면 사라집니다.',
  asking: '브라우저가 카메라를 써도 되는지 묻고 있습니다. 허락하면 이 화면에 영상이 나옵니다.',
  live: '미리보기는 거울처럼 좌우가 바뀌어 보이고, 인화지에는 실제 방향으로 찍힙니다. 이 화면은 얼굴을 찾지 않으니 정수리, 턱, 눈을 띠에 직접 맞추세요. 영상은 이 페이지 밖으로 나가지 않습니다.',
  denied: '카메라를 허락하지 않아 그림 손님으로 돌아왔습니다. 주소창 옆 사이트 설정에서 바꿀 수 있습니다.',
  none: '이 기기에서 카메라를 찾지 못했습니다. 그림 손님으로 계속합니다.',
  unsupported: '이 브라우저에서는 카메라를 쓸 수 없습니다. 그림 손님으로 계속합니다.',
  error: '카메라를 켜지 못했습니다. 다른 앱이 카메라를 쓰고 있는지 확인해 주세요. 그림 손님으로 계속합니다.',
  lost: '탭을 오래 비워 두어 카메라를 껐습니다. 다시 켜려면 버튼을 누르세요.',
  off: '카메라를 껐습니다. 그림 손님으로 돌아왔습니다.',
};
