const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; // Fixed width for consistent logic
canvas.height = 600; // Fixed height for consistent logic

// Constants for readability
const BASE_INVADER_SHOOT_INTERVAL = 110; // Reduced from 176 (60% faster enemy fire rate, 176 / 1.6)
const ENEMY_SPAWN_DELAY = 240;
const LEVEL_COMPLETE_DELAY = 180;
const SHIELD_HEALTH_MAX = 1000;
const PLAYER_HEALTH_MAX = 100;
const PLAYER_SHIELD_MAX = 50;
const INVADER_DROP_DISTANCE = 10;
const BULLET_POOL_SIZE = 50;
const BULLET_WIDTH = 9;
const BULLET_HEIGHT = 27;
const POWER_UP_DURATION = 10000;

// Game states
const STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'game_over',
    LEVEL_COMPLETE: 'level_complete'
};
let gameState = STATES.MENU;

// Load images (external URLs for testing)
const heroImage = new Image(); heroImage.src = 'https://i.postimg.cc/1zs46h1m/Untitled-4.png';
const bulletImage = new Image(); bulletImage.src = 'https://i.postimg.cc/3N7LQxsM/Untitled.png';
const invaderImageRow1 = new Image(); invaderImageRow1.src = 'https://i.postimg.cc/Y0GSktY3/Untitled-3.png';
const invaderImageRow0 = new Image(); invaderImageRow0.src = 'https://i.postimg.cc/d1FXw6CS/Untitled-7.png';
const invaderImageRow2 = new Image(); invaderImageRow2.src = 'https://i.postimg.cc/BvTYYFz5/Untitled-6.png';
const invaderImageRow4 = new Image(); invaderImageRow4.src = 'https://i.postimg.cc/50F0Wxwm/Untitled-5.png';
const spaceshipImage = new Image(); spaceshipImage.src = 'https://i.postimg.cc/5yW5KjW8/spaceship.png';
const bossImage = new Image(); bossImage.src = 'https://i.postimg.cc/1tbYJvnk/Untitled-9.png';
const sniperImage = new Image(); sniperImage.src = 'https://i.postimg.cc/J4PZ4Pqn/Untitled-16.png';
const tankImage = new Image(); tankImage.src = 'https://i.postimg.cc/26ZgCqNk/Untitled-18.png';
const powerUpImage = new Image(); powerUpImage.src = 'https://i.postimg.cc/9F4X2nQ3/powerup.png';
const newSpaceshipImage = new Image(); newSpaceshipImage.src = 'https://i.postimg.cc/rpphwDx6/Untitled-15.png';
const level2BossImage = new Image(); level2BossImage.src = 'https://i.postimg.cc/MGKWZm9W/Untitled-17.png';

// Load audio (external URLs for testing)
const shootSound = new Audio('https://www.myinstants.com/media/sounds/shoot.wav');
const level1Music = new Audio('https://drive.google.com/uc?export=download&id=1qSksvQfxhaQ4hBAZHyWO4bX64qGpnPZM');
const level2Music = new Audio('https://drive.google.com/uc?export=download&id=1y7cXpVS1ffXGGS6FdwalBccO8SpvaOxA');
const level3Music1 = new Audio('https://drive.google.com/uc?export=download&id=1U3_Eso5OYwVq7PsX4kfEyqSIXzXcPwyD');
const level3Music2 = new Audio('https://drive.google.com/uc?export=download&id=10m19QiwEAcpxfSwqDrfIMiKymaztFksg');
const musics = [level1Music, level2Music, [level3Music1, level3Music2]];
musics.forEach(m => {
    if (Array.isArray(m)) m.forEach(track => { track.loop = true; track.volume = 0.5; });
    else { m.loop = true; m.volume = 0.5; }
});

function playLevelMusic() {
    musics.forEach(m => Array.isArray(m) ? m.forEach(track => { track.pause(); track.currentTime = 0; }) : (m.pause(), m.currentTime = 0));
    let currentMusic;
    if (level === 3) {
        const trackIndex = Math.floor((wave - 1) / 5) % 2;
        currentMusic = musics[2][trackIndex];
    } else {
        currentMusic = musics[level - 1];
    }
    currentMusic.play()
        .then(() => console.log(`Audio started: Level ${level}, Wave ${wave}`))
        .catch(error => console.error(`Audio error: ${error}`));
}

// Starfield and Nebula setup
const stars = [];
const nebulae = [];
const NUM_STARS = 100;
function createStars() {
    for (let i = 0; i < NUM_STARS; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1
        });
    }
}
function createNebulae() {
    for (let i = 0; i < 5; i++) {
        nebulae.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 50 + 50,
            color: `rgba(${Math.random() * 100 + 155},${Math.random() * 100},${Math.random() * 100 + 155},0.3)`
        });
    }
}
createStars();

// Player (scaled for 800x600 canvas, increased by 33% from 9.6 to 12.77)
const player = {
    x: canvas.width / 2 - 20, // Center, adjusted for 40px width
    y: canvas.height - 57, // Bottom, adjusted for 27px height + 7px padding
    width: 40,
    height: 27,
    speed: 12.77, // Increased 33% from 9.6 (9.6 * 1.33)
    dx: 0,
    health: PLAYER_HEALTH_MAX,
    shield: 0,
    doubleBullets: true,
    rapidFire: false,
    wideShot: false,
    tripleShot: false,
    pierce: false,
    killsWithoutHit: 0,
    powerUpTimer: 0,
    shootCooldown: 0,
    laserPulse: 0,
    laserActive: false,
    laserKills: 0,
    laserDamageInterval: 5,
    currentPowerUp: null
};

// Player Bullets (with pooling, increased by 60% from 8.8 to 14.1)
const bullets = Array(BULLET_POOL_SIZE).fill().map(() => ({
    x: 0, y: 0, width: BULLET_WIDTH, height: BULLET_HEIGHT, active: false, dx: 0, pierced: false
}));
const bulletSpeed = 14.1; // Increased 60% from 8.8 (8.8 * 1.6)
function spawnBullet(x, y, dx = 0) {
    const bullet = bullets.find(b => !b.active);
    if (bullet) {
        bullet.x = x;
        bullet.y = y;
        bullet.active = true;
        bullet.dx = dx;
        bullet.pierced = false;
        shootSound.play();
    }
}

// Invaders (keep speed at 1.2 as previously increased)
const invaders = [];
const invaderRows = 5;
const invaderCols = 10;
const invaderWidth = 40;
const invaderHeight = 15;
const initialInvaderSpeed = 1.2; // Keep as is (from previous 60% increase)
let invaderSpeed = initialInvaderSpeed;
let invaderDirection = 1;
let invaderShootInterval = BASE_INVADER_SHOOT_INTERVAL; // Already adjusted to 110 for 60% faster fire rate

// Stealth Invaders (Level 2, keep speed at 1.92 as previously increased)
const stealthInvaders = [];
const stealthWidth = 30;
const stealthHeight = 20;
const stealthSpeed = 1.92; // Keep as is (from previous 60% increase)

// Sniper Enemy (adjust fire rate by 60%, keep speed at 1.6)
const snipers = [];
const sniperWidth = 80;
const sniperHeight = 80;
const sniperBaseSpeed = 1.6; // Keep as is (from previous 60% increase)
const sniperShootInterval = 150; // Reduced from 240 (60% faster, 240 / 1.6)
const sniperHealth = 4;
let snipersSpawnedThisWave = 0;

// Tank Enemy (adjust fire rate by 60%, keep speed at 0.24)
const tanks = [];
const tankWidth = 60;
const tankHeight = 40;
const tankBaseSpeed = 0.24; // Keep as is (from previous 60% increase)
const tankHealth = 3;
const tankShootInterval = 75; // Reduced from 120 (60% faster, 120 / 1.6)
let tankSpawnedThisWave = false;

// Black Hole Guardian (adjust fire rate by 60%, keep speed at 0.48)
const guardians = [];
const guardianWidth = 50;
const guardianHeight = 50;
const guardianSpeed = 0.48; // Keep as is (from previous 60% increase)
const guardianHealth = 5;
const guardianShootInterval = 50; // Reduced from 80 (60% faster, 80 / 1.6)

// Boss (Spaceship in Wave 3 Level 1 and Level 3 even waves, keep speed at 2.24)
let spaceship = null;
const spaceshipWidth = 80;
const spaceshipHeight = 48;
const spaceshipBossHeight = 154;
const spaceshipBaseSpeed = 2.24; // Keep as is (from previous 60% increase)
const spaceshipBossHealth = 40;
let spaceshipSpawnedThisWave = false;
let bossSpawnCounter = 0;

// Twin Bosses (Level 2 Wave 3 and Level 3 even waves, keep speed at 2.24)
let twinBosses = [];

// Invader Bullets (keep speeds as previously increased, except bulletSpeed updated)
const invaderBullets = [];
const invaderBulletSpeed = 1.2; // Keep as is (from previous 60% increase)
const invaderBulletWidth = 5;
const invaderBulletHeight = 15;
const sniperBulletSpeed = 2.4; // Keep as is (from previous 60% increase)
const tankBulletWidth = 10;
const tankBulletSpeed = 0.64; // Keep as is (from previous 60% increase)
const bossLaserWidth = 8;
const bossLaserHeight = 30;
const bossLaserSpeed = 4.8; // Keep as is (from previous 60% increase)
const guardianBulletWidth = 15;
const guardianBulletHeight = 20;
const guardianBulletSpeed = 1.2; // Keep as is (from previous 60% increase)
let shootTimer = 0;
let enemySpawnTimer = 0;

