const singularFolder = import.meta.glob('/image/*.{jpg,jpeg,png,webp,avif,gif,JPG,JPEG,PNG,WEBP,AVIF,GIF}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const pluralFolder = import.meta.glob('/images/*.{jpg,jpeg,png,webp,avif,gif,JPG,JPEG,PNG,WEBP,AVIF,GIF}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const imageSources = Object.entries({ ...singularFolder, ...pluralFolder })
  .sort(([a], [b]) => a.localeCompare(b, 'fr'))
  .map(([path, url]) => ({
    path,
    url,
    name: path.split('/').pop(),
  }));

if (typeof window !== 'undefined') {
  window.__RACHEL_IMAGE_COUNT__ = imageSources.length;
}
