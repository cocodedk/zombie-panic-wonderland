// A module hook that loads test/fake-three.js wherever the code imports 'three'.

export async function resolve(specifier, context, next) {
  if (specifier === 'three') return { url: new URL('./fake-three.js', import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
}