// Shields (positioned for 800x600)
const shields = [];
let shieldWidth = 90;
const shieldHeight = 20;
const shieldY = canvas.height - 142;

// Power-Up (positioned for 800x600)
let powerUp = null;
const powerUpWidth = 20;
const powerUpHeight = 20;
const powerUpY = canvas.height - 57; // Adjusted for player position

// Environmental Hazards (Level 2 and 3, up to but not including meteor speeds)
const meteors = [];
const shieldMeteors = [];
const blackHoles = [];
const meteorWidth = 20;
const meteorHeight = 20;
const meteorSpeed = 1.2;
const shieldMeteorSpeed = 2.0;
const blackHoleRadius = 40;

// Explosion Particles
const particles = [];
function spawnExplosion(x, y) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x,
            y: y,
            size: Math.random() * 3 + 2,
            dx: (Math.random() - 0.5) * 4,
            dy: (Math.random() - 0.5) * 4,
            alpha: 1,
            life: 30,
            color: Math.random() < 0.5 ? 'red' : 'yellow'
        });
    }
}

// Game variables
let score = 0;
let wave = 1;
let level = 1;
let totalKills = 0;
let invadersDestroyedThisWave = 0;
let scoreMultiplier = 1;
let levelCompleteTimer = 0;
let waveModifier = null;
let showCheatInput = false;
let cheatInput = '';
let laserDroppedThisWave = false;
let level3Kills = 0;

// Wave modifiers for Level 2
const waveModifiers = [
    { name: "Double Speed", effect: () => invaderSpeed *= 2 },
    { name: "Extra Health", effect: () => invaders.forEach(inv => inv.health *= 2) },
    { name: "Rapid Fire", effect: () => invaderShootInterval /= 2 }
];

// Initialize invaders
function createInvaders() {
    invaders.length = 0;
    snipers.length = 0;
    tanks.length = 0;
    stealthInvaders.length = 0;
    guardians.length = 0;
    spaceship = null;
    twinBosses.length = 0;
    meteors.length = 0;
    shieldMeteors.length = 0;
    blackHoles.length = 0;
    laserDroppedThisWave = false;

    if (wave === 3 && level === 1) {
        spaceship = {
            x: canvas.width / 2 - spaceshipWidth / 2,
            y: shieldY / 2 - spaceshipBossHeight / 2,
            width: spaceshipWidth,
            height: spaceshipBossHeight,
            health: spaceshipBossHealth,
            speedX: spaceshipBaseSpeed,
            speedY: spaceshipBaseSpeed,
            isBoss: true
        };
        enemySpawnTimer = 0;
        bossSpawnCounter = 0;
    } else if (wave === 3 && level === 2) {
        twinBosses.push({
            x: canvas.width / 4 - spaceshipWidth / 2,
            y: shieldY / 2 - spaceshipBossHeight / 2,
            width: spaceshipWidth,
            height: spaceshipBossHeight,
            health: 66,
            speedX: spaceshipBaseSpeed,
            speedY: spaceshipBaseSpeed,
            type: 'laser'
        });
        twinBosses.push({
            x: 3 * canvas.width / 4 - spaceshipWidth / 2,
            y: shieldY / 2 - spaceshipBossHeight / 2,
            width: spaceshipWidth,
            height: spaceshipBossHeight,
            health: 44,
            speedX: -spaceshipBaseSpeed,
            speedY: spaceshipBaseSpeed,
            type: 'rapid'
        });
    } else if (level === 3) {
        const baseInvaders = 30;
        const additionalInvaders = (wave - 1) * 5;
        const totalInvaders = baseInvaders + additionalInvaders;
        const rowsNeeded = Math.ceil(totalInvaders / invaderCols);

        for (let row = 0; row < rowsNeeded; row++) {
            for (let col = 0; col < invaderCols; col++) {
                if (invaders.length < totalInvaders) {
                    invaders.push({
                        x: col * (invaderWidth + 10) + 50,
                        y: row * (invaderHeight + 10) + 50,
                        width: invaderWidth,
                        height: invaderHeight,
                        active: true,
                        row: row,
                        health: Math.min(3, 1 + Math.floor(wave / 5)),
                        laserDamageCooldown: 0
                    });
                }
            }
        }
        const stealthRows = Math.floor(wave / 2) + 3;
        for (let row = 0; row < stealthRows; row++) {
            for (let col = 0; col < invaderCols; col++) {
                if (Math.random() < 0.5) {
                    stealthInvaders.push({
                        x: col * (stealthWidth + 10) + 50,
                        y: row * (stealthHeight + 10) + 50,
                        width: stealthWidth,
                        height: stealthHeight,
                        active: true,
                        visible: false,
                        visibilityTimer: 0,
                        health: 2,
                        laserDamageCooldown: 0
                    });
                }
            }
        }
        for (let i = 0; i < Math.min(wave, 5); i++) {
            meteors.push({
                x: Math.random() * canvas.width,
                y: -meteorHeight,
                width: meteorWidth,
                height: meteorHeight,
                speed: meteorSpeed
            });
        }
        for (let i = 0; i < 5 + wave; i++) {
            shieldMeteors.push({
                x: Math.random() * canvas.width,
                y: -meteorHeight,
                width: meteorWidth,
                height: meteorHeight,
                speed: shieldMeteorSpeed
            });
        }
        if (wave % 2 === 0) {
            blackHoles.push({
                x: Math.random() * (canvas.width - blackHoleRadius * 2) + blackHoleRadius,
                y: Math.random() * (shieldY - blackHoleRadius * 2) + blackHoleRadius,
                radius: blackHoleRadius,
                spawned: false
            });
            if (wave % 4 === 2) {
                spaceship = {
                    x: canvas.width / 2 - spaceshipWidth / 2,
                    y: shieldY / 2 - spaceshipBossHeight / 2,
                    width: spaceshipWidth,
                    height: spaceshipBossHeight,
                    health: spaceshipBossHealth,
                    speedX: spaceshipBaseSpeed,
                    speedY: spaceshipBaseSpeed
                };
            } else if (wave % 4 === 0) {
                twinBosses.push({
                    x: canvas.width / 2 - spaceshipWidth / 2,
                    y: shieldY / 2 - spaceshipBossHeight / 2,
                    width: spaceshipWidth,
                    height: spaceshipBossHeight,
                    health: 66,
                    speedX: spaceshipBaseSpeed,
                    speedY: spaceshipBaseSpeed,
                    type: 'laser'
                });
            }
        }
        if (wave === 1) {
            player.rapidFire = true;
            player.currentPowerUp = 'rapid';
        }
    } else if (level === 2) {
        const extraRows = Math.floor(wave / 2);
        for (let row = 0; row < invaderRows + extraRows; row++) {
            for (let col = 0; col < invaderCols; col++) {
                const enemyType = Math.random();
                if (enemyType < 0.5) {
                    invaders.push({
                        x: col * (invaderWidth + 10) + 50,
                        y: row * (invaderHeight + 10) + 50,
                        width: invaderWidth,
                        height: invaderHeight,
                        active: true,
                        row: row,
                        health: wave > 2 ? 3 : 2,
                        laserDamageCooldown: 0
                    });
                } else {
                    stealthInvaders.push({
                        x: col * (stealthWidth + 10) + 50,
                        y: row * (stealthHeight + 10) + 50,
                        width: stealthWidth,
                        height: stealthHeight,
                        active: true,
                        visible: false,
                        visibilityTimer: 0,
                        health: 2,
                        laserDamageCooldown: 0
                    });
                }
            }
        }
        for (let i = 0; i < Math.min(wave, 2); i++) {
            meteors.push({
                x: Math.random() * canvas.width,
                y: -meteorHeight,
                width: meteorWidth,
                height: meteorHeight,
                speed: meteorSpeed
            });
        }
        for (let i = 0; i < 5 + wave * 2; i++) {
            shieldMeteors.push({
                x: Math.random() * canvas.width,
                y: -meteorHeight,
                width: meteorWidth,
                height: meteorHeight,
                speed: shieldMeteorSpeed
            });
        }
        if (wave % 2 === 0) {
            blackHoles.push({
                x: Math.random() * (canvas.width - blackHoleRadius * 2) + blackHoleRadius,
                y: Math.random() * (shieldY - blackHoleRadius * 2) + blackHoleRadius,
                radius: blackHoleRadius,
                spawned: false
            });
        }
        waveModifier = waveModifiers[Math.floor(Math.random() * waveModifiers.length)];
        waveModifier.effect();
    } else {
        const extraRows = wave === 1 ? 3 : Math.floor(wave / 2) + 3;
        for (let row = 0; row < extraRows; row++) {
            for (let col = 0; col < invaderCols; col++) {
                invaders.push({
                    x: col * (invaderWidth + 10) + 50,
                    y: row * (invaderHeight + 10) + 50,
                    width: invaderWidth,
                    height: invaderHeight,
                    active: true,
                    row: row,
                    health: (wave === 2 && invadersDestroyedThisWave > 10) ? 2 : 1,
                    laserDamageCooldown: 0
                });
            }
        }
    }

    invadersDestroyedThisWave = 0;
    spaceshipSpawnedThisWave = false;
    tankSpawnedThisWave = false;
    snipersSpawnedThisWave = 0;
    spawnWavePowerUp();
    invaderSpeed = initialInvaderSpeed * Math.pow(1.15, wave - 1);
    if (level === 3) invaderSpeed *= 1.05;
}

