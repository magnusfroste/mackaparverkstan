/* Mackapärverkstan – bygg en kedja av prylar som löser uppdraget.
 *
 * En uppgift per bana, några fasta saker och en hög prylar man placerar själv.
 * Fysiken sköts av Matter.js (MIT, ligger i public/vendor/). Varje bana har en
 * lösning i data (används av hjälpen och av det automatiska solvens-testet).
 */
(() => {
  "use strict";

  const { Engine, World, Bodies, Body, Composite, Constraint, Events } = Matter;

  let KANON_FART = 12; // kanonens utgångsfart (justeras i banan om det behövs)

  const W = 1000; // världens bredd i bygg-enheter
  const H = 620;

  /* ---------- ritverktyg ------------------------------------------------- */
  const räknas = (v) => Math.round(v * 100) / 100;

  function rr(c, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rad, y);
    c.arcTo(x + w, y, x + w, y + h, rad);
    c.arcTo(x + w, y + h, x, y + h, rad);
    c.arcTo(x, y + h, x, y, rad);
    c.arcTo(x, y, x + w, y, rad);
    c.closePath();
  }

  function cirkel(c, x, y, r) {
    c.beginPath();
    c.arc(x, y, r, 0, 6.2832);
  }

  const TRÄ = "#b98a58";
  const TRÄ_MÖRK = "#8a6238";
  const STÅL = "#8b949e";
  const STÅL_MÖRK = "#5a6672";

  /* ---------- delarna ---------------------------------------------------- */
  // kropp(): fysiken. rita(): hur den ser ut. tick(): eget beteende per steg.
  const DELAR = {
    platta: {
      namn: "platta",
      kropp(x, y, v, d) {
        return Bodies.rectangle(x, y, d.w, d.h, {
          isStatic: true,
          angle: v || 0,
          friction: 0,
          label: "platta",
        });
      },
      rita(c, x, y, v, d) {
        c.save();
        c.translate(x, y);
        c.rotate(v);
        c.fillStyle = TRÄ;
        rr(c, -d.w / 2, -d.h / 2, d.w, d.h, Math.min(6, d.h / 3));
        c.fill();
        c.strokeStyle = "rgba(120,84,48,.35)";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(-d.w / 2 + 12, 0);
        c.lineTo(d.w / 2 - 12, 0);
        c.stroke();
        c.restore();
      },
    },

    planka: {
      namn: "planka",
      storlek: [150, 14],
      statisk: true,
      kropp(x, y, v) {
        return Bodies.rectangle(x, y, 150, 14, {
          isStatic: true,
          angle: v,
          friction: 0,
          chamfer: { radius: 5 },
        });
      },
      rita(c, x, y, v) {
        c.save();
        c.translate(x, y);
        c.rotate(v);
        c.fillStyle = TRÄ;
        rr(c, -75, -7, 150, 14, 6);
        c.fill();
        c.strokeStyle = "rgba(120,84,48,.3)";
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(-58, -2);
        c.lineTo(58, -2);
        c.stroke();
        c.restore();
      },
    },

    kil: {
      namn: "kil",
      statisk: true,
      kropp(x, y, v) {
        const b = Bodies.fromVertices(x, y, [
          [
            { x: -70, y: 34 },
            { x: 70, y: 34 },
            { x: 70, y: -34 },
          ],
        ], { isStatic: true, angle: v, friction: 0, render: { fillStyle: TRÄ } });
        return b;
      },
      rita(c, x, y, v) {
        c.save();
        c.translate(x, y);
        c.rotate(v);
        c.fillStyle = TRÄ;
        c.beginPath();
        c.moveTo(-70, 34);
        c.lineTo(70, 34);
        c.lineTo(70, -34);
        c.closePath();
        c.fill();
        c.strokeStyle = "rgba(120,84,48,.35)";
        c.lineWidth = 2;
        c.stroke();
        c.restore();
      },
    },

    boll: {
      namn: "boll",
      storlek: [32, 32],
      kropp(x, y) {
        return Bodies.circle(x, y, 16, {
          restitution: 0.32,
          friction: 0,
          frictionAir: 0.0002,
          density: 0.0016,
        });
      },
      rita(c, x, y) {
        c.fillStyle = "#d94a3d";
        cirkel(c, x, y, 16);
        c.fill();
        c.fillStyle = "rgba(255,255,255,.45)";
        cirkel(c, x - 5, y - 6, 4.5);
        c.fill();
      },
    },

    metallboll: {
      namn: "stålboll",
      storlek: [32, 32],
      mål: true,
      kropp(x, y) {
        return Bodies.circle(x, y, 16, {
          restitution: 0.2,
          friction: 0.02,
          density: 0.006,
        });
      },
      rita(c, x, y) {
        const g = c.createRadialGradient(x - 6, y - 6, 2, x, y, 17);
        g.addColorStop(0, "#f0f4f7");
        g.addColorStop(1, "#8b949e");
        c.fillStyle = g;
        cirkel(c, x, y, 16);
        c.fill();
      },
    },

    vippa: {
      namn: "vippa",
      storlek: [220, 12],
      kropp(x, y, v) {
        const b = Bodies.rectangle(x, y, 220, 12, { angle: v, friction: 0.5, density: 0.002 });
        return b;
      },
      fäst(b, x, y, v) {
        // gångjärn i mitten: vippan kan tippa men inte flytta sig
        const px = x - Math.cos(v) * 0;
        const py = y;
        return Constraint.create({
          bodyA: b,
          pointA: { x: 0, y: 0 },
          pointB: { x: px, y: py },
          length: 0,
          stiffness: 0.9,
          damping: 0.1,
        });
      },
      rita(c, x, y, v) {
        c.save();
        c.translate(x, y);
        c.rotate(v);
        c.fillStyle = "#c96f8f";
        rr(c, -110, -6, 220, 12, 6);
        c.fill();
        c.restore();
        // pivå
        c.fillStyle = STÅL_MÖRK;
        c.beginPath();
        c.moveTo(x, y + 10);
        c.lineTo(x - 16, y + 38);
        c.lineTo(x + 16, y + 38);
        c.closePath();
        c.fill();
      },
    },

    hink: {
      namn: "hink",
      storlek: [76, 60],
      kropp(x, y, v) {
        const botten = Bodies.rectangle(0, 26, 76, 10, { chamfer: { radius: 3 } });
        const vä = Bodies.rectangle(-36, 2, 10, 58, { chamfer: { radius: 3 } });
        const hö = Bodies.rectangle(36, 2, 10, 58, { chamfer: { radius: 3 } });
        const b = Body.create({
          parts: [botten, vä, hö],
          friction: 0.5,
          density: 0.0012,
          angle: v,
        });
        Body.setPosition(b, { x, y });
        Body.setAngle(b, v);
        return b;
      },
      rita(c, x, y, v) {
        c.save();
        c.translate(x, y);
        c.rotate(v);
        c.strokeStyle = "#7d868f";
        c.lineWidth = 7;
        c.lineJoin = "round";
        c.beginPath();
        c.moveTo(-36, -26);
        c.lineTo(-36, 26);
        c.lineTo(36, 26);
        c.lineTo(36, -26);
        c.stroke();
        c.strokeStyle = "rgba(125,134,143,.45)";
        c.lineWidth = 2;
        for (let i = -28; i <= 28; i += 14) {
          c.beginPath();
          c.moveTo(i, -22);
          c.lineTo(i, 22);
          c.stroke();
        }
        c.restore();
      },
    },

    domino: {
      namn: "domino",
      storlek: [14, 62],
      kropp(x, y, v) {
        return Bodies.rectangle(x, y, 14, 62, {
          angle: v,
          friction: 0.3,
          density: 0.0011,
          chamfer: { radius: 2 },
        });
      },
      rita(c, x, y, v) {
        c.save();
        c.translate(x, y);
        c.rotate(v);
        c.fillStyle = "#fdfbf7";
        rr(c, -7, -31, 14, 62, 3);
        c.fill();
        c.strokeStyle = "rgba(20,24,31,.18)";
        c.lineWidth = 1.4;
        c.stroke();
        c.fillStyle = "#3d4650";
        cirkel(c, 0, -16, 2.4);
        c.fill();
        cirkel(c, 0, 0, 2.4);
        c.fill();
        cirkel(c, 0, 16, 2.4);
        c.fill();
        c.restore();
      },
    },

    trampolin: {
      namn: "studsmatta",
      storlek: [130, 14],
      statisk: true,
      kropp(x, y, v) {
        return Bodies.rectangle(x, y, 170, 14, {
          isStatic: true,
          angle: v,
          restitution: 0.98,
          friction: 0,
          label: "studsmatta",
        });
      },
      rita(c, x, y, v) {
        c.save();
        c.translate(x, y);
        c.rotate(v);
        // fjädrar under mattan så den inte ser ut som en pall
        c.strokeStyle = "#8c9aa6";
        c.lineWidth = 2;
        [-42, -14, 14, 42].forEach((fx) => {
          c.beginPath();
          for (let i = 0; i < 4; i++) {
            c.lineTo(fx - 4, 10 + i * 6 + 3);
            c.lineTo(fx + 4, 10 + i * 6 + 6);
          }
          c.stroke();
        });
        c.strokeStyle = "#3d4650";
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(-56, 34);
        c.lineTo(-30, 34);
        c.moveTo(30, 34);
        c.lineTo(56, 34);
        c.stroke();
        c.fillStyle = "#2f7d6f";
        rr(c, -60, -10, 120, 20, 9);
        c.fill();
        c.strokeStyle = "rgba(255,255,255,.35)";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(-48, 0);
        c.lineTo(48, 0);
        c.stroke();
        c.restore();
      },
    },

    flakt: {
      namn: "fläkt",
      storlek: [72, 72],
      statisk: true,
      kropp(x, y) {
        return Bodies.circle(x, y, 30, { isStatic: true });
      },
      tick(e, dt, nu) {
        // blåser åt höger: kraft på allt som ligger framför i en kon
        S.enheter.forEach((a) => {
          if (a.enhet === e || !a.body || a.body.isStatic) return;
          const dx = a.body.position.x - (e.body.position.x + 34);
          const dy = a.body.position.y - e.body.position.y;
          if (dx < -20 || dx > 340 || Math.abs(dy) > 40 + dx * 0.55) return;
          const styrka = 0.0016 * a.body.mass * (1 - Math.min(1, dx / 340) * 0.55);
          Body.applyForce(a.body, a.body.position, { x: styrka, y: 0 });
        });
      },
      rita(c, x, y, v, d, nu) {
        c.save();
        c.translate(x, y);
        c.fillStyle = STÅL;
        cirkel(c, 0, 0, 30);
        c.fill();
        c.fillStyle = "#e8eef2";
        cirkel(c, 0, 0, 24);
        c.fill();
        c.save();
        c.rotate((nu || 0) / 140);
        c.fillStyle = STÅL_MÖRK;
        for (let i = 0; i < 3; i++) {
          c.save();
          c.rotate((i * Math.PI * 2) / 3);
          c.beginPath();
          c.moveTo(0, -3);
          c.quadraticCurveTo(16, -12, 22, 0);
          c.quadraticCurveTo(12, 6, 0, 3);
          c.closePath();
          c.fill();
          c.restore();
        }
        c.restore();
        c.fillStyle = "rgba(47,111,159,.25)";
        for (let i = 1; i <= 3; i++) {
          c.beginPath();
          c.moveTo(34 + i * 12, -8 - i * 3);
          c.lineTo(40 + i * 12, 0);
          c.lineTo(34 + i * 12, 8 + i * 3);
          c.strokeStyle = "rgba(47,111,159,.35)";
          c.lineWidth = 2;
          c.stroke();
        }
        c.restore();
      },
    },

    ljus: {
      namn: "ljus",
      storlek: [26, 60],
      statisk: true,
      kropp(x, y) {
        return Bodies.rectangle(x, y + 8, 22, 44, { isStatic: true });
      },
      tick(e, dt, nu) {
        // lågan tänder stubiner i närheten (stubinen sitter i kanonens bakände)
        S.enheter.forEach((a) => {
          if (a.typ !== "kanon" || a.tänt) return;
          const v = a.body.angle;
          const fx = a.body.position.x + Math.cos(v) * -70;
          const fy = a.body.position.y + Math.sin(v) * -70;
          const flammaY = e.body.position.y - 26;
          if (Math.hypot(fx - e.body.position.x, fy - flammaY) < 70) {
            a.tänt = nu;
          }
        });
      },
      rita(c, x, y, v, d, nu) {
        c.fillStyle = "#f3e6d2";
        rr(c, x - 11, y - 14, 22, 44, 5);
        c.fill();
        c.fillStyle = "#e3d3ba";
        c.fillRect(x - 11, y - 4, 22, 3);
        // låga
        const fl = 1 + Math.sin((nu || 0) / 90) * 0.12;
        const g = c.createRadialGradient(x, y - 26, 2, x, y - 24, 16 * fl);
        g.addColorStop(0, "#fff6d8");
        g.addColorStop(0.5, "#f2b23a");
        g.addColorStop(1, "rgba(217,74,61,.25)");
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(x, y - 40 * fl);
        c.quadraticCurveTo(x + 9, y - 26, x, y - 16);
        c.quadraticCurveTo(x - 9, y - 26, x, y - 40 * fl);
        c.fill();
      },
    },

    kanon: {
      namn: "kanon",
      storlek: [90, 56],
      statisk: true,
      kropp(x, y, v) {
        const b = Bodies.rectangle(x, y, 78, 26, { isStatic: true,        angle: v, collisionFilter: { group: -7, category: 1, mask: 4294967295 } });
        b.plugin = { x, y, v };
        return b;
      },
      tick(e, dt, nu) {
        if (!e.tänt) return;
        if (nu - e.tänt > 420 && !e.skjuten) {
          e.skjuten = true;
          const v = e.data && typeof e.data.v === "number" ? e.data.v : 0;
          const px = e.body.position.x + Math.cos(v) * 62;
          const py = e.body.position.y + Math.sin(v) * 62;
          const b = DELAR.boll.kropp(px, py);
          b.collisionFilter = { group: -7, category: 1, mask: 4294967295 };
          Body.setVelocity(b, { x: Math.cos(v) * KANON_FART, y: Math.sin(v) * KANON_FART });
          World.add(S.värld, b);
          S.enheter.push({ typ: "boll", body: b, data: {} });
          LJUD.skjut();
        }
      },
      rita(c, x, y, v, d, nu, e) {
        c.save();
        c.translate(x, y);
        c.rotate(v);
        c.fillStyle = STÅL_MÖRK;
        rr(c, -46, -13, 80, 26, 8);
        c.fill();
        c.fillStyle = "#6f7a84";
        rr(c, 24, -16, 18, 32, 6);
        c.fill();
        c.fillStyle = STÅL;
        cirkel(c, -20, 22, 12);
        c.fill();
        c.strokeStyle = TRÄ_MÖRK;
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(-46, -4);
        c.quadraticCurveTo(-62, 6, -70, -2);
        c.stroke();
        if (e && e.tänt) {
          c.fillStyle = "#f2b23a";
          cirkel(c, -70, -2, 4 + Math.random() * 2);
          c.fill();
        }
        c.restore();
      },
    },

    ballong: {
      namn: "ballong",
      storlek: [40, 56],
      kropp(x, y) {
        return Bodies.circle(x, y, 20, {
          restitution: 0.6,
          frictionAir: 0.02,
          density: 0.0004,
          plugin: { ballong: true },
        });
      },
      tick(e, dt) {
        // stiger långsamt uppåt, som en heliumballong
        Body.applyForce(e.body, e.body.position, { x: 0, y: -0.0034 * e.body.mass });
      },
      rita(c, x, y, v, d, nu) {
        const g = c.createRadialGradient(x - 6, y - 8, 2, x, y, 22);
        g.addColorStop(0, "#f7b6c2");
        g.addColorStop(1, "#c94f6b");
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(x, y, 19, 23, 0, 0, 6.2832);
        c.fill();
        c.strokeStyle = "rgba(20,24,31,.35)";
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(x, y + 23);
        c.quadraticCurveTo(x + Math.sin((nu || 0) / 380) * 8, y + 38, x, y + 52);
        c.stroke();
        c.fillStyle = "rgba(255,255,255,.5)";
        cirkel(c, x - 6, y - 9, 4);
        c.fill();
      },
    },

    nal: {
      namn: "nål",
      storlek: [30, 40],
      statisk: true,
      kropp(x, y, v) {
        return Bodies.rectangle(x, y, 6, 54, { isStatic: true, angle: v, label: "nal" });
      },
      rita(c, x, y, v) {
        c.save();
        c.translate(x, y);
        c.rotate(v);
        c.fillStyle = STÅL;
        c.beginPath();
        c.moveTo(0, -34);
        c.lineTo(3, -18);
        c.lineTo(3, 26);
        c.lineTo(-3, 26);
        c.lineTo(-3, -18);
        c.closePath();
        c.fill();
        c.fillStyle = STÅL_MÖRK;
        rr(c, -13, 24, 26, 8, 4);
        c.fill();
        c.restore();
      },
    },

    magnet: {
      namn: "magnet",
      storlek: [64, 64],
      statisk: true,
      kropp(x, y, v) {
        return Bodies.rectangle(x, y, 56, 56, { isStatic: true, isSensor: true, angle: v, label: "magnet" });
      },
      tick(e) {
        S.enheter.forEach((a) => {
          if (a.body === e.body || a.body.isStatic) return;
          if (a.typ !== "metallboll" && a.typ !== "boll") return;
          if (a.typ === "boll") return;
          const dx = e.body.position.x - a.body.position.x;
          const dy = e.body.position.y - a.body.position.y;
          const d = Math.hypot(dx, dy);
          if (d > 300 || d < 1) return;
          const f = 0.013 * a.body.mass * (1 - d / 300);
          Body.applyForce(a.body, a.body.position, { x: (dx / d) * f, y: (dy / d) * f });
        });
      },
      rita(c, x, y, v) {
        c.save();
        c.translate(x, y);
        c.rotate(v);
        c.strokeStyle = "#d94a3d";
        c.lineWidth = 15;
        c.lineCap = "butt";
        c.beginPath();
        c.moveTo(-18, 20);
        c.lineTo(-18, -6);
        c.arc(0, -6, 18, Math.PI, 0, true);
        c.lineTo(18, 20);
        c.stroke();
        c.strokeStyle = "#4a7d9f";
        c.lineWidth = 15;
        c.beginPath();
        c.moveTo(-18, 20);
        c.lineTo(-18, 30);
        c.moveTo(18, 20);
        c.lineTo(18, 30);
        c.stroke();
        c.restore();
      },
    },

    korg: {
      namn: "korg",
      statisk: true,
      kropp(x, y) {
        const botten = Bodies.rectangle(0, 40, 104, 12, { isStatic: true });
        const vä = Bodies.rectangle(-50, 6, 12, 70, { isStatic: true });
        const hö = Bodies.rectangle(50, 6, 12, 70, { isStatic: true });
        const b = Body.create({ parts: [botten, vä, hö], isStatic: true });
        Body.setPosition(b, { x, y });
        return b;
      },
      rita(c, x, y) {
        c.strokeStyle = "#b98a58";
        c.lineWidth = 10;
        c.lineJoin = "round";
        c.beginPath();
        c.moveTo(x - 50, y - 28);
        c.lineTo(x - 50, y + 40);
        c.lineTo(x + 50, y + 40);
        c.lineTo(x + 50, y - 28);
        c.stroke();
        c.strokeStyle = "rgba(120,84,48,.45)";
        c.lineWidth = 3;
        for (let i = -36; i <= 36; i += 12) {
          c.beginPath();
          c.moveTo(x + i, y - 20);
          c.lineTo(x + i, y + 36);
          c.stroke();
        }
        c.strokeStyle = "#8a6238";
        c.lineWidth = 8;
        c.beginPath();
        c.moveTo(x - 54, y - 28);
        c.lineTo(x + 54, y - 28);
        c.stroke();
      },
    },

    klocka: {
      namn: "klocka",
      statisk: true,
      kropp(x, y) {
        const b = Bodies.circle(x, y, 26, { isStatic: true, label: "klocka" });
        return b;
      },
      rita(c, x, y, v, d, nu) {
        c.fillStyle = "#e9b62f";
        c.beginPath();
        c.moveTo(x, y - 34);
        c.quadraticCurveTo(x + 26, y - 28, x + 26, y + 12);
        c.lineTo(x + 32, y + 18);
        c.lineTo(x - 32, y + 18);
        c.lineTo(x - 26, y + 12);
        c.quadraticCurveTo(x - 26, y - 28, x, y - 34);
        c.fill();
        c.strokeStyle = "#b8912a";
        c.lineWidth = 2;
        c.stroke();
        c.fillStyle = "#b8912a";
        cirkel(c, x, y + 23, 5);
        c.fill();
        if (S.klockaSlagen) {
          c.strokeStyle = "rgba(233,182,47,.6)";
          c.lineWidth = 3;
          c.beginPath();
          c.arc(x, y - 4, 38 + Math.sin((nu || 0) / 120) * 4, -0.9, 0.9);
          c.stroke();
          c.beginPath();
          c.arc(x, y - 4, 38 + Math.sin((nu || 0) / 120) * 4, Math.PI - 0.9, Math.PI + 0.9);
          c.stroke();
        }
      },
    },

    katt: {
      namn: "katt",
      statisk: true,
      kropp(x, y) {
        return Bodies.rectangle(x, y, 84, 40, { isStatic: true, label: "katt" });
      },
      rita(c, x, y) {
        c.fillStyle = "#8a7359";
        c.beginPath();
        c.ellipse(x, y + 6, 40, 20, 0, 0, 6.2832);
        c.fill();
        c.beginPath();
        c.ellipse(x + 30, y - 12, 17, 15, 0, 0, 6.2832);
        c.fill();
        // öron
        c.beginPath();
        c.moveTo(x + 22, y - 24);
        c.lineTo(x + 26, y - 38);
        c.lineTo(x + 34, y - 26);
        c.closePath();
        c.fill();
        c.beginPath();
        c.moveTo(x + 38, y - 24);
        c.lineTo(x + 44, y - 36);
        c.lineTo(x + 47, y - 22);
        c.closePath();
        c.fill();
        // ögon: sovande om inte väckt
        c.strokeStyle = "#2b2620";
        c.lineWidth = 2;
        if (S.kattenVaken) {
          c.fillStyle = "#2b2620";
          cirkel(c, x + 27, y - 12, 2.4);
          c.fill();
          cirkel(c, x + 37, y - 12, 2.4);
          c.fill();
        } else {
          c.beginPath();
          c.moveTo(x + 23, y - 12);
          c.quadraticCurveTo(x + 27, y - 9, x + 31, y - 12);
          c.moveTo(x + 34, y - 12);
          c.quadraticCurveTo(x + 38, y - 9, x + 42, y - 12);
          c.stroke();
        }
        // svans
        c.strokeStyle = "#8a7359";
        c.lineWidth = 6;
        c.lineCap = "round";
        c.beginPath();
        c.moveTo(x - 38, y + 8);
        c.quadraticCurveTo(x - 58, y + 2, x - 54, y - 14);
        c.stroke();
      },
    },

    mark: {
      namn: "mark",
      rita(c, x, y, v, d) {
        c.save();
        c.translate(x, y);
        c.fillStyle = "#e8e0d2";
        c.fillRect(-d.w / 2, 0, d.w, d.h);
        c.fillStyle = "#d6cbb8";
        c.fillRect(-d.w / 2, 0, d.w, 6);
        c.restore();
      },
    },
  };

  const PLACERBARA = [
    "planka",
    "kil",
    "boll",
    "metallboll",
    "vippa",
    "hink",
    "domino",
    "trampolin",
    "flakt",
    "ljus",
    "kanon",
    "ballong",
    "nal",
    "magnet",
  ];

  const NAMN = {
    planka: "planka",
    kil: "kil",
    boll: "boll",
    metallboll: "stålboll",
    vippa: "vippa",
    hink: "hink",
    domino: "domino",
    trampolin: "studsmatta",
    flakt: "fläkt",
    ljus: "ljus",
    kanon: "kanon",
    ballong: "ballong",
    nal: "nål",
    magnet: "magnet",
  };

  /* ---------- banorna ---------------------------------------------------- */
  // fasta: det som redan står på plats. delar: det man får använda.
  // lösning: ett sätt som fungerar – används av ledtråden och av testet.
  const GOLV = { typ: "platta", x: 500, y: 596, w: 1040, h: 28 };

  const BANOR = [
    {
      namn: "Bollen i korgen",
      uppdrag: "Få bollen i korgen",
      fasta: [
        GOLV,
        { typ: "platta", x: 170, y: 250, w: 220, h: 18, v: 0.12 },
        { typ: "boll", x: 190, y: 212 },
        { typ: "korg", x: 470, y: 545 },
      ],
      delar: { planka: 3 },
      lösning: [{ typ: "planka", x: 330, y: 400, v: 0.65 }],
    },
    {
      namn: "Studsa i korgen",
      uppdrag: "Studsa bollen i korgen",
      fasta: [
        GOLV,
        { typ: "platta", x: 150, y: 200, w: 200, h: 18, v: 0.14 },
        { typ: "boll", x: 170, y: 162 },
        { typ: "platta", x: 350, y: 470, w: 16, h: 100 },
        { typ: "korg", x: 350, y: 420 },
      ],
      delar: { trampolin: 1, planka: 1 },
      lösning: [{ typ: "trampolin", x: 350, y: 570, v: 0 }],
    },
    {
      namn: "Upp med ballongen",
      uppdrag: "Pricka ballongen med nålen",
      fasta: [GOLV, { typ: "ballong", x: 500, y: 480 }],
      delar: { nal: 2, planka: 1 },
      lösning: [{ typ: "nal", x: 500, y: 380, v: 0 }],
    },
    {
      namn: "Skjut iväg den",
      uppdrag: "Tänd stubinen så bollen hamnar i korgen",
      fasta: [
        GOLV,
        { typ: "kanon", x: 200, y: 520, v: -0.85 },
        { typ: "korg", x: 620, y: 545 },
      ],
      delar: { ljus: 1, planka: 1 },
      lösning: [{ typ: "ljus", x: 130, y: 560, v: 0 }],
    },
    {
      namn: "Fria verkstan",
      uppdrag: "Bygg fritt – prova vad som händer",
      fri: true,
      fasta: [GOLV],
      delar: {
        planka: 6,
        kil: 4,
        boll: 3,
        metallboll: 2,
        vippa: 3,
        hink: 2,
        domino: 8,
        trampolin: 2,
        flakt: 2,
        ljus: 2,
        kanon: 2,
        ballong: 3,
        nal: 3,
        magnet: 2,
      },
      lösning: [],
    },
  ];

  /* ---------- ljud ------------------------------------------------------- */
  let ljudPå = true;
  let ak = null;
  function ljudet() {
    if (!ak) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ak = new C();
    }
    if (ak.state === "suspended") ak.resume();
    return ak;
  }
  function blipp(f, längd, typ, vol) {
    if (!ljudPå) return;
    const a = ljudet();
    if (!a) return;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = typ || "sine";
    o.frequency.value = f;
    g.gain.setValueAtTime(0, a.currentTime);
    g.gain.linearRampToValueAtTime(vol || 0.12, a.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + längd);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + längd + 0.02);
  }
  const LJUD = {
    lägg() { blipp(430, 0.08, "triangle", 0.09); },
    spela() { blipp(300, 0.1, "sine", 0.08); setTimeout(() => blipp(450, 0.12, "sine", 0.08), 80); },
    skjut() { blipp(140, 0.22, "sawtooth", 0.16); },
    popp() { blipp(760, 0.07, "square", 0.1); setTimeout(() => blipp(320, 0.1, "sine", 0.08), 60); },
    klar() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blipp(f, 0.18, "triangle", 0.1), i * 100)); },
    nej() { blipp(180, 0.1, "sine", 0.07); },
  };

  /* ---------- tillstånd -------------------------------------------------- */
  const S = {
    lage: "bygg", // bygg | spel | klar
    bana: 0,
    placeringar: [],
    vald: null, // index i placeringar
    verktyg: null, // typ som ska placeras
    enheter: [],
    värld: null,
    motor: null,
    klockaSlagen: false,
    kattenVaken: false,
    ballongPoppad: false,
    klarTid: 0,
    startTid: 0,
    fel: [],
  };

  const duk = document.getElementById("duk");
  const ctx = duk.getContext("2d");
  const scen = document.getElementById("scen");

  let cw = 0;
  let ch = 0;
  let k = 1;
  let ox = 0;
  let oy = 0;
  let dpr = 1;

  function storlek() {
    const b = scen.getBoundingClientRect();
    if (!b.width || !b.height) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = b.width;
    ch = b.height;
    duk.width = Math.floor(cw * dpr);
    duk.height = Math.floor(ch * dpr);
    duk.style.width = cw + "px";
    duk.style.height = ch + "px";
    k = Math.min(cw / W, ch / H);
    ox = (cw - W * k) / 2;
    oy = (ch - H * k) / 2;
  }

  const tillVärld = (px, py) => ({ x: (px - ox) / k, y: (py - oy) / k });
  const tillSkärm = (x, y) => ({ x: x * k + ox, y: y * k + oy });

  /* ---------- banan ----------------------------------------------------- */
  function bana() {
    return BANOR[S.bana];
  }

  function ladda(nr) {
    S.bana = Math.max(0, Math.min(nr, BANOR.length - 1));
    S.lage = "bygg";
    S.placeringar = [];
    S.vald = null;
    S.verktyg = null;
    S.enheter = [];
    S.klockaSlagen = false;
    S.kattenVaken = false;
    S.ballongPoppad = false;
    S.klarTid = 0;
    städaMotor();
    byggBricka();
    ritaHUD();
  }

  function städaMotor() {
    if (S.motor) {
      Composite.clear(S.värld, false, true);
      Engine.clear(S.motor);
      S.motor = null;
      S.värld = null;
    }
  }

  function antalPlacerade(typ) {
    return S.placeringar.filter((p) => p.typ === typ).length;
  }

  function fårPlacera(typ) {
    const max = bana().delar[typ] || 0;
    return antalPlacerade(typ) < max;
  }

  function placera(typ, x, y, v) {
    if (!fårPlacera(typ)) {
      LJUD.nej();
      return false;
    }
    S.placeringar.push({ typ, x: räknas(x), y: räknas(y), v: v || 0 });
    LJUD.lägg();
    ritaHUD();
    return true;
  }

  function taBort(i) {
    if (i == null || !S.placeringar[i]) return;
    S.placeringar.splice(i, 1);
    S.vald = null;
    ritaHUD();
  }

  function rotera(i, steg) {
    const p = S.placeringar[i];
    if (!p) return;
    p.v = räknas(p.v + (steg || 1) * (Math.PI / 12));
    if (p.v > Math.PI) p.v -= Math.PI * 2;
    if (p.v < -Math.PI) p.v += Math.PI * 2;
    LJUD.lägg();
  }

  /* ---------- spela ------------------------------------------------------ */
  function byggVärld() {
    städaMotor();
    const motor = Engine.create({ enableSleeping: true });
    motor.gravity.y = 1.45;
    S.motor = motor;
    S.värld = motor.world;
    S.enheter = [];
    S.klockaSlagen = false;
    S.kattenVaken = false;
    S.ballongPoppad = false;

    const b = bana();
    // mark, tak och sidor
    World.add(S.värld, Bodies.rectangle(W / 2, H + 40, W * 2, 80, { isStatic: true }));
    World.add(S.värld, Bodies.rectangle(-40, H / 2, 80, H * 2, { isStatic: true }));
    World.add(S.värld, Bodies.rectangle(W + 40, H / 2, 80, H * 2, { isStatic: true }));

    b.fasta.forEach((f) => skapa(f.typ, f.x, f.y, f.v || 0, f, true));
    S.placeringar.forEach((p) => skapa(p.typ, p.x, p.y, p.v, p, false));

    Events.on(motor, "collisionStart", (ev) => {
      ev.pairs.forEach((par) => {
        // studsmattan ger tillbaka fart – annars tappar bollen för mycket
        [par.bodyA, par.bodyB].forEach((body) => {
          if (body.label !== "studsmatta") return;
          const andra = body === par.bodyA ? par.bodyB : par.bodyA;
          if (!andra || andra.isStatic) return;
          // studsmattan kastar alltid bollen uppåt och framåt – förutsägbart
          // för barnet, och det gör banan möjlig att räkna ut
          const v = body.angle;
          Body.setVelocity(andra, { x: 3.2 * Math.cos(v), y: -9.5 });
        });
        [par.bodyA, par.bodyB].forEach((body) => {
          if (body.label === "klocka") {
            S.klockaSlagen = true;
          }
          if (body.label === "katt") {
            const andra = body === par.bodyA ? par.bodyB : par.bodyA;
            if (andra && !andra.isStatic && Math.hypot(andra.velocity.x, andra.velocity.y) > 1.2) {
              S.kattenVaken = true;
            }
          }
          if (body.label === "nal") {
            const andra = body === par.bodyA ? par.bodyB : par.bodyA;
            if (andra && andra.plugin && andra.plugin.ballong) S.ballongPoppad = true;
          }
        });
      });
    });
  }

  function skapa(typ, x, y, v, data, fast) {
    const def = DELAR[typ];
    if (!def || !def.kropp) return null;
    const body = def.kropp(x, y, v || 0, data || {});
    const enhet = { typ, body, data: data || {}, fast: !!fast };
    S.enheter.push(enhet);
    if (body) {
      World.add(S.värld, body);
      if (def.fäst) {
        const c = def.fäst(body, x, y, v || 0);
        S.enheter.push({ typ: "gångjärn", body: null, data: {}, fäste: c });
        Composite.add(S.värld, c);
      }
    }
    return enhet;
  }

  function spela() {
    if (S.lage !== "bygg") return;
    if (el.tips) el.tips.hidden = true;
    byggVärld();
    S.lage = "spel";
    S.startTid = performance.now();
    S.vald = null;
    S.verktyg = null;
    LJUD.spela();
    ritaHUD();
  }

  function stopp() {
    S.lage = "bygg";
    städaMotor();
    ritaHUD();
  }

  function klar() {
    S.lage = "klar";
    S.klarTid = performance.now();
    LJUD.klar();
    ritaHUD();
  }

  /* ---------- mål och beteenden ------------------------------------------ */
  function kollaMål() {
    if (S.lage !== "spel" || bana().fri) return;
    const mål = bana().fasta.find((f) => ["korg", "klocka", "katt", "ballong"].includes(f.typ));
    if (!mål) return;

    if (S.klockaSlagen) return klar();
    if (S.kattenVaken) return klar();
    if (S.ballongPoppad) return klar();

    if (mål.typ === "korg") {
      const korg = S.enheter.find((e) => e.typ === "korg");
      if (!korg) return;
      const bollar = S.enheter.filter((e) => e.typ === "boll" || e.typ === "metallboll");
      bollar.forEach((b) => {
        const p = b.body.position;
        if (
          Math.abs(p.x - mål.x) < 48 &&
          p.y > mål.y - 30 &&
          p.y < mål.y + 44 &&
          Math.hypot(b.body.velocity.x, b.body.velocity.y) < 6
        ) {
          klar();
        }
      });
    }
  }

  function simulera(dt, nu) {
    if (!S.motor) return;
    S.enheter.forEach((e) => {
      if (e.body && !e.body.isStatic) {
        e.body.plugin = e.body.plugin || {};
        e.body.plugin.före = { x: e.body.velocity.x, y: e.body.velocity.y };
      }
    });
    Engine.update(S.motor, Math.min(24, dt * 1000));

    S.enheter.forEach((e) => {
      if (!e.body || !e.typ) return;
      const def = DELAR[e.typ];
      if (def && def.tick) {
        try {
          def.tick(e, dt, nu);
        } catch (err) {
          S.fel.push(String(err));
        }
      }
    });
    kollaMål();
  }

  function steg(nu, dt) {
    if (S.lage !== "spel" || !S.motor) return;
    simulera(dt, nu);
  }

  // Snabbsimulering för nivåtestet: stegar fysiken så fort maskinen hinner.
  function snabb(steg, maxSek) {
    if (S.lage !== "spel") return { klar: false };
    const antal = steg || Math.round((maxSek || 9) * 60);
    let nu = 0;
    for (let i = 0; i < antal; i++) {
      nu += 16.7;
      simulera(0.0167, nu);
      if (S.lage === "klar") return { klar: true, steg: i, bollar: bollLägen() };
    }
    return { klar: S.lage === "klar", steg: antal, bollar: bollLägen() };
  }

  function prova(nr, lista) {
    ladda(nr);
    S.placeringar = (lista || []).map((p) => ({ ...p }));
    spela();
    return snabb(720, 12);
  }

  function bollLägen() {
    return S.enheter
      .filter((e) => e.body && ["boll", "metallboll", "ballong"].includes(e.typ))
      .map((e) => [e.typ, Math.round(e.body.position.x), Math.round(e.body.position.y)]);
  }

  /* ---------- rita ------------------------------------------------------- */
  function rita(nu) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    // planen
    ctx.fillStyle = "#f6f1e8";
    ctx.fillRect(0, 0, cw, ch);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(k, k);
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();

    // rutnät
    ctx.strokeStyle = "rgba(20,24,31,.045)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    const b = bana();
    // fasta saker
    b.fasta.forEach((f) => {
      const def = DELAR[f.typ];
      if (def && def.rita) {
        if (f.typ === "boll" || f.typ === "metallboll" || f.typ === "ballong") return; // ritas som enhet
        def.rita(ctx, f.x, f.y, f.v || 0, f, nu);
      }
    });

    if (S.lage === "bygg") {
      // fasta bollar/ballonger ritas stilla
      b.fasta.forEach((f) => {
        const def = DELAR[f.typ];
        if (["boll", "metallboll", "ballong"].includes(f.typ) && def.rita) def.rita(ctx, f.x, f.y, 0, f, nu);
      });
      S.placeringar.forEach((p, i) => {
        const def = DELAR[p.typ];
        if (!def || !def.rita) return;
        if (i === S.vald) {
          ctx.save();
          ctx.strokeStyle = "#2f6f9f";
          ctx.setLineDash([8, 6]);
          ctx.lineWidth = 2;
          const stor = def.storlek || [70, 40];
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(stor[0], stor[1]) * 0.72, 0, 6.2832);
          ctx.stroke();
          ctx.restore();
        }
        def.rita(ctx, p.x, p.y, p.v, p, nu, null);
      });
      if (S.verktyg && spökPunkt) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        DELAR[S.verktyg].rita(ctx, spökPunkt.x, spökPunkt.y, spökVinkel, spökPunkt, nu, null);
        ctx.restore();
      }
    } else {
      S.enheter.forEach((e) => {
        if (!e.body || e.typ === "gångjärn") return;
        const def = DELAR[e.typ];
        if (def && def.rita) {
          def.rita(ctx, e.body.position.x, e.body.position.y, e.body.angle, e.data, nu, e);
        }
      });
    }

    if (S.lage === "klar") {
      ctx.fillStyle = "rgba(250,247,242,.78)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#14181f";
      ctx.font = "600 46px Fredoka, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Uppdraget löst!", W / 2, H / 2 - 6);
      ctx.font = "500 24px Fredoka, system-ui, sans-serif";
      ctx.fillStyle = "#4a5260";
      ctx.fillText(bana().uppdrag, W / 2, H / 2 + 34);
    }
    ctx.restore();
  }

  let spökPunkt = null;
  let spökVinkel = 0;
  let förra = 0;

  function tick(nu) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (nu - (förra || nu)) / 1000);
    förra = nu;
    steg(nu, dt);
    rita(nu);
  }

  /* ---------- inmatning -------------------------------------------------- */
  function lokal(e) {
    const b = duk.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  }

  function hittaPlacering(x, y) {
    for (let i = S.placeringar.length - 1; i >= 0; i--) {
      const p = S.placeringar[i];
      const stor = DELAR[p.typ].storlek || [80, 60];
      const rad = Math.max(stor[0], stor[1]) * 0.62;
      if (Math.hypot(p.x - x, p.y - y) < rad) return i;
    }
    return null;
  }

  let drag = null;

  duk.addEventListener("pointerdown", (e) => {
    if (S.lage !== "bygg") return;
    e.preventDefault();
    const p = lokal(e);
    const w = tillVärld(p.x, p.y);

    if (S.verktyg) {
      placera(S.verktyg, w.x, w.y, spökVinkel);
      return;
    }
    const i = hittaPlacering(w.x, w.y);
    if (i != null) {
      S.vald = i;
      drag = { i, x: w.x, y: w.y, start: performance.now() };
      ritaHUD();
    } else {
      S.vald = null;
      ritaHUD();
    }
  });

  duk.addEventListener("pointermove", (e) => {
    const p = lokal(e);
    const w = tillVärld(p.x, p.y);
    if (S.verktyg) {
      spökPunkt = w;
      return;
    }
    if (drag && S.placeringar[drag.i]) {
      const pl = S.placeringar[drag.i];
      const flytt = Math.hypot(w.x - drag.x, w.y - drag.y);
      if (flytt > 10) {
        pl.x = räknas(w.x);
        pl.y = räknas(w.y);
      }
    }
  });

  duk.addEventListener("pointerup", () => {
    drag = null;
  });
  duk.addEventListener("pointercancel", () => {
    drag = null;
  });
  duk.addEventListener("contextmenu", (e) => e.preventDefault());

  // verktygsknappar (rotera / ta bort) i HUD
  document.querySelectorAll("[data-rot]").forEach((b) => {
    b.addEventListener("click", () => {
      if (S.vald != null) {
        rotera(S.vald, Number(b.dataset.rot));
        return;
      }
      if (S.verktyg) {
        spökVinkel = räknas(spökVinkel + Number(b.dataset.rot) * (Math.PI / 12));
        LJUD.lägg();
      }
    });
  });
  const taBortKnapp = document.querySelector("[data-ta-bort]");
  if (taBortKnapp) {
    taBortKnapp.addEventListener("click", () => {
      if (S.vald != null) {
        taBort(S.vald);
        return;
      }
      // med en pryl vald tar papperskorgen bort den senast utlagda av samma sort
      if (!S.verktyg) return;
      for (let i = S.placeringar.length - 1; i >= 0; i--) {
        if (S.placeringar[i].typ === S.verktyg) {
          taBort(i);
          return;
        }
      }
    });
  }

  const spelaKnapp = document.querySelector("[data-spela]");
  if (spelaKnapp) {
    spelaKnapp.addEventListener("click", () => {
      if (S.lage === "klar") {
        if (S.bana + 1 < BANOR.length) ladda(S.bana + 1);
        else ladda(0);
        return;
      }
      if (S.lage === "spel") stopp();
      else spela();
    });
  }

  const igenKnapp = document.querySelector("[data-igen]");
  if (igenKnapp) {
    igenKnapp.addEventListener("click", () => stopp());
  }

  const ljudKnapp = document.querySelector("[data-ljud]");
  if (ljudKnapp) {
    ljudKnapp.addEventListener("click", () => {
      ljudPå = !ljudPå;
      ljudKnapp.classList.toggle("av", !ljudPå);
      ljudKnapp.setAttribute("aria-pressed", ljudPå ? "true" : "false");
    });
  }

  const banoKnapp = document.querySelector("[data-banor]");
  const banoLista = document.querySelector("[data-banolista]");
  function ritaBanolista() {
    if (!banoLista) return;
    banoLista.innerHTML = "";
    BANOR.forEach((b, i) => {
      const k = document.createElement("button");
      k.type = "button";
      k.textContent = i + 1 + ". " + b.namn;
      k.setAttribute("aria-current", i === S.bana ? "true" : "false");
      k.addEventListener("click", () => {
        ladda(i);
        ritaHUD();
        banoLista.hidden = true;
        if (banoKnapp) banoKnapp.setAttribute("aria-expanded", "false");
      });
      banoLista.appendChild(k);
    });
  }
  if (banoKnapp && banoLista) {
    banoKnapp.addEventListener("click", () => {
      const öppna = banoLista.hidden;
      banoLista.hidden = !öppna;
      banoKnapp.setAttribute("aria-expanded", öppna ? "true" : "false");
      if (öppna) ritaBanolista();
    });
    document.addEventListener("pointerdown", (e) => {
      if (banoLista.hidden) return;
      if (banoLista.contains(e.target) || banoKnapp.contains(e.target)) return;
      banoLista.hidden = true;
      banoKnapp.setAttribute("aria-expanded", "false");
    });
  }

  /* ---------- brickan ---------------------------------------------------- */
  const el = {
    bricka: document.querySelector("[data-bricka]"),
    uppdrag: document.querySelector("[data-uppdrag]"),
    nivå: document.querySelector("[data-niva]"),
    spela: spelaKnapp,
    igen: igenKnapp,
    verktyg: document.querySelector("[data-verktygsrad]"),
    tips: document.querySelector("[data-tips]"),
  };

  function ikon(typ, sida) {
    const c = document.createElement("canvas");
    c.width = sida;
    c.height = sida;
    const cc = c.getContext("2d");
    cc.translate(sida / 2, sida / 2);
    const def = DELAR[typ];
    const stor = def.storlek || [70, 40];
    const skala = Math.min((sida * 0.78) / stor[0], (sida * 0.78) / stor[1], 1);
    cc.scale(skala, skala);
    if (def.rita) def.rita(cc, 0, 0, 0, { w: stor[0], h: stor[1] }, 0, null);
    return c;
  }

  function byggBricka() {
    if (!el.bricka) return;
    el.bricka.innerHTML = "";
    const b = bana();
    Object.keys(b.delar).forEach((typ) => {
      const kvar = b.delar[typ] - antalPlacerade(typ);
      const knapp = document.createElement("button");
      knapp.type = "button";
      knapp.className = "pryl" + (S.verktyg === typ ? " vald" : "") + (kvar <= 0 ? " slut" : "");
      knapp.dataset.typ = typ;
      knapp.setAttribute("aria-label", NAMN[typ] + ", " + kvar + " kvar");
      const c = ikon(typ, 54);
      knapp.appendChild(c);
      const m = document.createElement("span");
      m.className = "antal";
      m.textContent = "×" + kvar;
      knapp.appendChild(m);
      knapp.addEventListener("click", () => {
        if (kvar <= 0) {
          LJUD.nej();
          return;
        }
        S.verktyg = S.verktyg === typ ? null : typ;
        S.vald = null;
        spökVinkel = 0;
        ritaHUD();
      });
      el.bricka.appendChild(knapp);
    });
  }

  function ritaHUD() {
    const b = bana();
    if (el.uppdrag) el.uppdrag.textContent = b.uppdrag;
    if (el.nivå) el.nivå.textContent = S.bana + 1 + "/" + BANOR.length;
    if (el.spela) {
      el.spela.textContent = S.lage === "klar" ? "Nästa bana" : S.lage === "spel" ? "Stopp" : "Spela";
      el.spela.hidden = false;
    }
    if (el.igen) el.igen.hidden = S.lage === "bygg";
    if (el.verktyg) el.verktyg.hidden = S.vald == null && !S.verktyg;
    if (el.tips) el.tips.hidden = S.placeringar.length > 0 || S.lage !== "bygg";
    byggBricka();
  }

  /* ---------- start ------------------------------------------------------- */
  window.addEventListener("resize", storlek);
  storlek();
  ladda(0);
  requestAnimationFrame(tick);

  // test- och hjälp-API
  window.__mk = {
    S,
    BANOR,
    DELAR,
    ladda,
    spela,
    stopp,
    placera,
    byggVärld,
    sätt(nr, lista) {
      ladda(nr);
      S.placeringar = lista.map((p) => ({ ...p }));
      ritaHUD();
    },
    målet() {
      return { klar: S.lage === "klar", klocka: S.klockaSlagen, katt: S.kattenVaken, ballong: S.ballongPoppad };
    },
    snabb,
    bollLägen,
    fart(f) { KANON_FART = f; },
    prova,
    sök(nr, först, typ, xs, ys, vs) {
      const träffar = [];
      for (const x of xs) {
        for (const y of ys) {
          for (const v of vs) {
            const r = prova(nr, först.concat([{ typ, x, y, v }]));
            if (r.klar) träffar.push({ typ, x, y, v, steg: r.steg });
          }
        }
      }
      return träffar.slice(0, 10);
    },

  };
})();