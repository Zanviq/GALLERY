# 제맛: interaction

The page only shows. It has one small tool, because 라면 is a thing people time: the **면 타이머** under
끓이는 법. No other script, no scroll effects, no hover animation.

## 면 타이머 (trigger, rules, feedback)

- **Trigger**: two radio groups (맛: 멸치 고추 대파 후추, default 고추; 면: 꼬들, 30초 덜 · 그대로 · 퍼진, 30초 더)
  and one button (시작 → 멈춤 → 계속), plus 다시 맞추기.
- **Rules**: time = the flavour's packet time (3:30, 4:30, 4:00, 5:00) plus the texture offset. The
  count is an end timestamp, so it stays right when the tab sleeps or the phone locks. While it runs,
  the radios are disabled, so the setting cannot change under a running count.
- **Feedback**:
  - the clock (Black Han Sans, 160–300 px) counts down once a second; the tab title shows the time
    too, so it can be read from another tab;
  - a polite live region says only what matters: the setting ("고추, 물 550ml. 4분 30초를 잽니다."),
    start, pause, "2분 지났습니다. 계란은 지금 넣으세요." (the egg step of the recipe), and the end;
  - at the end the clock turns 고추 red, the status line becomes "불을 끄세요. 다 됐습니다." and the
    title says it too. That is the payoff, and it is useful.

## States

```
[set] --시작--> [running] --멈춤--> [paused] --계속--> [running]
[running] --time 0--> [done]
[running|paused|done] --다시 맞추기--> [set]
[set] --radio change--> [set] (clock and status update at once)
```

## Access

- Native radios inside fieldsets with legends, native buttons; the radio box shows focus with a 3 px
  outline, checked = ink fill. Tab order follows reading order.
- The clock has `role="timer"`; announcements go through the status line, not every second.
- Reduced motion: nothing moves anyway; the count is a number change, not an animation.
- No storage. Works without JavaScript as a static table of times (the flavour posters carry the times).
