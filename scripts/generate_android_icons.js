const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputLogo = 'C:/Users/binit/.gemini/antigravity/brain/6c90c6e3-8054-4ac4-a887-9be705067f35/.user_uploaded/media_1788787971445.png';
const resDir = path.join(__dirname, '../android/app/src/main/res');

// Mipmap launcher icons
const mipmapDensities = [
  { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
  { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
  { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
  { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
  { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
];

async function generate() {
  console.log('Generating Android icons and assets from:', inputLogo);

  // 1. Generate Mipmap legacy & round icons (full icon)
  for (const item of mipmapDensities) {
    const targetDir = path.join(resDir, item.dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Standard ic_launcher.png (scaled to fit nicely with tiny padding)
    const iconBuffer = await sharp(inputLogo)
      .resize(item.size, item.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(targetDir, 'ic_launcher.png'), iconBuffer);
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_round.png'), iconBuffer);

    // Adaptive ic_launcher_foreground.png:
    // Android adaptive icon guideline: foreground is 108dp, but safe zone / content is center 72dp (~66.6%)
    // If the logo fills around 72% of fgSize, it fits perfectly inside circular & squircle masks without being clipped.
    const innerBadgeSize = Math.round(item.fgSize * 0.72);
    const badgeResized = await sharp(inputLogo)
      .resize(innerBadgeSize, innerBadgeSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    const fgCanvas = await sharp({
      create: {
        width: item.fgSize,
        height: item.fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{
        input: badgeResized,
        gravity: 'center'
      }])
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(targetDir, 'ic_launcher_foreground.png'), fgCanvas);
    console.log(`Generated ${item.dir} (size: ${item.size}x${item.size}, fg: ${item.fgSize}x${item.fgSize})`);
  }

  // 2. Splash screens
  // Background: #0A2540 (PARAKH Brand Navy)
  const splashConfigs = [
    { dir: 'drawable', file: 'splash.png', width: 480, height: 800, logoSize: 220 },
    { dir: 'drawable-port-mdpi', file: 'splash.png', width: 320, height: 480, logoSize: 160 },
    { dir: 'drawable-port-hdpi', file: 'splash.png', width: 480, height: 800, logoSize: 220 },
    { dir: 'drawable-port-xhdpi', file: 'splash.png', width: 720, height: 1280, logoSize: 340 },
    { dir: 'drawable-port-xxhdpi', file: 'splash.png', width: 960, height: 1600, logoSize: 460 },
    { dir: 'drawable-port-xxxhdpi', file: 'splash.png', width: 1280, height: 1920, logoSize: 580 },
    { dir: 'drawable-land-mdpi', file: 'splash.png', width: 480, height: 320, logoSize: 160 },
    { dir: 'drawable-land-hdpi', file: 'splash.png', width: 800, height: 480, logoSize: 220 },
    { dir: 'drawable-land-xhdpi', file: 'splash.png', width: 1280, height: 720, logoSize: 320 },
    { dir: 'drawable-land-xxhdpi', file: 'splash.png', width: 1600, height: 960, logoSize: 420 },
    { dir: 'drawable-land-xxxhdpi', file: 'splash.png', width: 1920, height: 1280, logoSize: 520 },
  ];

  for (const s of splashConfigs) {
    const targetDir = path.join(resDir, s.dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const resizedLogo = await sharp(inputLogo)
      .resize(s.logoSize, s.logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: {
        width: s.width,
        height: s.height,
        channels: 4,
        background: { r: 10, g: 37, b: 64, alpha: 1 } // #0A2540
      }
    })
      .composite([{
        input: resizedLogo,
        gravity: 'center'
      }])
      .png()
      .toFile(path.join(targetDir, s.file));

    console.log(`Generated splash for ${s.dir}/${s.file} (${s.width}x${s.height})`);
  }

  // 3. Save to public/
  const publicDir = path.join(__dirname, '../public');
  fs.copyFileSync(inputLogo, path.join(publicDir, 'logo.png'));
  console.log('Copied logo to public/logo.png');

  await sharp(inputLogo).resize(192, 192).toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(inputLogo).resize(512, 512).toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Created icon-192.png and icon-512.png in public/');

  console.log('All icons and splash screens generated successfully!');
}

generate().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
