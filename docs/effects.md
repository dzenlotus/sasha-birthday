# Атмосфера и Magic UI

`effects.js` добавляет один полноэкранный canvas WebGL 1: три медленно текущие
световые ленты, тёплую звёздную пыль, мягкий свет за указателем и расходящийся
круг при касании. Это настоящий фрагментный шейдер GLSL, один треугольник и один
draw call на кадр; Three.js и дополнительные библиотеки не используются.

Canvas неподвижен, не перехватывает указатель и скрыт от скринридера. Рисунок
открытки остаётся под ним: чёрный фон шейдера исчезает при `mix-blend-mode:screen`.
Плотность пикселей ограничена 1.5 и примерно миллионом пикселей. При скрытии
вкладки цикл останавливается. При `prefers-reduced-motion: reduce` остаётся один
неподвижный кадр; движение за указателем, круг и CSS-анимации отключаются.
Без WebGL или при потере контекста остаётся иллюстрированная открытка.

При переключении главы приложение отправляет `birthday:chapter` с
`detail: { chapter: number }`: на обложке сияние сильнее, в главах спокойнее.
Для проверки доступен `document.documentElement.dataset.webgl` со значением
`active` или `fallback`.

## Нативные адаптации Magic UI

Официальные исходники проверены 4 ноября 2026 года:

- [Aurora Text](https://magicui.design/r/aurora-text.json): цветной линейный
  градиент, `background-clip:text`, фон шириной 200% и движение градиента.
  Наша `.magic-aurora` использует эту основу с мягкой золотой, розовой и
  бирюзовой палитрой. Повороты и масштабирование букв убраны ради читаемости.
- [Shimmer Button](https://magicui.design/r/shimmer-button.json): вращающийся
  конический градиент под внутренней заливкой оставляет свет на периметре.
  Наша `.magic-shimmer` воспроизводит приём двумя псевдоэлементами.
  Сам элемент остаётся обычной кнопкой с прежними событиями, фокусом и именем.

Это компактные CSS-адаптации официальных компонентов, а не импорт React
компонентов. React, Tailwind и runtime Magic UI не подключены. Классы работают
и у элементов, заново появляющихся при смене главы.

## Проверка в браузере

1. Обложка: `data-webgl="active"`, один `.webgl-atmosphere`, нет ошибок GLSL.
   Ленты текут; у указателя мягкий свет; касание вызывает один затухающий круг.
2. В главе свет слабее, кнопки и текст остаются доступны; canvas не принимает
   касания. Проверить широкое окно и телефон, отсутствие прокрутки по горизонтали.
3. Включить эмуляцию `prefers-reduced-motion: reduce`: изображение неподвижно,
   градиент текста и обводка кнопки не анимируются. Вернуть настройку — движение
   продолжается. В скрытой вкладке кадры не запрашиваются.
4. Запустить браузер без WebGL либо вызвать расширение `WEBGL_lose_context`:
   `data-webgl="fallback"`; фон и все действия открытки остаются доступны.

## Лицензия Magic UI

Источник: [официальная MIT License](https://github.com/magicuidesign/magicui/blob/main/LICENSE.md).
Уведомление сохранено для адаптированных частей.

```text
MIT License

Copyright (c) Magic UI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