// Initialize shields
function createShields() {
    shields.length = 0;
    const adjustedShieldWidth = level === 2 ? shieldWidth * 0.8 : shieldWidth;
    const spacing = (canvas.width - 5 * adjustedShieldWidth) / 6;
    for (let i = 0; i < 5; i++) {
        shields.push({
            x: spacing + i * (adjustedShieldWidth + spacing),
            y: shieldY,
            width: adjustedShieldWidth,
            height: shieldHeight,
            health: SHIELD_HEALTH_MAX
        });
    }
}

// Reset game
function resetGame() {
    player.x = canvas.width / 2;
    player.dx = 0;
    player.health = PLAYER_HEALTH_MAX;
    player.shield = 0;
    player.doubleBullets = true;
    player.rapidFire = false;
    player.wideShot = false;
    player.tripleShot = false;
    player.pierce = false;
    player.killsWithoutHit = 0;
    player.powerUpTimer = 0;
    player.shootCooldown = 0;
    player.laserPulse = 0;
    player.laserActive = false;
    player.laserKills = 0;
    player.currentPowerUp = null;
    bullets.forEach(b => b.active = false);
    invaderBullets.length = 0;
    particles.length = 0;
    score = 0;
    totalKills = 0;
    scoreMultiplier = 1;
    wave = 1;
    level = 1;
    invaderSpeed = initialInvaderSpeed;
    invaderShootInterval = BASE_INVADER_SHOOT_INTERVAL;
    invaderDirection = 1;
    shootTimer = 0;
    enemySpawnTimer = 0;
    spaceship = null;
    powerUp = null;
    tankSpawnedThisWave = false;
    snipersSpawnedThisWave = 0;
    waveModifier = null;
    laserDroppedThisWave = false;
    level3Kills = 0;
    createInvaders();
    createShields();
}

// Reset game state for new level
function resetGameStateForNewLevel() {
    player.x = canvas.width / 2;
    player.dx = 0;
    player.health = PLAYER_HEALTH_MAX;
    player.shield = (level === 2 || level === 3) ? PLAYER_SHIELD_MAX : 0;
    player.doubleBullets = true;
    player.rapidFire = false;
    player.wideShot = false;
    player.tripleShot = false;
    player.pierce = false;
    player.killsWithoutHit = 0;
    player.powerUpTimer = 0;
    player.shootCooldown = 0;
    player.laserPulse = 0;
    player.laserActive = false;
    player.laserKills = 0;
    player.currentPowerUp = null;
    bullets.forEach(b => b.active = false);
    invaderBullets.length = 0;
    particles.length = 0;
    invadersDestroyedThisWave = 0;
    spaceship = null;
    powerUp = null;
    tankSpawnedThisWave = false;
    snipersSpawnedThisWave = 0;
    waveModifier = null;
    laserDroppedThisWave = false;
    level3Kills = 0;
    wave = 1;
    if (level === 2 || level === 3) createNebulae();
    createInvaders();
    createShields();
    playLevelMusic();
}

// Check if a row is completely destroyed
function isRowDestroyed(row) {
    return invaders.every(invader => invader.row !== row || !invader.active);
}

// Find nearest shield for tank targeting
function findNearestShield(tankX) {
    let nearestShield = null;
    let minDistance = Infinity;
    for (let shield of shields) {
        const distance = Math.abs(tankX - (shield.x + shieldWidth / 2));
        if (distance < minDistance) {
            minDistance = distance;
            nearestShield = shield;
        }
    }
    return nearestShield ? nearestShield.x + shieldWidth / 2 : tankX;
}

// Power-up spawning
function spawnWavePowerUp() {
    if (level === 1) {
        if (wave === 1) {
            powerUp = {
                x: canvas.width / 2 - powerUpWidth / 2,
                y: powerUpY,
                width: powerUpWidth,
                height: powerUpHeight,
                type: 'shieldBoost',
                activate: () => {
                    shields.forEach(shield => shield.health = Math.min(shield.health + 200, SHIELD_HEALTH_MAX));
                    player.currentPowerUp = 'shieldBoost';
                }
            };
        } else if (wave === 2) {
            powerUp = {
                x: canvas.width / 2 - powerUpWidth / 2,
                y: powerUpY,
                width: powerUpWidth,
                height: powerUpHeight,
                type: 'rapid',
                activate: () => {
                    player.rapidFire = true;
                    player.powerUpTimer = POWER_UP_DURATION / 16.67;
                    player.currentPowerUp = 'rapid';
                }
            };
        } else if (wave === 3) {
            powerUp = {
                x: canvas.width / 2 - powerUpWidth / 2,
                y: powerUpY,
                width: powerUpWidth,
                height: powerUpHeight,
                type: 'triple',
                activate: () => {
                    player.tripleShot = true;
                    player.currentPowerUp = 'triple';
                }
            };
        }
    } else if (level === 2) {
        if (wave === 1) {
            powerUp = {
                x: canvas.width / 2 - powerUpWidth / 2,
                y: powerUpY,
                width: powerUpWidth,
                height: powerUpHeight,
                type: 'rapid',
                activate: () => {
                    player.rapidFire = true;
                    player.powerUpTimer = POWER_UP_DURATION / 16.67;
                    player.currentPowerUp = 'rapid';
                }
            };
        } else if (wave === 2) {
            powerUp = {
                x: canvas.width / 2 - powerUpWidth / 2,
                y: powerUpY,
                width: powerUpWidth,
                height: powerUpHeight,
                type: 'wide',
                activate: () => {
                    player.wideShot = true;
                    player.powerUpTimer = POWER_UP_DURATION / 16.67;
                    player.currentPowerUp = 'wide';
                }
            };
        } else if (wave === 3) {
            powerUp = {
                x: canvas.width / 2 - powerUpWidth / 2,
                y: powerUpY,
                width: powerUpWidth,
                height: powerUpHeight,
                type: 'triple',
                activate: () => {
                    player.tripleShot = true;
                    player.currentPowerUp = 'triple';
                }
            };
        }
    } else if (level === 3) {
        if (wave % 2 === 0) {
            const type = Math.random() < 0.5 ? 'shield' : 'health';
            powerUp = {
                x: canvas.width / 2 - powerUpWidth / 2,
                y: powerUpY,
                width: powerUpWidth,
                height: powerUpHeight,
                type: type,
                activate: () => {
                    if (type === 'shield') {
                        player.shield = Math.min(player.shield + 20, PLAYER_SHIELD_MAX);
                    } else {
                        player.health = Math.min(player.health + 20, PLAYER_HEALTH_MAX);
                    }
                }
            };
        } else if (!powerUp) {
            const powerUpTypes = ['rapid', 'triple', 'wide', 'laser', 'pierce'];
            const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
            powerUp = {
                x: canvas.width / 2 - powerUpWidth / 2,
                y: powerUpY,
                width: powerUpWidth,
                height: powerUpHeight,
                type: randomType,
                activate: () => {
                    player.rapidFire = false;
                    player.tripleShot = false;
                    player.wideShot = false;
                    player.laserActive = false;
                    player.pierce = false;
                    if (randomType === 'rapid') {
                        player.rapidFire = true;
                    } else if (randomType === 'triple') {
                        player.tripleShot = true;
                    } else if (randomType === 'wide') {
                        player.wideShot = true;
                    } else if (randomType === 'laser') {
                        player.laserActive = true;
                        player.laserKills = 0;
                    } else if (randomType === 'pierce') {
                        player.pierce = true;
                    }
                    player.currentPowerUp = randomType;
                }
            };
        }
    }
}

// Get bottom-most active invader in each column
function getBottomInvaders() {
    const bottomInvaders = [];
    const columns = {};

    for (let invader of invaders) {
        if (!invader.active) continue;
        const col = Math.floor((invader.x + invader.width / 2) / (invaderWidth + 10));
        if (!columns[col] || invader.y > columns[col].y) {
            columns[col] = invader;
        }
    }

    for (let col in columns) {
        bottomInvaders.push(columns[col]);
    }

    return bottomInvaders;
}

