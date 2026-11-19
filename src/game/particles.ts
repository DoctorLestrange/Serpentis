export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

const MAX_PARTICLES = 256;
const MAX_FLOATING_TEXTS = 24;

export class ParticlePool {
  public readonly particles: Particle[] = [];
  public readonly texts: FloatingText[] = [];
  private nextParticleIdx = 0;
  private nextTextIdx = 0;

  constructor() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 3,
        color: '#ffffff',
        alpha: 1,
        life: 0,
        maxLife: 0.5,
      });
    }
    for (let i = 0; i < MAX_FLOATING_TEXTS; i++) {
      this.texts.push({
        active: false,
        x: 0,
        y: 0,
        vy: 0,
        text: '',
        color: '#ffffff',
        life: 0,
        maxLife: 0.8,
      });
    }
  }

  public clear(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles[i].active = false;
    }
    for (let i = 0; i < MAX_FLOATING_TEXTS; i++) {
      this.texts[i].active = false;
    }
  }

  public spawnBurst(
    x: number,
    y: number,
    color: string,
    count: number,
    speedMin = 40,
    speedMax = 160,
    sizeMin = 2.5,
    sizeMax = 6
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.nextParticleIdx];
      this.nextParticleIdx = (this.nextParticleIdx + 1) % MAX_PARTICLES;

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = speedMin + Math.random() * (speedMax - speedMin);

      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = sizeMin + Math.random() * (sizeMax - sizeMin);
      p.color = color;
      p.alpha = 1;
      p.life = 0;
      p.maxLife = 0.28 + Math.random() * 0.28;
    }
  }

  public spawnFloatingText(x: number, y: number, text: string, color: string): void {
    const t = this.texts[this.nextTextIdx];
    this.nextTextIdx = (this.nextTextIdx + 1) % MAX_FLOATING_TEXTS;

    t.active = true;
    t.x = x;
    t.y = y;
    t.vy = -42;
    t.text = text;
    t.color = color;
    t.life = 0;
    t.maxLife = 0.75;
  }

  public update(dt: number): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.08, dt);
      p.vy *= Math.pow(0.08, dt);
      p.alpha = 1 - p.life / p.maxLife;
    }

    for (let i = 0; i < MAX_FLOATING_TEXTS; i++) {
      const t = this.texts[i];
      if (!t.active) continue;

      t.life += dt;
      if (t.life >= t.maxLife) {
        t.active = false;
        continue;
      }
      t.y += t.vy * dt;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * p.alpha), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (let i = 0; i < MAX_FLOATING_TEXTS; i++) {
      const t = this.texts[i];
      if (!t.active) continue;

      const progress = t.life / t.maxLife;
      const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = '700 14px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }
}
