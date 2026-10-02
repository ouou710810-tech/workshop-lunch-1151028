# 非專研習・捕夢網製作點餐網站

GitHub Pages static-site draft for the 2026-10-28 workshop.

## Current state

- The participant page and supplied menu image are in place.
- The two supplied seaweed-roll photos are used in the hero and introduction sections.
- The form, masked order list, statistics, and PNG card use browser-local storage.
- Orders are visible only in the browser that submitted them; visitors do not share orders across devices.
- There is no protected admin page in this database-free version.

## Menu

原味飯糰、海苔香鬆、泡菜飯糰、鮪魚飯糰、烤肉飯糰、辣豬肉飯糰。

The source menu image is `assets/menu.png`; its six round cross-sections are cropped as transparent circular PNGs in `assets/meal-circle-1.png` through `assets/meal-circle-6.png`.
The supplied food photos are `assets/seaweed-roll-platter.png` and `assets/seaweed-roll-wrapped.png`.

## GitHub Pages behavior

The site has no backend. Order records stay in each participant's browser and are not available to the organizer or other participants. The PNG card is generated in the browser. The QR code points to the deployed page URL.