// Update game objects
function update() {
    if (gameState === STATES.LEVEL_COMPLETE) {
        levelCompleteTimer++;
        if (levelCompleteTimer >= LEVEL_COMPLETE_DELAY) {
            levelCompleteTimer = 0;
            console.log(`Level ${level} completed, waiting for player to start Level ${level + 1}`);
        }
        return;
    }

    if (gameState !== STATES.PLAYING) return;

    player.x += player.dx;
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    if (player.powerUpTimer > 0) {
        player.powerUpTimer--;
        if (player.powerUpTimer <= 0 && level !== 3) {
            player.rapidFire = false;
            player.wideShot = false;
            if (!(level === 2 && wave === 3)) player.tripleShot = false;
            player.laserActive = false;
            player.laserKills = 0;
            player.currentPowerUp = null;
        }
    }

    if (player.shootCooldown > 0) player.shootCooldown--;

    if (player.laserActive) player.laserPulse += 0.1;

    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        if (b.active) {
            b.y -= bulletSpeed;
            if (b.dx) b.x += b.dx;
            if (b.y < 0) {
                b.active = false;
                continue;
            }
            for (let j = shields.length - 1; j >= 0; j--) {
                let shield = shields[j];
                if (b.x < shield.x + shield.width &&
                    b.x + b.width > shield.x &&
                    b.y < shield.y + shield.height &&
                    b.y + b.height > shield.y) {
                    b.active = false;
                    break;
                }
            }
        }
    }

    if (player.laserActive) {
        if (player.laserKills >= 15) {
            player.laserActive = false;
            player.laserKills = 0;
            if (level !== 3) player.currentPowerUp = null;
            return;
        }

        let allEnemies = [
            ...invaders.filter(inv => inv.active),
            ...stealthInvaders.filter(stealth => stealth.active)
        ];

        allEnemies.sort((a, b) => a.y - b.y);

        let hitThisFrame = false;
        for (let enemy of allEnemies) {
            if (enemy.x < player.x + player.width / 2 + 5 &&
                enemy.x + enemy.width > player.x + player.width / 2 - 5 &&
                enemy.y < player.y) {
                if (hitThisFrame) break;

                if (enemy.laserDamageCooldown <= 0) {
                    enemy.health -= 1;
                    enemy.laserDamageCooldown = player.laserDamageInterval;
                    hitThisFrame = true;

                    if (enemy.health <= 0) {
                        enemy.active = false;
                        spawnExplosion(enemy.x + (enemy.width || invaderWidth) / 2, enemy.y + (enemy.height || invaderHeight) / 2);
                        totalKills++;
                        player.killsWithoutHit++;
                        player.laserKills++;
                        score += (enemy.width === stealthWidth ? 15 : 10) * scoreMultiplier;
                        invadersDestroyedThisWave++;
                        if (level === 3) level3Kills++;
                        updateScoreMultiplier();
                        updateInvaderAttributes();
                        if (level === 3 && level3Kills >= 25 && !powerUp) {
                            spawnWavePowerUp();
                            level3Kills = 0;
                        }
                    }
                } else {
                    enemy.laserDamageCooldown--;
                }
            }
        }
    }

    if (!(wave === 3 && level === 1)) {
        let reachedEdge = false;
        for (let invader of invaders) {
            if (!invader.active) continue;
            invader.x += invaderSpeed * invaderDirection;
            if (invader.x <= 0 || invader.x + invader.width >= canvas.width) {
                reachedEdge = true;
            }
        }

        if (reachedEdge) {
            invaderDirection *= -1;
            for (let invader of invaders) {
                if (invader.active) invader.y += (level === 3 ? 15 : INVADER_DROP_DISTANCE);
            }
        }
    } else {
        enemySpawnTimer++;
        if (enemySpawnTimer >= ENEMY_SPAWN_DELAY) {
            if (spaceship) {
                ctx.fillStyle = 'yellow';
                ctx.fillRect(spaceship.x + spaceshipWidth / 2 - 10, spaceship.y - 20, 20, 10);
            }
            switch (bossSpawnCounter % 3) {
                case 0:
                    if (invaders.length < 1) {
                        invaders.push({
                            x: Math.random() * (canvas.width - invaderWidth),
                            y: 50,
                            width: invaderWidth,
                            height: invaderHeight,
                            active: true,
                            row: 0,
                            health: 2,
                            speedX: invaderSpeed,
                            speedY: invaderSpeed,
                            laserDamageCooldown: 0
                        });
                    }
                    break;
                case 1:
                    if (snipers.length < 1) {
                        snipers.push({
                            x: Math.random() * (canvas.width - sniperWidth),
                            y: 50,
                            width: sniperWidth,
                            height: sniperHeight,
                            speed: sniperBaseSpeed,
                            direction: 1,
                            shootTimer: 0,
                            speedX: sniperBaseSpeed,
                            speedY: sniperBaseSpeed,
                            health: sniperHealth
                        });
                    }
                    break;
                case 2:
                    if (tanks.length < 1) {
                        tanks.push({
                            x: Math.random() * (canvas.width - tankWidth),
                            y: 50,
                            width: tankWidth,
                            height: tankHeight,
                            health: tankHealth,
                            speed: tankBaseSpeed,
                            shootTimer: 0,
                            targetX: findNearestShield(Math.random() * (canvas.width - tankWidth)),
                            direction: 1,
                            speedX: tankBaseSpeed,
                            speedY: tankBaseSpeed
                        });
                    }
                    break;
            }
            bossSpawnCounter++;
            enemySpawnTimer = 0;
        }

        for (let invader of invaders) {
            if (!invader.active) continue;
            invader.x += invader.speedX;
            invader.y += invader.speedY;
            if (invader.x <= 0 || invader.x + invader.width >= canvas.width) {
                invader.speedX *= -1;
            }
            if (invader.y <= 0 || invader.y + invader.height >= shieldY - invaderHeight) {
                invader.speedY *= -1;
            }
        }
    }

    for (let stealth of stealthInvaders) {
        if (!stealth.active) continue;
        stealth.x += stealthSpeed * invaderDirection;
        stealth.visibilityTimer++;
        if (stealth.visibilityTimer >= 150) {
            stealth.visible = !stealth.visible;
            stealth.visibilityTimer = 0;
        }
        if (stealth.x <= 0 || stealth.x + stealthWidth >= canvas.width) {
            stealth.x = Math.max(0, Math.min(stealth.x, canvas.width - stealthWidth));
            invaderDirection *= -1;
            stealth.y += (level === 3 ? 15 : INVADER_DROP_DISTANCE);
        }
    }

    for (let sniper of snipers) {
        if (wave !== 3 || level !== 1) {
            sniper.x += sniper.speed * sniper.direction;
            if (sniper.x <= 0 || sniper.x + sniperWidth >= canvas.width) {
                sniper.direction *= -1;
            }
        } else {
            sniper.x += sniper.speedX;
            sniper.y += sniper.speedY;
            if (sniper.x <= 0 || sniper.x + sniperWidth >= canvas.width) {
                sniper.speedX *= -1;
            }
            if (sniper.y <= 0 || sniper.y + sniperHeight >= shieldY - sniperHeight) {
                sniper.speedY *= -1;
            }
        }
        sniper.shootTimer++;
        if (sniper.shootTimer >= sniperShootInterval) {
            invaderBullets.push({
                x: sniper.x + sniperWidth / 2 - invaderBulletWidth / 2,
                y: sniper.y + sniperHeight,
                width: invaderBulletWidth,
                height: invaderBulletHeight,
                speed: sniperBulletSpeed,
                tracks: true,
                targetX: player.x + player.width / 2
            });
            sniper.shootTimer = 0;
        }
    }

    for (let tank of tanks) {
        if (wave !== 3 || level !== 1) {
            if (tank.y < shieldY - tankHeight) {
                tank.y += tank.speed;
                tank.x += tank.speed * tank.direction * 2;
                if (tank.x <= 0 || tank.x + tankWidth >= canvas.width) {
                    tank.direction *= -1;
                }
            } else {
                if (tank.x + tankWidth / 2 < tank.targetX) {
                    tank.x += tank.speed;
                } else if (tank.x + tankWidth / 2 > tank.targetX) {
                    tank.x -= tank.speed;
                }
            }
        } else {
            tank.x += tank.speedX;
            tank.y += tank.speedY;
            if (tank.x <= 0 || tank.x + tankWidth >= canvas.width) {
                tank.speedX *= -1;
            }
            if (tank.y <= 0 || tank.y + tankHeight >= shieldY - tankHeight) {
                tank.speedY *= -1;
            }
        }
        tank.shootTimer++;
        if (tank.shootTimer >= tankShootInterval) {
            invaderBullets.push({
                x: tank.x + tankWidth / 2 - tankBulletWidth / 2,
                y: tank.y + tankHeight,
                width: tankBulletWidth,
                height: invaderBulletHeight,
                speed: tankBulletSpeed,
                tracks: false
            });
            tank.shootTimer = 0;
        }
    }

    for (let guardian of guardians) {
        guardian.x += guardian.speed * invaderDirection;
        if (guardian.x <= 0 || guardian.x + guardianWidth >= canvas.width) {
            guardian.x = Math.max(0, Math.min(guardian.x, canvas.width - guardianWidth));
            invaderDirection *= -1;
            guardian.y += (level === 3 ? 15 : INVADER_DROP_DISTANCE);
        }
        guardian.shootTimer++;
        if (guardian.shootTimer >= guardianShootInterval) {
            invaderBullets.push({
                x: guardian.x + guardianWidth / 2 - guardianBulletWidth / 2,
                y: guardian.y + guardianHeight,
                width: guardianBulletWidth,
                height: guardianBulletHeight,
                speed: guardianBulletSpeed,
                tracks: false
            });
            guardian.shootTimer = 0;
        }
    }

    if (spaceship) {
        if (wave === 3 && level === 1) {
            spaceship.x += spaceship.speedX;
            spaceship.y += spaceship.speedY;
            if (spaceship.x <= 0 || spaceship.x + spaceship.width >= canvas.width) {
                spaceship.speedX *= -1;
            }
            if (spaceship.y <= 0 || spaceship.y + spaceship.height >= shieldY - spaceshipBossHeight) {
                spaceship.speedY *= -1;
            }
        } else {
            spaceship.x += spaceship.speedX;
            spaceship.y += spaceship.speedY;
            if (spaceship.x <= 0 || spaceship.x + spaceship.width >= canvas.width) {
                spaceship.speedX *= -1;
            }
            if (spaceship.y <= 0 || spaceship.y + spaceship.height >= shieldY - spaceshipBossHeight) {
                spaceship.speedY *= -1;
            }
        }
    }

    for (let boss of twinBosses) {
        boss.x += boss.speedX;
        boss.y += boss.speedY;
        if (boss.x <= 0 || boss.x + boss.width >= canvas.width) {
            boss.speedX *= -1;
        }
        if (boss.y <= 0 || boss.y + boss.height >= shieldY - boss.height) {
            boss.speedY *= -1;
        }
    }

    for (let i = meteors.length - 1; i >= 0; i--) {
        let meteor = meteors[i];
        meteor.y += meteor.speed;
        if (meteor.y > canvas.height) {
            meteors.splice(i, 1);
            continue;
        }
        for (let j = shields.length - 1; j >= 0; j--) {
            let shield = shields[j];
            if (meteor.x < shield.x + shield.width &&
                meteor.x + meteor.width > shield.x &&
                meteor.y < shield.y + shield.height &&
                meteor.y + meteor.height > shield.y) {
                shield.health -= 50;
                meteors.splice(i, 1);
                if (shield.health <= 0) shields.splice(j, 1);
                break;
            }
        }
        if (i >= 0 && meteor.x < player.x + player.width &&
            meteor.x + meteor.width > player.x &&
            meteor.y < player.y + player.height &&
            meteor.y + meteor.height > player.y) {
            damagePlayer(20);
            meteors.splice(i, 1);
        }
    }

    for (let i = shieldMeteors.length - 1; i >= 0; i--) {
        let meteor = shieldMeteors[i];
        meteor.y += meteor.speed;
        if (meteor.y > shieldY + shieldHeight) {
            shieldMeteors.splice(i, 1);
            continue;
        }
        for (let j = shields.length - 1; j >= 0; j--) {
            let shield = shields[j];
            if (meteor.x < shield.x + shield.width &&
                meteor.x + meteor.width > shield.x &&
                meteor.y < shield.y + shield.height &&
                meteor.y + meteor.height > shield.y) {
                shield.health -= 50;
                shieldMeteors.splice(i, 1);
                if (shield.health <= 0) shields.splice(j, 1);
                break;
            }
        }
    }

    for (let i = blackHoles.length - 1; i >= 0; i--) {
        let bh = blackHoles[i];
        if (!bh.spawned) {
            guardians.push({
                x: bh.x - guardianWidth / 2,
                y: bh.y - guardianHeight / 2,
                width: guardianWidth,
                height: guardianHeight,
                health: guardianHealth,
                speed: guardianSpeed,
                shootTimer: 0
            });
            bh.spawned = true;
            blackHoles.splice(i, 1);
        }
    }

    for (let i = shields.length - 1; i >= 0; i--) {
        let shield = shields[i];
        for (let invader of invaders) {
            if (invader.active &&
                invader.x < shield.x + shield.width &&
                invader.x + invader.width > shield.x &&
                invader.y < shield.y + shield.height &&
                invader.y + invader.height > shield.y) {
                shields.splice(i, 1);
                break;
            }
        }
        for (let sniper of snipers) {
            if (sniper.x < shield.x + shield.width &&
                sniper.x + sniperWidth > shield.x &&
                sniper.y < shield.y + shield.height &&
                sniper.y + sniperHeight > shield.y) {
                shields.splice(i, 1);
                break;
            }
        }
        for (let j = tanks.length - 1; j >= 0; j--) {
            let tank = tanks[j];
            if (tank.x < shield.x + shield.width &&
                tank.x + tankWidth > shield.x &&
                tank.y < shield.y + shield.height &&
                tank.y + tankHeight > shield.y) {
                shields.splice(i, 1);
                if (wave !== 3 || level !== 1) {
                    tank.y = 50;
                    tank.targetX = findNearestShield(tank.x);
                }
                break;
            }
        }
        for (let guardian of guardians) {
            if (guardian.x < shield.x + shield.width &&
                guardian.x + guardianWidth > shield.x &&
                guardian.y < shield.y + shield.height &&
                guardian.y + guardianHeight > shield.y) {
                shields.splice(i, 1);
                break;
            }
        }
        if (spaceship && 
            spaceship.x < shield.x + shield.width &&
            spaceship.x + spaceship.width > shield.x &&
            spaceship.y < shield.y + shield.height &&
            spaceship.y + spaceship.height > shield.y) {
            shields.splice(i, 1);
        }
        for (let boss of twinBosses) {
            if (boss.x < shield.x + shield.width &&
                boss.x + boss.width > shield.x &&
                boss.y < shield.y + shield.height &&
                boss.y + boss.height > shield.y) {
                shields.splice(i, 1);
                break;
            }
        }
    }

    if (!(wave === 3 && (level === 1 || level === 2))) {
        for (let invader of invaders) {
            if (invader.active && invader.y + invaderHeight >= canvas.height) {
                gameState = STATES.GAME_OVER;
                break;
            }
        }
        for (let sniper of snipers) {
            if (sniper.y + sniperHeight >= canvas.height) {
                gameState = STATES.GAME_OVER;
                break;
            }
        }
        for (let guardian of guardians) {
            if (guardian.y + guardianHeight >= canvas.height) {
                gameState = STATES.GAME_OVER;
                break;
            }
        }
        if (spaceship && spaceship.y + spaceshipHeight >= canvas.height) {
            gameState = STATES.GAME_OVER;
        }
    }

    shootTimer++;
    if (shootTimer >= invaderShootInterval) {
        if (wave !== 3 || level !== 1) {
            const bottomInvaders = getBottomInvaders();
            for (let invader of bottomInvaders) {
                if (Math.random() < 0.5) {
                    invaderBullets.push({
                        x: invader.x + invader.width / 2 - invaderBulletWidth / 2,
                        y: invader.y + invader.height,
                        width: invaderBulletWidth,
                        height: invaderBulletHeight,
                        speed: invaderBulletSpeed,
                        tracks: true,
                        targetX: player.x + player.width / 2
                    });
                } else {
                    invaderBullets.push({
                        x: invader.x + invader.width / 2 - invaderBulletWidth / 2,
                        y: invader.y + invader.height,
                        width: invaderBulletWidth,
                        height: invaderBulletHeight,
                        speed: invaderBulletSpeed,
                        tracks: false
                    });
                }
            }
        }
        if (spaceship) {
            if (wave === 3 && level === 1) {
                invaderBullets.push({
                    x: spaceship.x + spaceship.width * 0.25 - bossLaserWidth / 2,
                    y: spaceship.y + spaceship.height,
                    width: bossLaserWidth,
                    height: bossLaserHeight,
                    speed: bossLaserSpeed,
                    tracks: false,
                    isLaser: true
                });
                invaderBullets.push({
                    x: spaceship.x + spaceship.width * 0.75 - bossLaserWidth / 2,
                    y: spaceship.y + spaceship.height,
                    width: bossLaserWidth,
                    height: bossLaserHeight,
                    speed: bossLaserSpeed,
                    tracks: false,
                    isLaser: true
                });
            } else {
                invaderBullets.push({
                    x: spaceship.x + spaceship.width * 0.25 - bossLaserWidth / 2,
                    y: spaceship.y + spaceship.height,
                    width: bossLaserWidth,
                    height: bossLaserHeight,
                    speed: bossLaserSpeed,
                    tracks: false,
                    isLaser: true
                });
                invaderBullets.push({
                    x: spaceship.x + spaceship.width * 0.75 - bossLaserWidth / 2,
                    y: spaceship.y + spaceship.height,
                    width: bossLaserWidth,
                    height: bossLaserHeight,
                    speed: bossLaserSpeed,
                    tracks: false,
                    isLaser: true
                });
            }
        }
        for (let boss of twinBosses) {
            if (boss.type === 'laser') {
                invaderBullets.push({
                    x: boss.x + boss.width / 2 - bossLaserWidth / 2,
                    y: boss.y + boss.height,
                    width: bossLaserWidth,
                    height: bossLaserHeight,
                    speed: bossLaserSpeed,
                    tracks: true,
                    targetX: player.x + player.width / 2,
                    isLaser: true
                });
            } else {
                const bulletCount = twinBosses.length > 1 ? 5 : 3;
                for (let i = 0; i < bulletCount; i++) {
                    invaderBullets.push({
                        x: boss.x + boss.width / 2 - invaderBulletWidth / 2,
                        y: boss.y + boss.height,
                        width: invaderBulletWidth,
                        height: invaderBulletHeight,
                        speed: invaderBulletSpeed + i * 0.2,
                        tracks: false
                    });
                }
            }
        }
        shootTimer = 0;
    }

    for (let i = invaderBullets.length - 1; i >= 0; i--) {
        let ib = invaderBullets[i];
        if (ib.tracks) {
            const dx = ib.targetX - ib.x;
            const dy = canvas.height - ib.y;
            const angle = Math.atan2(dy, dx);
            ib.x += ib.speed * Math.cos(angle);
            ib.y += ib.speed * Math.sin(angle);
        } else {
            ib.y += ib.speed;
        }

        if (ib.y > canvas.height) {
            invaderBullets.splice(i, 1);
            continue;
        }

        for (let j = shields.length - 1; j >= 0; j--) {
            let shield = shields[j];
            if (ib.x < shield.x + shield.width &&
                ib.x + ib.width > shield.x &&
                ib.y < shield.y + shield.height &&
                ib.y + ib.height > shield.y) {
                shield.health -= 10;
                invaderBullets.splice(i, 1);
                if (shield.health <= 0) shields.splice(j, 1);
                break;
            }
        }
        if (i < 0) continue;

        if (ib.x < player.x + player.width &&
            ib.x + ib.width > player.x &&
            ib.y < player.y + player.height &&
            ib.y + ib.height > player.y) {
            damagePlayer(10);
            invaderBullets.splice(i, 1);
        }
    }

    if (powerUp && 
        player.x < powerUp.x + powerUpWidth &&
        player.x + player.width > powerUp.x &&
        player.y < powerUp.y + powerUpHeight &&
        player.y + player.height > powerUp.y) {
        powerUp.activate();
        powerUp = null;
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        if (!b.active) continue;

        let hitCount = 0;
        for (let j = invaders.length - 1; j >= 0 && hitCount < (player.pierce ? 2 : 1); j--) {
            let inv = invaders[j];
            if (inv.active &&
                b.x < inv.x + inv.width &&
                b.x + b.width > inv.x &&
                b.y < inv.y + inv.height &&
                b.y + b.height > inv.y) {
                inv.health--;
                hitCount++;
                if (!player.pierce || hitCount === 2) b.active = false;
                else b.pierced = true;
                if (inv.health <= 0) {
                    inv.active = false;
                    spawnExplosion(inv.x + invaderWidth / 2, inv.y + invaderHeight / 2);
                    totalKills++;
                    player.killsWithoutHit++;
                    score += 10 * scoreMultiplier;
                    invadersDestroyedThisWave++;
                    if (level === 3) level3Kills++;
                    updateScoreMultiplier();
                    updateInvaderAttributes();
                    if (level === 3 && level3Kills >= 25 && !powerUp) {
                        spawnWavePowerUp();
                        level3Kills = 0;
                    }
                }
            }
        }
        if (b.active && hitCount < (player.pierce ? 2 : 1)) {
            for (let j = stealthInvaders.length - 1; j >= 0 && hitCount < (player.pierce ? 2 : 1); j--) {
                let stealth = stealthInvaders[j];
                if (stealth.active && stealth.visible &&
                    b.x < stealth.x + stealth.width &&
                    b.x + b.width > stealth.x &&
                    b.y < stealth.y + stealth.height &&
                    b.y + b.height > stealth.y) {
                    stealth.health--;
                    hitCount++;
                    if (!player.pierce || hitCount === 2) b.active = false;
                    else b.pierced = true;
                    if (stealth.health <= 0) {
                        stealth.active = false;
                        spawnExplosion(stealth.x + stealthWidth / 2, stealth.y + stealthHeight / 2);
                        totalKills++;
                        player.killsWithoutHit++;
                        score += 15 * scoreMultiplier;
                        invadersDestroyedThisWave++;
                        if (level === 3) level3Kills++;
                        updateScoreMultiplier();
                        if (level === 3 && level3Kills >= 25 && !powerUp) {
                            spawnWavePowerUp();
                            level3Kills = 0;
                        }
                    }
                }
            }
        }
        if (b.active && hitCount < (player.pierce ? 2 : 1)) {
            for (let j = snipers.length - 1; j >= 0 && hitCount < (player.pierce ? 2 : 1); j--) {
                let sniper = snipers[j];
                if (b.x < sniper.x + sniperWidth &&
                    b.x + b.width > sniper.x &&
                    b.y < sniper.y + sniperHeight &&
                    b.y + b.height > sniper.y) {
                    sniper.health--;
                    hitCount++;
                    if (!player.pierce || hitCount === 2) b.active = false;
                    else b.pierced = true;
                    if (sniper.health <= 0) {
                        snipers.splice(j, 1);
                        spawnExplosion(sniper.x + sniperWidth / 2, sniper.y + sniperHeight / 2);
                        totalKills++;
                        player.killsWithoutHit++;
                        score += 15 * scoreMultiplier;
                        invadersDestroyedThisWave++;
                        if (level === 3) level3Kills++;
                        updateScoreMultiplier();
                        updateInvaderAttributes();
                        if (level === 3 && level3Kills >= 25 && !powerUp) {
                            spawnWavePowerUp();
                            level3Kills = 0;
                        }
                    }
                }
            }
        }
        if (b.active && hitCount < (player.pierce ? 2 : 1)) {
            for (let j = tanks.length - 1; j >= 0 && hitCount < (player.pierce ? 2 : 1); j--) {
                let tank = tanks[j];
                if (b.x < tank.x + tankWidth &&
                    b.x + b.width > tank.x &&
                    b.y < tank.y + tankHeight &&
                    b.y + b.height > tank.y) {
                    tank.health--;
                    hitCount++;
                    score += 20 * scoreMultiplier;
                    if (!player.pierce || hitCount === 2) b.active = false;
                    else b.pierced = true;
                    if (tank.health <= 0) {
                        tanks.splice(j, 1);
                        spawnExplosion(tank.x + tankWidth / 2, tank.y + tankHeight / 2);
                        totalKills++;
                        player.killsWithoutHit++;
                        score += 30 * scoreMultiplier;
                        invadersDestroyedThisWave++;
                        if (level === 3) level3Kills++;
                        updateScoreMultiplier();
                        if (level === 3 && level3Kills >= 25 && !powerUp) {
                            spawnWavePowerUp();
                            level3Kills = 0;
                        }
                    }
                    updateInvaderAttributes();
                }
            }
        }
        if (b.active && hitCount < (player.pierce ? 2 : 1)) {
            for (let j = guardians.length - 1; j >= 0 && hitCount < (player.pierce ? 2 : 1); j--) {
                let guardian = guardians[j];
                if (b.x < guardian.x + guardianWidth &&
                    b.x + b.width > guardian.x &&
                    b.y < guardian.y + guardianHeight &&
                    b.y + b.height > guardian.y) {
                    guardian.health--;
                    hitCount++;
                    score += 20 * scoreMultiplier;
                    if (!player.pierce || hitCount === 2) b.active = false;
                    else b.pierced = true;
                    if (guardian.health <= 0) {
                        guardians.splice(j, 1);
                        spawnExplosion(guardian.x + guardianWidth / 2, guardian.y + guardianHeight / 2);
                        totalKills++;
                        player.killsWithoutHit++;
                        score += 30 * scoreMultiplier;
                        invadersDestroyedThisWave++;
                        if (level === 3) level3Kills++;
                        updateScoreMultiplier();
                        if (level === 3 && level3Kills >= 25 && !powerUp) {
                            spawnWavePowerUp();
                            level3Kills = 0;
                        }
                    }
                    updateInvaderAttributes();
                }
            }
        }
        if (b.active && spaceship && hitCount < (player.pierce ? 2 : 1)) {
            if (b.x < spaceship.x + spaceship.width &&
                b.x + b.width > spaceship.x &&
                b.y < spaceship.y + spaceship.height &&
                b.y + b.height > spaceship.y) {
                spaceship.health--;
                hitCount++;
                score += 20 * scoreMultiplier;
                if (!player.pierce || hitCount === 2) b.active = false;
                else b.pierced = true;
                if (spaceship.health <= 0) {
                    spawnExplosion(spaceship.x + spaceshipWidth / 2, spaceship.y + spaceship.height);
                    spaceship = null;
                    totalKills++;
                    player.killsWithoutHit++;
                    score += 50 * scoreMultiplier;
                    invadersDestroyedThisWave++;
                    if (level === 3) level3Kills++;
                    updateScoreMultiplier();
                    if (wave === 3 && level === 1) {
                        gameState = STATES.LEVEL_COMPLETE;
                    }
                    updateInvaderAttributes();
                    if (level === 3 && level3Kills >= 25 && !powerUp) {
                        spawnWavePowerUp();
                        level3Kills = 0;
                    }
                }
            }
        }
        if (b.active && hitCount < (player.pierce ? 2 : 1)) {
            for (let j = twinBosses.length - 1; j >= 0 && hitCount < (player.pierce ? 2 : 1); j--) {
                let boss = twinBosses[j];
                if (b.x < boss.x + boss.width &&
                    b.x + b.width > boss.x &&
                    b.y < boss.y + boss.height &&
                    b.y + b.height > boss.y) {
                    boss.health--;
                    hitCount++;
                    score += 25 * scoreMultiplier;
                    if (!player.pierce || hitCount === 2) b.active = false;
                    else b.pierced = true;
                    if (boss.health <= 0) {
                        twinBosses.splice(j, 1);
                        spawnExplosion(boss.x + boss.width / 2, boss.y + boss.height);
                        totalKills++;
                        player.killsWithoutHit++;
                        score += 50 * scoreMultiplier;
                        invadersDestroyedThisWave++;
                        if (level === 3) level3Kills++;
                        updateScoreMultiplier();
                        if (twinBosses.length === 0 && wave === 3 && level === 2) {
                            gameState = STATES.LEVEL_COMPLETE;
                            console.log("Level 2 Wave 3 completed, showing Level Complete screen");
                        }
                        if (level === 3 && level3Kills >= 25 && !powerUp) {
                            spawnWavePowerUp();
                            level3Kills = 0;
                        }
                    }
                }
            }
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.size = p.life > 15 ? p.size + 0.1 : p.size - 0.1;
        p.alpha = p.life / 30;
        p.life--;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }

    // Wave progression
    const activeInvaders = invaders.filter(inv => inv.active).length + stealthInvaders.filter(s => s.active).length;
    const isBossWave = (wave === 3 && (level === 1 || level === 2));
    if (!isBossWave) {
        if (level === 1) {
            if (activeInvaders === 0) {
                wave++;
                console.log(`Advancing to Wave ${wave} in Level ${level}`);
                invadersDestroyedThisWave = 0;
                createInvaders();
            }
        } else if (level === 2 && wave < 3) {
            if (activeInvaders === 0) {
                wave++;
                console.log(`Advancing to Wave ${wave} in Level ${level}`);
                createInvaders();
            }
        } else if (level === 3) {
            const allEnemiesCleared = activeInvaders === 0 && snipers.length === 0 && tanks.length === 0 && guardians.length === 0 && !spaceship && twinBosses.length === 0;
            const level3HazardsCleared = meteors.length === 0 && shieldMeteors.length === 0 && blackHoles.length === 0;
            if (allEnemiesCleared && level3HazardsCleared) {
                wave++;
                console.log(`Advancing to Wave ${wave} in Level ${level}`);
                createInvaders();
            }
        }
    }
}

