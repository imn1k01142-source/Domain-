/* ============================================================
   DOMAIN — configurarea nivelelor si a clipurilor
   ------------------------------------------------------------
   Fiecare clip are timestamp-urile jumpscare-urilor adnotate manual
   (in secunde, relativ la inceputul clipului). Astea sunt "adevarul"
   fata de care masuram reactia. Fara ele nu poti calcula latenta.

   intensity: 1..3 — cat de tare e sperietura (folosit de simulator
   si ca pondere in scorul final).

   src: pune fisierele in media/. Daca fisierul lipseste, playerul
   trece automat in "phantom mode" (ecran negru + timer + flash la
   momentele de scare) ca sa poti testa pipeline-ul fara video.
   ============================================================ */

window.D = window.D || {};

D.LEVELS = [
  {
    id: 'easy',
    name: 'Ușor',
    desc: 'Tensiune atmosferică, sperieturi rare și telegrafiate. Punctul de plecare pentru oricine.',
    rank: 1,
    clips: [
      { id:'e1', title:'Coridorul', src:'media/easy-1.mp4', duration:45,
        scares:[ {t:14, intensity:1}, {t:31, intensity:1} ] },
      { id:'e2', title:'Subsolul', src:'media/easy-2.mp4', duration:50,
        scares:[ {t:18, intensity:1}, {t:35, intensity:2} ] }
    ]
  },
  {
    id: 'medium',
    name: 'Mediu',
    desc: 'Ritm mai alert, sperieturi mai dese și mai puțin previzibile.',
    rank: 2,
    clips: [
      { id:'m1', title:'Pădurea', src:'media/medium-1.mp4', duration:55,
        scares:[ {t:12, intensity:2}, {t:27, intensity:2}, {t:44, intensity:3} ] },
      { id:'m2', title:'Spitalul', src:'media/medium-2.mp4', duration:60,
        scares:[ {t:9, intensity:2}, {t:24, intensity:3}, {t:41, intensity:2}, {t:53, intensity:3} ] }
    ]
  },
  {
    id: 'hard',
    name: 'Greu',
    desc: 'Fără pauze. Sperieturi suprapuse, sunet agresiv, zero telegrafiere.',
    rank: 3,
    clips: [
      { id:'h1', title:'Azilul', src:'media/hard-1.mp4', duration:60,
        scares:[ {t:7, intensity:3}, {t:19, intensity:3}, {t:28, intensity:2},
                 {t:39, intensity:3}, {t:50, intensity:3} ] },
      { id:'h2', title:'Ultimul etaj', src:'media/hard-2.mp4', duration:65,
        scares:[ {t:6, intensity:3}, {t:16, intensity:3}, {t:25, intensity:3},
                 {t:36, intensity:3}, {t:47, intensity:3}, {t:58, intensity:3} ] }
    ]
  }
];

D.levelByRank = r => D.LEVELS.find(l => l.rank === r) || D.LEVELS[D.LEVELS.length-1];
D.levelById  = id => D.LEVELS.find(l => l.id === id);
