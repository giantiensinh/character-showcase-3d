export type CharacterId = 'anime' | 'cow';

export type CharacterDef = {
  id: CharacterId;
  name: string;
  file: string;
  index: string;
  exposure: number;
  envIntensity: number;
  cameraPadding: number;
  height: number;
};

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'anime',
    name: 'Anime Girl',
    file: `${import.meta.env.BASE_URL}models/anime-girl.glb`,
    index: '01',
    exposure: 1.05,
    envIntensity: 0.35,
    cameraPadding: 1.6,
    height: 1.75,
  },
  {
    id: 'cow',
    name: 'Cow Girl',
    file: `${import.meta.env.BASE_URL}models/cow-girl.glb`,
    index: '02',
    exposure: 0.95,
    envIntensity: 0.35,
    cameraPadding: 1.6,
    height: 1.75,
  },
];
