// 참가 신청 확인: reads the two choices and writes a sentence. Nothing is sent anywhere.
(function () {
  'use strict';
  var form = document.getElementById('entry-form');
  var out = document.getElementById('entry-out');
  if (!form || !out) return;
  var EVENTS = {
    half: { name: '하프 21.0975km', fee: '60,000원', start: '07:30' },
    '10k': { name: '10km 달리기', fee: '45,000원', start: '07:50' },
    '5k': { name: '5km 걷기', fee: '25,000원', start: '08:10' }
  };
  form.setAttribute('novalidate', '');
  form.addEventListener('change', function () { out.textContent = ''; });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ev = form.querySelector('input[name="event"]:checked');
    var size = form.querySelector('input[name="size"]:checked');
    if (!ev || !size) {
      out.textContent = !ev && !size ? '종목과 셔츠 크기를 골라 주세요.'
        : !ev ? '종목을 골라 주세요.' : '셔츠 크기를 골라 주세요.';
      (!ev ? form.querySelector('input[name="event"]') : form.querySelector('input[name="size"]')).focus();
      return;
    }
    var d = EVENTS[ev.value];
    out.textContent = d.name + ', 셔츠 ' + size.value + '. 참가비 ' + d.fee + ', 4월 4일 ' + d.start +
      ' 출발입니다. 가상 대회라 신청서는 어디에도 보내지 않았습니다.';
  });
})();
