// 밤차 시각표와 요금. 모두 가상의 값이다.

export const CABINS = [
  { id: 'single', name: '1인실', unit: '한 칸', max: 1, total: 30, price: { week: 129000, peak: 149000 } },
  { id: 'double', name: '2인실', unit: '한 칸', max: 2, total: 16, price: { week: 198000, peak: 228000 } },
  { id: 'couchette', name: '4인 침대칸', unit: '한 자리', max: 4, total: 108, price: { week: 59000, peak: 69000 } },
];

export const TRAINS = [
  { id: '1', name: '1호', dir: 'south', from: '높바람', to: '마파람', dep: '23:05', arr: '07:05', dur: '8:00', board: '22:40' },
  { id: '2', name: '2호', dir: 'north', from: '마파람', to: '높바람', dep: '23:10', arr: '07:15', dur: '8:05', board: '22:45' },
];

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

// 금요일·토요일 밤 출발은 주말 요금.
export const isPeak = (d) => d.getDay() === 5 || d.getDay() === 6;

export function nights(count, start = new Date()) {
  const base = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d;
  });
}

export const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const shortDate = (d) => `${d.getMonth() + 1}.${d.getDate()}`;
export const dow = (d) => DOW[d.getDay()];
export const longDate = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일 ${DOW[d.getDay()]}요일`;
export const won = (n) => n.toLocaleString('ko-KR');

// 남은 자리는 날짜·열차·객실로 정해지는 예시 값이다 (매번 같은 값이 나온다).
export function left(d, train, cabin) {
  let h = 2166136261;
  for (const ch of dateKey(d) + train.id + cabin.id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const r = ((h >>> 0) % 1000) / 1000;
  const days = Math.round((d - nights(1)[0]) / 86400000);
  const fill = Math.min(0.97, 0.42 + (isPeak(d) ? 0.32 : 0) - days * 0.03 + r * 0.3);
  const n = Math.max(0, Math.round(cabin.total * (1 - fill)) - (r > 0.86 && isPeak(d) ? 99 : 0));
  return n;
}