// Damage player function
function damagePlayer(amount) {
    if (player.shield > 0) {
        player.shield -= amount;
        if (player.shield <= 0) {
            player.shield = 0;
        }
    } else {
        player.health -= amount;
        player.killsWithoutHit = 0;
        scoreMultiplier = 1;
    }
    if (player.health <= 0) {
        gameState = STATES.GAME_OVER;
    }
}

// Update score multiplier
function updateScoreMultiplier() {
    scoreMultiplier = 1 + Math.floor(player.killsWithoutHit / 10);
}

// Update invader attributes
function updateInvaderAttributes() {
    const activeInvaders = invaders.filter(inv => inv.active).length + stealthInvaders.filter(s => s.active).length;
    let waveSpeedIncrease = Math.pow(1.15, wave - 1);
    let baseSpeed = initialInvaderSpeed * waveSpeedIncrease;

    const isBossWave = (wave === 3 && (level === 1 || level === 2));
    if (!isBossWave) {
        let destroyedRows = 0;
        for (let row = invaderRows - 1; row >= 0; row--) {
            if (isRowDestroyed(row)) {
                destroyedRows++;
            } else {
                break;
            }
        }
        let rowSpeedIncrease = Math.pow(1.15, destroyedRows);

        if (activeInvaders <= 5) {
            invaderSpeed = baseSpeed * rowSpeedIncrease * 1.5;
            invaderShootInterval = BASE_INVADER_SHOOT_INTERVAL / 2;
        } else {
            invaderSpeed = baseSpeed * rowSpeedIncrease;
            invaderShootInterval = BASE_INVADER_SHOOT_INTERVAL;
        }

        if (invadersDestroyedThisWave >= 8 && !spaceshipSpawnedThisWave && !spaceship && twinBosses.length === 0 && level !== 3) {
            spaceship = {
                x: 0,
                y: 30,
                width: spaceshipWidth,
                height: spaceshipHeight,
                health: 10,
                speed: spaceshipBaseSpeed * waveSpeedIncrease,
                angle: 0
            };
            spaceshipSpawnedThisWave = true;
        }

        if (invadersDestroyedThisWave === 3 && snipersSpawnedThisWave < 1) {
            snipers.push({
                x: Math.random() * (canvas.width - sniperWidth),
                y: 50,
                width: sniperWidth,
                height: sniperHeight,
                speed: sniperBaseSpeed * waveSpeedIncrease,
                direction: 1,
                shootTimer: 0,
                health: sniperHealth
            });
            snipersSpawnedThisWave++;
        } else if (invadersDestroyedThisWave === 10 && snipersSpawnedThisWave < 2 && level === 2) {
            snipers.push({
                x: Math.random() * (canvas.width - sniperWidth),
                y: 50,
                width: sniperWidth,
                height: sniperHeight,
                speed: sniperBaseSpeed * waveSpeedIncrease,
                direction: 1,
                shootTimer: 0,
                health: sniperHealth
            });
            snipersSpawnedThisWave++;
        }

        if (invadersDestroyedThisWave === 15 && !tankSpawnedThisWave && tanks.length === 0) {
            tanks.push({
                x: Math.random() * (canvas.width - tankWidth),
                y: 50,
                width: tankWidth,
                height: tankHeight,
                health: tankHealth,
                speed: tankBaseSpeed * waveSpeedIncrease,
                shootTimer: 0,
                targetX: findNearestShield(Math.random() * (canvas.width - tankWidth)),
                direction: 1
            });
            tankSpawnedThisWave = true;
        }

        if (level === 2 && invadersDestroyedThisWave === 5 && !player.laserActive && !powerUp && !laserDroppedThisWave) {
            powerUp = {
                x: canvas.width / 2 - powerUpWidth / 2,
                y: powerUpY,
                width: powerUpWidth,
                height: powerUpHeight,
                type: 'laser',
                activate: () => {
                    player.laserActive = true;
                    player.powerUpTimer = POWER_UP_DURATION / 16.67;
                    player.laserKills = 0;
                    laserDroppedThisWave = true;
                    player.currentPowerUp = 'laser';
                }
            };
        }
    }
}

