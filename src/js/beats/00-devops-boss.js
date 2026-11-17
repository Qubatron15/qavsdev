// DevOps boss: disabled. Uncomment this file, its entry in beats/index.js and the
// boss markup / styles / sprite in index.html, main.js, sprites.js and reset.js to restore it.
// import { $, bossScene } from '../dom.js';
// import { sfx } from '../audio.js';
// import { banner, removeAfter, shake } from '../effects.js';
// import { setCaption } from '../hud.js';
// import { wait } from '../timing.js';
//
// const CANDIES = ['🍬', '🍭', '🍒', '🍇', '🍋', '🍏'];
//
// /** Burst of candy emojis from the boss's phone. */
// function candyBurst() {
//   for (let i = 0; i < 16; i++) {
//     const candy = document.createElement('div');
//     candy.className = 'candy';
//     candy.textContent = CANDIES[i % CANDIES.length];
//     candy.style.left = '385px';
//     candy.style.top = '290px';
//     bossScene.appendChild(candy);
//     const angle = Math.random() * 6.28;
//     const radius = 100 + Math.random() * 180;
//     const dx = Math.cos(angle) * radius * 1.4;
//     const dy = Math.sin(angle) * radius - 60;
//     candy.animate(
//       [
//         { transform: 'none', opacity: 1 },
//         { transform: `translate(${dx}px,${dy}px) rotate(${Math.random() * 360}deg)`, opacity: 0 },
//       ],
//       { duration: 1100 },
//     );
//     removeAfter(candy, 1100);
//   }
// }
//
// /** [0] Production goes down; the DevOps boss is busy playing a candy game. */
// export async function devopsBoss() {
//   setCaption(0, '…(unless DevOps takes down production first).');
//   sfx.siren();
//   $('#flash').animate(
//     [
//       { opacity: 0 },
//       { opacity: 0.7 },
//       { opacity: 0 },
//       { opacity: 0.7 },
//       { opacity: 0 },
//       { opacity: 0.6 },
//       { opacity: 0 },
//     ],
//     { duration: 1800 },
//   );
//   await wait(1700);
//
//   sfx.boom();
//   shake();
//   banner('PRODUCTION DIED', 'souls', 7000);
//   await wait(2200);
//
//   bossScene.classList.add('on');
//   $('#boss-sprite').animate([{ transform: 'translateY(320px)' }, { transform: 'none' }], {
//     duration: 900,
//     easing: 'ease-out',
//   });
//   await wait(1000);
//
//   const bubble = $('#boss-bubble');
//   bubble.style.display = 'block';
//   bubble.innerHTML = '“SWEET! DELICIOUS!”<br><small>(Level 4020 Cleared)</small>';
//   for (let i = 0; i < 5; i++) {
//     sfx.candy();
//     candyBurst();
//     await wait(1150);
//   }
// }
