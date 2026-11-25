// Oink: the 9 elements, who beats who, pig names (keys) and merging.
// Works in the browser (window.OinkElements) and in Node (require).
(function (root) {
  // The first 8 go in a circle: each one beats only the next one. Common beats nothing and nothing beats it.
  const ELEMENTS = [
    { id: 'fire', name: 'Fire', icon: '🔥', color: '#ff6b3d' },
    { id: 'ice', name: 'Ice', icon: '❄️', color: '#a5e8ff' },
    { id: 'plant', name: 'Plant', icon: '🌿', color: '#51cf66' },
    { id: 'rock', name: 'Rock', icon: '🪨', color: '#b08d6a' },
    { id: 'air', name: 'Air', icon: '🌪️', color: '#dfe8f0' },
    { id: 'electric', name: 'Electric', icon: '⚡', color: '#ffd43b' },
    { id: 'dark', name: 'Dark', icon: '🌑', color: '#9775fa' },
    { id: 'water', name: 'Water', icon: '💧', color: '#4dabf7' },
    { id: 'common', name: 'Common', icon: '⚪', color: '#f4a6b8' },
  ];
  const CIRCLE = ELEMENTS.slice(0, 8).map(e => e.id);
  const BY_ID = Object.fromEntries(ELEMENTS.map(e => [e.id, e]));
  const ORDER = ELEMENTS.map(e => e.id);
  const MAX_ELEMENTS = 3;
  const MEGA = 'megaboar';

  function beats(a, b) {
    const i = CIRCLE.indexOf(a), j = CIRCLE.indexOf(b);
    if (i < 0 || j < 0) return false;
    return (i + 1) % CIRCLE.length === j;
  }

  // A pig's key is its elements in circle order joined with "+", so fire+water and water+fire are the same pig.
  function pigKey(ids) {
    return [...new Set(ids)].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).join('+');
  }
  const keyElements = key => key === MEGA ? [] : key.split('+');

  function allPigKeys() {
    const out = [];
    const pick = (start, chosen, size) => {
      if (chosen.length === size) { out.push(chosen.join('+')); return; }
      for (let i = start; i < ORDER.length; i++) pick(i + 1, [...chosen, ORDER[i]], size);
    };
    for (let size = 1; size <= MAX_ELEMENTS; size++) pick(0, [], size);
    return out;
  }

  // Merge two pigs: the new pig has all the elements of both. More than 3 is not allowed (null).
  function mergeKey(a, b) {
    const ids = new Set([...keyElements(a), ...keyElements(b)]);
    return ids.size > MAX_ELEMENTS ? null : pigKey([...ids]);
  }

  const pigLabel = key => key === MEGA ? '🐗' : keyElements(key).map(id => BY_ID[id].icon).join('');
  const pigName = key => key === MEGA ? 'Mega Boar' : keyElements(key).map(id => BY_ID[id].name).join('-');

  const api = { ELEMENTS, CIRCLE, BY_ID, MAX_ELEMENTS, MEGA, beats, pigKey, keyElements, allPigKeys, mergeKey, pigLabel, pigName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OinkElements = api;
})(this);