// Draw menu with cheat code button
function drawMenu() {
    ctx.fillStyle = 'white';
    ctx.font = '60px Arial';
    ctx.fillText('Broth Invaders', 200, 300);

    ctx.fillStyle = 'gray';
    ctx.fillRect(300, 400, 200, 50);
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.fillText('Start Game', 330, 435);

    ctx.fillStyle = 'gray';
    ctx.fillRect(300, 460, 200, 50);
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.fillText('Cheat Code', 330, 495);

    if (showCheatInput) {
        ctx.fillStyle = 'white';
        ctx.fillRect(300, 520, 200, 30);
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText(cheatInput, 310, 540);
    }
}

// Draw game over
function drawGameOver() {
    ctx.font = 'bold 60px "Press Start 2P"';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('Broth Invaders', canvas.width / 2, 100);

    ctx.font = '30px "Press Start 2P"';
    ctx.fillText(`Score: ${score}`, canvas.width / 4, 250);
    ctx.fillText(`Kills: ${totalKills}`, canvas.width / 4, 300);
    ctx.fillText(`Wave: ${wave}`, 3 * canvas.width / 4, 250);

    ctx.fillStyle = 'gray';
    ctx.fillRect(300, 440, 200, 50);
    ctx.fillStyle = 'white';
    ctx.font = '20px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.fillText('Main Menu', 330, 475);
}

// Draw level complete
function drawLevelComplete() {
    ctx.font = 'bold 60px "Press Start 2P"';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('Level Complete', canvas.width / 2, canvas.height / 2 - 50);
    ctx.fillStyle = 'gray';
    ctx.fillRect(300, canvas.height / 2 + 50, 200, 50);
    ctx.fillStyle = 'white';
    ctx.font = '20px "Press Start 2P"';
    ctx.fillText(`Start Level ${level + 1}`, 330, canvas.height / 2 + 85);
}

// Draw game objects
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = level === 2 || level === 3 ? '#1a0d2b' : 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (level === 2 || level === 3) {
        for (let nebula of nebulae) {
            ctx.fillStyle = nebula.color;
            ctx.beginPath();
            ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.fillStyle = 'white';
    for (let star of stars) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }

    if (gameState === STATES.MENU) {
        drawMenu();
        return;
    } else if (gameState === STATES.GAME_OVER) {
        drawGameOver();
        return;
    } else if (gameState === STATES.LEVEL_COMPLETE) {
        drawLevelComplete();
        return;
    }

    if (heroImage.complete) {
        ctx.drawImage(heroImage, player.x, player.y, player.width, player.height);
    } else {
        ctx.fillStyle = 'white';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }

    if (player.shield > 0) {
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width, 0, Math.PI * 2);
        ctx.stroke();
    }

    if (player.laserActive) {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 5 + Math.sin(player.laserPulse) * 2;
        ctx.beginPath();
        ctx.moveTo(player.x + player.width / 2, player.y);
        ctx.lineTo(player.x + player.width / 2, 0);
        ctx.stroke();
    }

    for (let b of bullets) {
        if (b.active) {
            if (bulletImage.complete) {
                ctx.drawImage(bulletImage, b.x, b.y, b.width, b.height);
            } else {
                ctx.fillStyle = 'red';
                ctx.fillRect(b.x, b.y, b.width, b.height);
            }
        }
    }

    for (let invader of invaders) {
        if (invader.active) {
            const imageIndex = invader.row % 4;
            if (imageIndex === 0 && invaderImageRow0.complete) {
                ctx.drawImage(invaderImageRow0, invader.x, invader.y, invader.width, invaderHeight);
            } else if (imageIndex === 1 && invaderImageRow1.complete) {
                ctx.drawImage(invaderImageRow1, invader.x, invader.y, invader.width, invaderHeight);
            } else if (imageIndex === 2 && invaderImageRow2.complete) {
                ctx.drawImage(invaderImageRow2, invader.x, invader.y, invader.width, invaderHeight);
            } else if (imageIndex === 3 && invaderImageRow4.complete) {
                ctx.drawImage(invaderImageRow4, invader.x, invader.y, invader.width, invaderHeight);
            } else {
                ctx.fillStyle = 'green';
                ctx.fillRect(invader.x, invader.y, invader.width, invaderHeight);
            }
        }
    }

    for (let stealth of stealthInvaders) {
        if (stealth.active) {
            ctx.fillStyle = stealth.visible ? '#00ffff' : 'rgba(128, 128, 128, 0.3)';
            ctx.fillRect(stealth.x, stealth.y, stealth.width, stealth.height);
        }
    }

        for (let sniper of snipers) {
        if (sniperImage.complete) {
            ctx.drawImage(sniperImage, sniper.x, sniper.y, sniperWidth, sniperHeight);
        } else {
            ctx.fillStyle = 'cyan';
            ctx.fillRect(sniper.x, sniper.y, sniperWidth, sniperHeight);
        }
    }

    for (let tank of tanks) {
        if (tankImage.complete) {
            ctx.drawImage(tankImage, tank.x, tank.y, tankWidth, tankHeight);
        } else {
            ctx.fillStyle = 'brown';
            ctx.fillRect(tank.x, tank.y, tankWidth, tankHeight);
        }
    }

    for (let guardian of guardians) {
        ctx.fillStyle = 'rgba(50, 0, 50, 0.9)';
        ctx.beginPath();
        ctx.arc(guardian.x + guardianWidth / 2, guardian.y + guardianHeight / 2, guardianWidth / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    if (spaceship) {
        if (wave === 3 && level === 1) {
            if (bossImage.complete) {
                ctx.drawImage(bossImage, spaceship.x, spaceship.y, spaceshipWidth, spaceshipBossHeight);
            } else {
                ctx.fillStyle = 'red';
                ctx.fillRect(spaceship.x, spaceship.y, spaceshipWidth, spaceshipBossHeight);
            }
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.fillText(`Boss Health: ${spaceship.health}`, spaceship.x, spaceship.y - 10);
        } else if (newSpaceshipImage.complete) {
            ctx.drawImage(newSpaceshipImage, spaceship.x, spaceship.y, spaceshipWidth, spaceshipBossHeight);
        } else {
            ctx.fillStyle = 'purple';
            ctx.fillRect(spaceship.x, spaceship.y, spaceshipWidth, spaceshipBossHeight);
        }
    }

    for (let boss of twinBosses) {
        if (level2BossImage.complete) {
            ctx.drawImage(level2BossImage, boss.x, boss.y, spaceshipWidth, spaceshipBossHeight);
        } else {
            ctx.fillStyle = boss.type === 'laser' ? 'red' : 'purple';
            ctx.fillRect(boss.x, boss.y, spaceshipWidth, spaceshipBossHeight);
        }
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText(`Health: ${boss.health}`, boss.x, boss.y - 10);
    }
    if (twinBosses.length > 0) {
        const totalBossHealth = twinBosses.reduce((sum, boss) => sum + boss.health, 0);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Boss Health: ${totalBossHealth}`, canvas.width / 2, 30);
    }

    if (powerUp) {
        if (powerUpImage.complete) {
            ctx.drawImage(powerUpImage, powerUp.x, powerUp.y, powerUp.width, powerUp.height);
        } else {
            ctx.fillStyle = powerUp.type === 'rapid' ? 'yellow' :
                           powerUp.type === 'wide' ? 'purple' :
                           powerUp.type === 'shield' ? 'cyan' :
                           powerUp.type === 'health' ? 'green' :
                           powerUp.type === 'triple' ? 'orange' :
                           powerUp.type === 'laser' ? 'red' :
                           powerUp.type === 'pierce' ? 'blue' : 'white';
            ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
        }
    }

    for (let shield of shields) {
        ctx.fillStyle = 'gray';
        ctx.fillRect(shield.x, shield.y, shield.width, shield.height);
        const healthBarWidth = shield.width * 0.8;
        const healthBarHeight = shield.height * 0.4;
        const healthBarX = shield.x + (shield.width - healthBarWidth) / 2;
        const healthBarY = shield.y + (shield.height - healthBarHeight) / 2;
        ctx.fillStyle = 'red';
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        ctx.fillStyle = 'green';
        const healthPercentage = shield.health / SHIELD_HEALTH_MAX;
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
    }

    for (let meteor of meteors) {
        ctx.fillStyle = '#8b4513';
        ctx.beginPath();
        ctx.arc(meteor.x + meteor.width / 2, meteor.y + meteor.height / 2, meteor.width / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    for (let meteor of shieldMeteors) {
        ctx.fillStyle = '#a0522d';
        ctx.beginPath();
        ctx.arc(meteor.x + meteor.width / 2, meteor.y + meteor.height / 2, meteor.width / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    for (let bh of blackHoles) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    for (let ib of invaderBullets) {
        if (ib.isLaser) {
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.moveTo(ib.x + ib.width / 2, ib.y + ib.height * 0.2);
            ctx.lineTo(ib.x + ib.width, ib.y + ib.height * 0.5);
            ctx.lineTo(ib.x + ib.width * 0.8, ib.y + ib.height * 0.7);
            ctx.lineTo(ib.x + ib.width * 0.6, ib.y + ib.height);
            ctx.lineTo(ib.x + ib.width * 0.4, ib.y + ib.height * 0.7);
            ctx.lineTo(ib.x, ib.y + ib.height * 0.5);
            ctx.lineTo(ib.x + ib.width / 2, ib.y + ib.height * 0.2);
            ctx.moveTo(ib.x + ib.width / 2, ib.y);
            ctx.quadraticCurveTo(ib.x + ib.width * 0.8, ib.y - 5, ib.x + ib.width, ib.y + ib.height * 0.2);
            ctx.quadraticCurveTo(ib.x + ib.width * 0.6, ib.y - 10, ib.x + ib.width / 2, ib.y);
            ctx.quadraticCurveTo(ib.x + ib.width * 0.4, ib.y - 10, ib.x, ib.y + ib.height * 0.2);
            ctx.quadraticCurveTo(ib.x + ib.width * 0.2, ib.y - 5, ib.x + ib.width / 2, ib.y);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillStyle = 'yellow';
            ctx.fillRect(ib.x, ib.y, ib.width, ib.height);
        }
    }

    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Multiplier: x${scoreMultiplier}`, 10, 30);
    if (player.currentPowerUp) {
        ctx.fillText(`Power Up: ${player.currentPowerUp}`, 10, 50);
    }
    ctx.fillStyle = 'red';
    ctx.fillRect(10, 95, 100, 10);
    ctx.fillStyle = 'green';
    ctx.fillRect(10, 95, player.health, 10);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText(`Health: ${player.health}`, 10, 105);
    if (player.shield > 0) {
        ctx.fillStyle = 'cyan';
        ctx.fillRect(10, 115, player.shield * 2, 10);
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText(`Shield: ${player.shield}`, 10, 125);
    }
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Score: ${score}`, canvas.width - 10, 30);
    ctx.fillText(`Level: ${level}`, canvas.width - 10, 50);
    ctx.fillText(`Wave: ${wave}`, canvas.width - 10, 70);
    ctx.textAlign = 'left';

    for (let p of particles) {
        if (p.life > 0) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
}

// Controls
document.addEventListener('keydown', (e) => {
    if (gameState === STATES.PLAYING) {
        if (e.key === 'ArrowLeft') player.dx = -player.speed;
        if (e.key === 'ArrowRight') player.dx = player.speed;
        if (e.key === ' ') {
            let maxBullets = player.rapidFire ? 6 : (player.tripleShot ? 5 : (player.wideShot ? 4 : (player.pierce ? 3 : 3)));
            const activeBullets = bullets.filter(b => b.active).length;
            const baseCooldown = level === 3 ? 15 : 30;
            const cooldown = player.rapidFire ? 7 : (level === 2 && wave === 3 ? 5 : (level === 2 ? 7 : baseCooldown));
            if (activeBullets < maxBullets && player.shootCooldown <= 0) {
                if (player.tripleShot) {
                    spawnBullet(player.x + player.width / 2 - BULLET_WIDTH / 2, player.y - BULLET_HEIGHT, -0.5);
                    spawnBullet(player.x + player.width / 2 - BULLET_WIDTH / 2, player.y - BULLET_HEIGHT, 0);
                    spawnBullet(player.x + player.width / 2 - BULLET_WIDTH / 2, player.y - BULLET_HEIGHT, 0.5);
                } else if (player.wideShot) {
                    spawnBullet(player.x + player.width / 2 - BULLET_WIDTH / 2, player.y - BULLET_HEIGHT, 0);
                    spawnBullet(player.x + player.width / 2 - BULLET_WIDTH / 2, player.y - BULLET_HEIGHT, -1);
                    spawnBullet(player.x + player.width / 2 - BULLET_WIDTH / 2, player.y - BULLET_HEIGHT, 1);
                } else {
                    spawnBullet(player.x + player.width / 4 - BULLET_WIDTH / 2, player.y - BULLET_HEIGHT);
                    spawnBullet(player.x + 3 * player.width / 4 - BULLET_WIDTH / 2, player.y - BULLET_HEIGHT);
                }
                player.shootCooldown = cooldown;
            }
        }
    } else if (gameState === STATES.MENU && showCheatInput) {
        if (e.key === 'Enter') {
            if (cheatInput.toLowerCase() === 'marlboro') {
                level = 2;
                wave = 1;
                resetGameStateForNewLevel();
                gameState = STATES.PLAYING;
                showCheatInput = false;
                cheatInput = '';
                console.log("Cheat code 'marlboro' activated, skipping to Level 2 Wave 1");
            } else if (cheatInput.toLowerCase() === 'smoking') {
                level = 3;
                wave = 1;
                resetGameStateForNewLevel();
                gameState = STATES.PLAYING;
                showCheatInput = false;
                cheatInput = '';
                console.log("Cheat code 'smoking' activated, skipping to Level 3 Wave 1 (Endless Mode)");
            } else {
                cheatInput = '';
            }
        } else if (e.key === 'Backspace') {
            cheatInput = cheatInput.slice(0, -1);
        } else if (e.key.length === 1) {
            cheatInput += e.key;
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') player.dx = 0;
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    console.log(`Click at (${clickX}, ${clickY}), State: ${gameState}`);

    if (gameState === STATES.MENU) {
        if (clickX >= 300 && clickX <= 500 && clickY >= 400 && clickY <= 450) {
            gameState = STATES.PLAYING;
            resetGame();
            playLevelMusic();
        } else if (clickX >= 300 && clickX <= 500 && clickY >= 460 && clickY <= 510) {
            showCheatInput = true;
        }
    } else if (gameState === STATES.GAME_OVER) {
        if (clickX >= 300 && clickX <= 500 && clickY >= 440 && clickY <= 490) {
            gameState = STATES.MENU;
            musics.forEach(m => Array.isArray(m) ? m.forEach(track => { track.pause(); track.currentTime = 0; }) : (m.pause(), m.currentTime = 0));
        }
    } else if (gameState === STATES.LEVEL_COMPLETE) {
        if (clickX >= 300 && clickX <= 500 && clickY >= canvas.height / 2 + 50 && clickY <= canvas.height / 2 + 100) {
            level++;
            wave = 1;
            gameState = STATES.PLAYING;
            resetGameStateForNewLevel();
            console.log(`Starting Level ${level} Wave ${wave}`);
        }
    }
});

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Initialize and start
canvas.width = 800;
canvas.height = 600;
resetGame();
gameLoop();
