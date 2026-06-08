import { reactive, watch } from 'vue';
import type {
  AppData,
  Character,
  CharacterAppearance,
  CharacterProfileField,
  CharacterVersion,
  CharacterVersionData,
  Chapter,
  BodyDraft,
  Episode,
  LineMemo,
  NovelProject,
  OpeningIdea,
  Tag,
  PostStylePreset,
  ProfileFieldInputType,
  Relationship,
  Scene,
  Term,
  TermVersion,
  TermVersionData,
  WorkPlot,
} from '../types/models';
import { createId, nowIso } from '../utils/id';

const STORAGE_KEY = 'novel-writing-tool-data-v1';
const GENRE_TAG_TYPE = 'ジャンルタグ';
const MAX_DELETED_ITEMS_PER_PROJECT = 30;
const legacyTagTypeMap: Record<string, string> = {
  キャラタグ: '人物タグ',
  物語タグ: 'シナリオタグ',
};
const defaultProjectTags = [
  ['主人公', '人物タグ', '#8b6f47'],
  ['ヒロイン', '人物タグ', '#8b6f47'],
  ['ライバル', '人物タグ', '#8b6f47'],
  ['仲間', '人物タグ', '#8b6f47'],
  ['敵', '人物タグ', '#8b6f47'],
  ['敵対', '関係タグ', '#6f3f3f'],
  ['師弟', '関係タグ', '#6f3f3f'],
  ['幼馴染', '関係タグ', '#6f3f3f'],
  ['相棒', '関係タグ', '#6f3f3f'],
  ['不穏', '雰囲気タグ', '#4b3d5a'],
  ['切ない', '雰囲気タグ', '#4b3d5a'],
  ['コメディ', '雰囲気タグ', '#4f6b42'],
  ['伏線', 'シナリオタグ', '#7a5c24'],
  ['回収', 'シナリオタグ', '#7a5c24'],
  ['再会', 'シナリオタグ', '#7a5c24'],
  ['戦闘', 'シナリオタグ', '#7a5c24'],
] as const;

const defaultCharacterProfileFields: Array<{
  fieldKey: string;
  label: string;
  section: string;
  inputType: ProfileFieldInputType;
  selectOptions?: string[];
  defaultHidden?: boolean;
}> = [
  { fieldKey: 'alias', label: '二つ名 / 異名', section: '基本情報', inputType: 'text', defaultHidden: true },
  { fieldKey: 'race', label: '種族', section: '基本情報', inputType: 'text', defaultHidden: true },
  { fieldKey: 'gender', label: '性別', section: '基本情報', inputType: 'text' },
  { fieldKey: 'age', label: '年齢', section: '基本情報', inputType: 'number' },
  { fieldKey: 'birthday', label: '誕生日', section: '基本情報', inputType: 'text' },
  { fieldKey: 'height', label: '身長', section: '基本情報', inputType: 'number' },
  { fieldKey: 'weight', label: '体重', section: '基本情報', inputType: 'number' },
  { fieldKey: 'affiliation', label: '所属', section: '基本情報', inputType: 'text' },
  { fieldKey: 'origin', label: '出身地', section: '基本情報', inputType: 'text' },
  { fieldKey: 'role', label: '物語上の役割', section: '人物像', inputType: 'text' },
  
  { fieldKey: 'personality', label: '性格', section: '人物像', inputType: 'textarea' },
  { fieldKey: 'goal', label: '目的', section: '人物像', inputType: 'textarea' },
  { fieldKey: 'behaviorPrinciple', label: '行動原理', section: '人物像', inputType: 'textarea' },
  { fieldKey: 'likes', label: '好きなもの', section: '人物像', inputType: 'textarea' },
  { fieldKey: 'dislikes', label: '苦手なもの', section: '人物像', inputType: 'textarea' },
  { fieldKey: 'secret', label: '秘密', section: '人物像', inputType: 'textarea' },

  { fieldKey: 'battleStyle', label: '特技', section: '能力', inputType: 'textarea' },
  { fieldKey: 'weapon', label: '使用武器', section: '能力', inputType: 'text', defaultHidden: true },
  { fieldKey: 'magic', label: '使用能力 / 魔法', section: '能力', inputType: 'textarea', defaultHidden: true },
  { fieldKey: 'skill', label: '技能', section: '能力', inputType: 'textarea' },
  { fieldKey: 'weakness', label: '弱点', section: '能力', inputType: 'textarea' },

  { fieldKey: 'firstPerson', label: '一人称', section: '話し方', inputType: 'text' },
  { fieldKey: 'secondPerson', label: '二人称', section: '話し方', inputType: 'text' },
  { fieldKey: 'speechStyle', label: '口調', section: '話し方', inputType: 'textarea' },

  { fieldKey: 'appearance', label: '外見概要', section: '外見', inputType: 'textarea' },
  { fieldKey: 'hairStyle', label: '髪型', section: '外見', inputType: 'text' },
  { fieldKey: 'hairColor', label: '髪色', section: '外見', inputType: 'text' },
  { fieldKey: 'eyeColor', label: '目の色', section: '外見', inputType: 'text' },
  { fieldKey: 'build', label: '体格', section: '外見', inputType: 'text' },
  { fieldKey: 'clothing', label: '服装', section: '外見', inputType: 'textarea' },
  { fieldKey: 'equipment', label: '装備', section: '外見', inputType: 'textarea' },

  { fieldKey: 'memo', label: 'メモ', section: 'その他', inputType: 'textarea' },
];
const profileSectionOrder = ['基本情報', '人物像', '能力', '話し方', '外見', 'その他'] as const;
const profileSectionOrderMap = new Map<string, number>(profileSectionOrder.map((section, index) => [section, index]));

const defaultGenreTags = [
  ['異世界ファンタジー', 'ファンタジー', '#486f9f'],
  ['ハイファンタジー', 'ファンタジー', '#486f9f'],
  ['ローファンタジー', 'ファンタジー', '#486f9f'],
  ['現代ファンタジー', 'ファンタジー', '#486f9f'],
  ['ダークファンタジー', 'ファンタジー', '#486f9f'],
  ['和風ファンタジー', 'ファンタジー', '#486f9f'],
  ['剣と魔法', 'ファンタジー', '#486f9f'],
  ['魔法学園', 'ファンタジー', '#486f9f'],
  ['追放もの', 'ファンタジー', '#486f9f'],
  ['悪役令嬢', 'ファンタジー', '#486f9f'],
  ['聖女', 'ファンタジー', '#486f9f'],
  ['転生', 'ファンタジー', '#486f9f'],
  ['転移', 'ファンタジー', '#486f9f'],
  ['恋愛', '現代・人間関係', '#b65f7b'],
  ['現代恋愛', '現代・人間関係', '#b65f7b'],
  ['異世界恋愛', '現代・人間関係', '#b65f7b'],
  ['ラブコメ', '現代・人間関係', '#b65f7b'],
  ['ヒューマンドラマ', '現代・人間関係', '#4f8f76'],
  ['青春', '現代・人間関係', '#4f8f76'],
  ['現代ドラマ', '現代・人間関係', '#4f8f76'],
  ['コメディ', '現代・人間関係', '#b58a3a'],
  ['お仕事', '現代・人間関係', '#4f8f76'],
  ['家族', '現代・人間関係', '#4f8f76'],
  ['日常', '現代・人間関係', '#4f8f76'],
  ['SF', 'ジャンル小説', '#5c72a8'],
  ['スペースオペラ', 'ジャンル小説', '#5c72a8'],
  ['サイバーパンク', 'ジャンル小説', '#5c72a8'],
  ['ディストピア', 'ジャンル小説', '#5c72a8'],
  ['タイムリープ', 'ジャンル小説', '#5c72a8'],
  ['ミステリー', 'ジャンル小説', '#6b5f91'],
  ['サスペンス', 'ジャンル小説', '#6b5f91'],
  ['推理', 'ジャンル小説', '#6b5f91'],
  ['ホラー', 'ジャンル小説', '#7d4c57'],
  ['怪談', 'ジャンル小説', '#7d4c57'],
  ['オカルト', 'ジャンル小説', '#7d4c57'],
  ['歴史', 'ジャンル小説', '#8a6d45'],
  ['時代小説', 'ジャンル小説', '#8a6d45'],
  ['戦記', 'ジャンル小説', '#8a6d45'],
  ['冒険', 'アクション・バトル', '#8a5b3d'],
  ['バトル', 'アクション・バトル', '#8a5b3d'],
  ['アクション', 'アクション・バトル', '#8a5b3d'],
  ['ダンジョン', 'アクション・バトル', '#8a5b3d'],
  ['VRゲーム', 'アクション・バトル', '#8a5b3d'],
  ['スポーツ', 'アクション・バトル', '#8a5b3d'],
  ['ライト文芸', '文体・読後感', '#6f7775'],
  ['文芸', '文体・読後感', '#6f7775'],
  ['純文学', '文体・読後感', '#6f7775'],
  ['群像劇', '文体・読後感', '#6f7775'],
  ['短編', '文体・読後感', '#6f7775'],
  ['連作短編', '文体・読後感', '#6f7775'],
  ['その他', 'その他', '#6f7775'],
];

const genreTagDescriptions: Record<string, string> = {
  '異世界ファンタジー': '別世界を舞台にした冒険や成長の物語。',
  'ハイファンタジー': '独自の世界観や歴史を中心に描く本格ファンタジー。',
  'ローファンタジー': '現実に近い世界へ幻想要素が入り込む物語。',
  '現代ファンタジー': '現代社会を舞台に魔法や異能を扱う物語。',
  'ダークファンタジー': '重い運命、残酷さ、不穏さを含むファンタジー。',
  '和風ファンタジー': '和風の文化、妖怪、神話、時代感を使う物語。',
  '剣と魔法': '剣士、魔法使い、冒険者などを中心にした王道ファンタジー。',
  '魔法学園': '魔法を学ぶ学校や訓練環境を中心にした物語。',
  '追放もの': '追放や失脚から再起、逆転、成長へ進む物語。',
  '悪役令嬢': '悪役令嬢ポジションの人物を中心にした恋愛や逆転劇。',
  '聖女': '聖女、神託、癒やし、信仰などを軸にした物語。',
  '転生': '別の人物や世界に生まれ変わる設定の物語。',
  '転移': '元の姿のまま別世界や別時代へ移動する物語。',
  '恋愛': '恋愛感情や関係の変化を中心に描く物語。',
  '現代恋愛': '現代社会を舞台にした恋愛物語。',
  '異世界恋愛': '異世界や王侯貴族社会を舞台にした恋愛物語。',
  'ラブコメ': '恋愛とコメディの掛け合いを中心にした物語。',
  'ヒューマンドラマ': '人間関係、感情、人生の変化を中心に描く物語。',
  '青春': '学生時代や若者の成長、友情、恋を描く物語。',
  '現代ドラマ': '現代の日常や社会を舞台にした人物中心の物語。',
  'コメディ': '笑いや軽快なやり取りを中心にした物語。',
  'お仕事': '職業、職場、専門仕事を中心にした物語。',
  '家族': '家族関係や家庭内の変化を中心にした物語。',
  '日常': '大事件よりも日々の出来事や空気感を描く物語。',
  'SF': '科学技術、未来、宇宙、仮説設定を扱う物語。',
  'スペースオペラ': '宇宙規模の冒険、戦争、政治劇を描くSF。',
  'サイバーパンク': '高度技術と荒廃した社会を描く近未来SF。',
  'ディストピア': '管理社会や抑圧的な未来を描く物語。',
  'タイムリープ': '時間の巻き戻りや繰り返しを軸にした物語。',
  'ミステリー': '謎や事件の真相解明を中心にした物語。',
  'サスペンス': '緊張感や危機、心理的な追い詰めを中心にした物語。',
  '推理': '手がかりから論理的に真相へ迫る物語。',
  'ホラー': '恐怖、不安、怪異を中心にした物語。',
  '怪談': '語り継がれる怪異や不思議な体験を扱う物語。',
  'オカルト': '超常現象、儀式、都市伝説などを扱う物語。',
  '歴史': '過去の時代や史実を背景にした物語。',
  '時代小説': '特定の時代風俗や社会を舞台にした物語。',
  '戦記': '戦争、軍略、国家間の争いを中心にした物語。',
  '冒険': '未知の土地や目的地へ進む旅と挑戦の物語。',
  'バトル': '戦闘や能力のぶつかり合いを中心にした物語。',
  'アクション': '動き、危機、逃走、戦闘などを見せ場にした物語。',
  'ダンジョン': '迷宮探索、攻略、宝探しを中心にした物語。',
  'VRゲーム': '仮想現実ゲームやオンライン世界を舞台にした物語。',
  'スポーツ': '競技、チーム、勝敗、成長を中心にした物語。',
  'ライト文芸': '読みやすさと人間ドラマを重視した一般寄りの物語。',
  '文芸': '文章表現や人物の内面を重視した物語。',
  '純文学': 'テーマ性、文体、内面描写を強く重視した物語。',
  '群像劇': '複数人物の視点や関係が絡み合う物語。',
  '短編': '短い尺で一つの着想や変化を描く物語。',
  '連作短編': '独立した短編同士が共通世界や人物でつながる形式。',
  'その他': '既存分類に当てはめにくい物語。',
};

const defaultData = (): AppData => ({
  projects: [],
  characters: [],
  tags: [],
  terms: [],
  relationships: [],
  workPlots: [],
  chapters: [],
  episodes: [],
  scenes: [],
  characterAppearances: [],
  postStylePresets: [],
  openingIdeas: [],
  bodyDrafts: [],
  lineMemos: [],
});

function loadData(): AppData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultData();
  try {
    return { ...defaultData(), ...JSON.parse(raw) };
  } catch {
    return defaultData();
  }
}

export const dataStore = reactive<AppData>(loadData());
type DeletedSnapshotBase = {
  trashId: string;
  deletedAt: string;
  projectId?: string;
};

type DeletedProjectSnapshot = {
  kind: 'project';
  label: string;
  projectIndex: number;
  project: NovelProject;
  characters: Character[];
  tags: Tag[];
  terms: Term[];
  relationships: Relationship[];
  workPlots: WorkPlot[];
  chapters: Chapter[];
  episodes: Episode[];
  scenes: Scene[];
  characterAppearances: CharacterAppearance[];
  postStylePresets: PostStylePreset[];
  openingIdeas: OpeningIdea[];
  bodyDrafts: BodyDraft[];
  lineMemos: LineMemo[];
} & DeletedSnapshotBase;

type DeletedCharacterSnapshot = {
  kind: 'character';
  label: string;
  characterIndex: number;
  character: Character;
  relationships: Relationship[];
  characterAppearances: CharacterAppearance[];
  episodes: Array<{ id: string; characterIds: string[] }>;
  scenes: Array<{ id: string; characterIds: string[] }>;
  openingIdeas: Array<{ id: string; usedCharacterIds: string[] }>;
} & DeletedSnapshotBase;

type DeletedTagSnapshot = {
  kind: 'tag';
  label: string;
  tagIndex: number;
  tag: Tag;
  characters: Array<{ id: string; tagIds: string[] }>;
  terms: Array<{ id: string; relatedTagIds: string[] }>;
  relationships: Array<{ id: string; tagIds: string[] }>;
  episodes: Array<{ id: string; tagIds: string[] }>;
  scenes: Array<{ id: string; tagIds: string[] }>;
  openingIdeas: Array<{ id: string; usedTagIds: string[] }>;
  projects: Array<{ id: string; genreTagId?: string; genreTagIds?: string[]; genre: string }>;
} & DeletedSnapshotBase;

type DeletedTermSnapshot = {
  kind: 'term';
  label: string;
  termIndex: number;
  term: Term;
  openingIdeas: Array<{ id: string; usedTermIds: string[] }>;
} & DeletedSnapshotBase;

type DeletedProfileFieldSnapshot = {
  kind: 'profileField';
  label: string;
  projectId: string;
  fieldIndex: number;
  field: CharacterProfileField;
} & DeletedSnapshotBase;

type DeletedRelationshipSnapshot = {
  kind: 'relationship';
  label: string;
  projectId: string;
  relationshipIndex: number;
  relationship: Relationship;
} & DeletedSnapshotBase;

type DeletedChapterSnapshot = {
  kind: 'chapter';
  label: string;
  projectId: string;
  chapterIndex: number;
  chapter: Chapter;
  episodes: Episode[];
  scenes: Scene[];
} & DeletedSnapshotBase;

type DeletedEpisodeSnapshot = {
  kind: 'episode';
  label: string;
  projectId: string;
  episodeIndex: number;
  episode: Episode;
  scenes: Scene[];
} & DeletedSnapshotBase;

type DeletedSceneSnapshot = {
  kind: 'scene';
  label: string;
  projectId: string;
  sceneIndex: number;
  scene: Scene;
} & DeletedSnapshotBase;

type DeletedSnapshot =
  | DeletedProjectSnapshot
  | DeletedCharacterSnapshot
  | DeletedTagSnapshot
  | DeletedTermSnapshot
  | DeletedProfileFieldSnapshot
  | DeletedRelationshipSnapshot
  | DeletedChapterSnapshot
  | DeletedEpisodeSnapshot
  | DeletedSceneSnapshot;

export const transientStore = reactive<{
  deletedItems: DeletedSnapshot[];
}>({
  deletedItems: [],
});

function cloneValue<T>(value: T): T {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeProfileFieldInputType(inputType?: string): ProfileFieldInputType {
  if (inputType === 'input') return 'text';
  if (inputType === 'textarea' || inputType === 'number' || inputType === 'select' || inputType === 'text') return inputType;
  return 'textarea';
}

export function compareCharacterProfileFields(a: CharacterProfileField, b: CharacterProfileField) {
  const aSection = a.section || 'その他';
  const bSection = b.section || 'その他';
  const aSectionOrder = profileSectionOrderMap.get(aSection) ?? Number.MAX_SAFE_INTEGER;
  const bSectionOrder = profileSectionOrderMap.get(bSection) ?? Number.MAX_SAFE_INTEGER;
  if (aSectionOrder !== bSectionOrder) return aSectionOrder - bSectionOrder;

  if (a.order !== b.order) return a.order - b.order;
  if (a.source !== b.source) return a.source === 'default' ? -1 : 1;
  return a.label.localeCompare(b.label, 'ja');
}

function createDeletedSnapshotBase(): DeletedSnapshotBase {
  return {
    trashId: createId(),
    deletedAt: nowIso(),
  };
}

function pushDeletedSnapshot(snapshot: DeletedSnapshot) {
  transientStore.deletedItems.unshift(snapshot);
  const targetProjectId = snapshot.projectId ?? '__global__';
  let keptCount = 0;
  transientStore.deletedItems = transientStore.deletedItems.filter((item) => {
    const itemProjectId = item.projectId ?? '__global__';
    if (itemProjectId !== targetProjectId) return true;
    keptCount += 1;
    return keptCount <= MAX_DELETED_ITEMS_PER_PROJECT;
  });
}

function dedupeProjectTags() {
  const seenKeys = new Set<string>();
  dataStore.tags = dataStore.tags.filter((tag) => {
    const key = `${tag.projectId}::${tag.type}::${tag.name}`;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  const defaultOrder = new Map(defaultProjectTags.map(([name, type], index) => [`${type}::${name}`, index]));
  dataStore.tags.sort((a, b) => {
    if (a.projectId !== b.projectId) return a.projectId.localeCompare(b.projectId);
    const aOrder = defaultOrder.get(`${a.type}::${a.name}`);
    const bOrder = defaultOrder.get(`${b.type}::${b.name}`);
    if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
    if (aOrder !== undefined) return -1;
    if (bOrder !== undefined) return 1;
    return a.name.localeCompare(b.name, 'ja');
  });
}

function dedupeWorkPlots() {
  const seenProjectIds = new Set<string>();
  dataStore.workPlots = dataStore.workPlots.filter((workPlot) => {
    if (seenProjectIds.has(workPlot.projectId)) return false;
    seenProjectIds.add(workPlot.projectId);
    return true;
  });
}

dataStore.projects.forEach((project) => {
  ensureWorkPlot(project.id);
  ensureProjectTitleTag(project.id, project.title);
  ensureDefaultTags(project.id);
  ensureDefaultGenreTags(project.id);
  ensureDefaultCharacterProfileFields(project);
  ensureEpisodeChapters(project.id);
});
dedupeWorkPlots();
dataStore.characters.forEach((character) => {
  ensureCharacterVersions(character);
  applyActiveCharacterVersion(character);
});
dataStore.terms.forEach((term) => {
  ensureTermVersions(term);
  applyActiveTermVersion(term);
});
dataStore.scenes.forEach((scene) => {
  scene.openingText ??= '';
});
dataStore.tags.forEach((tag) => {
  if ((tag.status as string) === 'deleted') tag.status = 'hidden';
  if (legacyTagTypeMap[tag.type]) tag.type = legacyTagTypeMap[tag.type];
});
dedupeProjectTags();

watch(
  dataStore,
  () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataStore));
  },
  { deep: true }
);

export function createProject(title = '新しい作品'): NovelProject {
  const now = nowIso();
  const project: NovelProject = {
    id: createId(),
    title,
    genre: '',
    genreTagId: undefined,
    genreTagIds: [],
    characterProfileFields: [],
    summary: '',
    memo: '',
    createdAt: now,
    updatedAt: now,
  };
  dataStore.projects.unshift(project);
  ensureWorkPlot(project.id);
  ensureDefaultTags(project.id);
  ensureProjectTitleTag(project.id, project.title);
  ensureDefaultGenreTags(project.id);
  ensureDefaultCharacterProfileFields(project);
  createDefaultPostStyles(project.id);
  return project;
}

export function createCharacterSnapshot(character: Character | CharacterVersionData): CharacterVersionData {
  return {
    name: character.name,
    ruby: character.ruby,
    alias: character.alias,
    age: character.age,
    gender: character.gender,
    birthday: character.birthday,
    race: character.race,
    affiliation: character.affiliation,
    origin: character.origin,
    height: character.height,
    weight: character.weight,
    role: character.role,
    personality: character.personality,
    goal: character.goal,
    behaviorPrinciple: character.behaviorPrinciple,
    likes: character.likes,
    dislikes: character.dislikes,
    weakness: character.weakness,
    secret: character.secret,
    battleStyle: character.battleStyle,
    weapon: character.weapon,
    magic: character.magic,
    firstPerson: character.firstPerson,
    secondPerson: character.secondPerson,
    speechStyle: character.speechStyle,
    skill: character.skill,
    appearance: character.appearance,
    hairStyle: character.hairStyle,
    hairColor: character.hairColor,
    eyeColor: character.eyeColor,
    build: character.build,
    clothing: character.clothing,
    equipment: character.equipment,
    tagIds: [...(character.tagIds ?? [])],
    memo: character.memo,
    customFields: (character.customFields ?? []).map((field) => ({ ...field })),
  };
}

export function applyCharacterSnapshot(character: Character, snapshot: CharacterVersionData) {
  character.name = snapshot.name;
  character.ruby = snapshot.ruby;
  character.alias = snapshot.alias;
  character.age = snapshot.age;
  character.gender = snapshot.gender;
  character.birthday = snapshot.birthday;
  character.race = snapshot.race;
  character.affiliation = snapshot.affiliation;
  character.origin = snapshot.origin;
  character.height = snapshot.height;
  character.weight = snapshot.weight;
  character.role = snapshot.role;
  character.personality = snapshot.personality;
  character.goal = snapshot.goal;
  character.behaviorPrinciple = snapshot.behaviorPrinciple;
  character.likes = snapshot.likes;
  character.dislikes = snapshot.dislikes;
  character.weakness = snapshot.weakness;
  character.secret = snapshot.secret;
  character.battleStyle = snapshot.battleStyle;
  character.weapon = snapshot.weapon;
  character.magic = snapshot.magic;
  character.firstPerson = snapshot.firstPerson;
  character.secondPerson = snapshot.secondPerson;
  character.speechStyle = snapshot.speechStyle;
  character.skill = snapshot.skill;
  character.appearance = snapshot.appearance;
  character.hairStyle = snapshot.hairStyle;
  character.hairColor = snapshot.hairColor;
  character.eyeColor = snapshot.eyeColor;
  character.build = snapshot.build;
  character.clothing = snapshot.clothing;
  character.equipment = snapshot.equipment;
  character.tagIds = [...snapshot.tagIds];
  character.memo = snapshot.memo;
  character.customFields = snapshot.customFields.map((field) => ({ ...field }));
}

function findCharacterActiveVersion(character: Character) {
  return character.versions?.find((version) => version.id === character.activeVersionId) ?? character.versions?.[0];
}

function applyActiveCharacterVersion(character: Character) {
  const activeVersion = findCharacterActiveVersion(character);
  if (!activeVersion) return;
  applyCharacterSnapshot(character, activeVersion);
  character.updatedAt = activeVersion.updatedAt;
}

export function getCharacterActiveVersion(character: Character) {
  return findCharacterActiveVersion(character);
}

export function syncCharacterActiveVersion(character: Character) {
  ensureCharacterVersions(character);
  const activeVersion = findCharacterActiveVersion(character);
  if (!activeVersion) return;
  const snapshot = createCharacterSnapshot(character);
  activeVersion.name = snapshot.name;
  activeVersion.ruby = snapshot.ruby;
  activeVersion.alias = snapshot.alias;
  activeVersion.age = snapshot.age;
  activeVersion.gender = snapshot.gender;
  activeVersion.birthday = snapshot.birthday;
  activeVersion.race = snapshot.race;
  activeVersion.affiliation = snapshot.affiliation;
  activeVersion.origin = snapshot.origin;
  activeVersion.height = snapshot.height;
  activeVersion.weight = snapshot.weight;
  activeVersion.role = snapshot.role;
  activeVersion.personality = snapshot.personality;
  activeVersion.goal = snapshot.goal;
  activeVersion.behaviorPrinciple = snapshot.behaviorPrinciple;
  activeVersion.likes = snapshot.likes;
  activeVersion.dislikes = snapshot.dislikes;
  activeVersion.weakness = snapshot.weakness;
  activeVersion.secret = snapshot.secret;
  activeVersion.battleStyle = snapshot.battleStyle;
  activeVersion.weapon = snapshot.weapon;
  activeVersion.magic = snapshot.magic;
  activeVersion.firstPerson = snapshot.firstPerson;
  activeVersion.secondPerson = snapshot.secondPerson;
  activeVersion.speechStyle = snapshot.speechStyle;
  activeVersion.skill = snapshot.skill;
  activeVersion.appearance = snapshot.appearance;
  activeVersion.hairStyle = snapshot.hairStyle;
  activeVersion.hairColor = snapshot.hairColor;
  activeVersion.eyeColor = snapshot.eyeColor;
  activeVersion.build = snapshot.build;
  activeVersion.clothing = snapshot.clothing;
  activeVersion.equipment = snapshot.equipment;
  activeVersion.tagIds = [...snapshot.tagIds];
  activeVersion.memo = snapshot.memo;
  activeVersion.customFields = snapshot.customFields.map((field) => ({ ...field }));
  activeVersion.updatedAt = character.updatedAt;
}

export function ensureCharacterVersions(character: Character) {
  character.versions ??= [];

  if (!character.versions.length) {
    const now = character.updatedAt || nowIso();
    const version: CharacterVersion = {
      id: createId(),
      createdAt: now,
      updatedAt: now,
      ...createCharacterSnapshot(character),
    };
    character.versions.push(version);
    character.activeVersionId = version.id;
    return;
  }

  character.versions.forEach((version) => {
    version.tagIds ??= [];
    version.customFields ??= [];
    version.tagIds = [...version.tagIds];
    version.customFields = version.customFields.map((item) => ({ ...item }));
  });

  character.activeVersionId ??= character.versions[0].id;
  if (!findCharacterActiveVersion(character)) character.activeVersionId = character.versions[0].id;
}

export function createTermSnapshot(term: Term | TermVersionData): TermVersionData {
  return {
    name: term.name,
    ruby: term.ruby,
    category: term.category,
    description: term.description,
    shortDescription: term.shortDescription,
    firstEpisodeId: term.firstEpisodeId,
    firstSceneId: term.firstSceneId,
    relatedCharacterIds: [...(term.relatedCharacterIds ?? [])],
    relatedPlotIds: [...(term.relatedPlotIds ?? [])],
    relatedTagIds: [...(term.relatedTagIds ?? [])],
    spoilerInfo: term.spoilerInfo,
    publicInfo: term.publicInfo,
    memo: term.memo,
  };
}

export function applyTermSnapshot(term: Term, snapshot: TermVersionData) {
  term.name = snapshot.name;
  term.ruby = snapshot.ruby;
  term.category = snapshot.category;
  term.description = snapshot.description;
  term.shortDescription = snapshot.shortDescription;
  term.firstEpisodeId = snapshot.firstEpisodeId;
  term.firstSceneId = snapshot.firstSceneId;
  term.relatedCharacterIds = [...snapshot.relatedCharacterIds];
  term.relatedPlotIds = [...snapshot.relatedPlotIds];
  term.relatedTagIds = [...snapshot.relatedTagIds];
  term.spoilerInfo = snapshot.spoilerInfo;
  term.publicInfo = snapshot.publicInfo;
  term.memo = snapshot.memo;
}

function findTermActiveVersion(term: Term) {
  return term.versions?.find((version) => version.id === term.activeVersionId) ?? term.versions?.[0];
}

function applyActiveTermVersion(term: Term) {
  const activeVersion = findTermActiveVersion(term);
  if (!activeVersion) return;
  applyTermSnapshot(term, activeVersion);
  term.updatedAt = activeVersion.updatedAt;
}

export function getTermActiveVersion(term: Term) {
  return findTermActiveVersion(term);
}

export function syncTermActiveVersion(term: Term) {
  ensureTermVersions(term);
  const activeVersion = findTermActiveVersion(term);
  if (!activeVersion) return;
  const snapshot = createTermSnapshot(term);
  activeVersion.name = snapshot.name;
  activeVersion.ruby = snapshot.ruby;
  activeVersion.category = snapshot.category;
  activeVersion.description = snapshot.description;
  activeVersion.shortDescription = snapshot.shortDescription;
  activeVersion.firstEpisodeId = snapshot.firstEpisodeId;
  activeVersion.firstSceneId = snapshot.firstSceneId;
  activeVersion.relatedCharacterIds = [...snapshot.relatedCharacterIds];
  activeVersion.relatedPlotIds = [...snapshot.relatedPlotIds];
  activeVersion.relatedTagIds = [...snapshot.relatedTagIds];
  activeVersion.spoilerInfo = snapshot.spoilerInfo;
  activeVersion.publicInfo = snapshot.publicInfo;
  activeVersion.memo = snapshot.memo;
  activeVersion.updatedAt = term.updatedAt;
}

export function ensureTermVersions(term: Term) {
  term.relatedCharacterIds ??= [];
  term.relatedPlotIds ??= [];
  term.relatedTagIds ??= [];
  term.versions ??= [];

  if (!term.versions.length) {
    const now = term.updatedAt || nowIso();
    const version: TermVersion = {
      id: createId(),
      createdAt: now,
      updatedAt: now,
      ...createTermSnapshot(term),
    };
    term.versions.push(version);
    term.activeVersionId = version.id;
    return;
  }

  term.versions.forEach((version) => {
    version.relatedCharacterIds ??= [];
    version.relatedPlotIds ??= [];
    version.relatedTagIds ??= [];
    version.relatedCharacterIds = [...version.relatedCharacterIds];
    version.relatedPlotIds = [...version.relatedPlotIds];
    version.relatedTagIds = [...version.relatedTagIds];
  });

  term.activeVersionId ??= term.versions[0].id;
  if (!findTermActiveVersion(term)) term.activeVersionId = term.versions[0].id;
}

export function createTermVersion(term: Term) {
  ensureTermVersions(term);
  const activeVersion = findTermActiveVersion(term);
  if (!activeVersion) return undefined;

  const now = nowIso();
  const sourceSnapshot = createTermSnapshot(activeVersion);
  const newVersion: TermVersion = {
    id: createId(),
    createdAt: now,
    updatedAt: now,
    ...sourceSnapshot,
    baseSnapshot: sourceSnapshot,
  };

  term.versions?.push(newVersion);
  term.activeVersionId = newVersion.id;
  applyTermSnapshot(term, sourceSnapshot);
  term.updatedAt = now;
  return newVersion;
}

export function activateTermVersion(term: Term, versionId: string) {
  ensureTermVersions(term);
  const version = term.versions?.find((item) => item.id === versionId);
  if (!version) return;
  term.activeVersionId = versionId;
  applyActiveTermVersion(term);
  term.updatedAt = nowIso();
}

export function isTermVersionChanged(version: TermVersion) {
  if (!version.baseSnapshot) return false;
  return JSON.stringify(createTermSnapshot(version)) !== JSON.stringify(version.baseSnapshot);
}

export function createCharacterVersion(character: Character) {
  ensureCharacterVersions(character);
  const activeVersion = findCharacterActiveVersion(character);
  if (!activeVersion) return undefined;

  const now = nowIso();
  const sourceSnapshot = createCharacterSnapshot(activeVersion);
  const newVersion: CharacterVersion = {
    id: createId(),
    createdAt: now,
    updatedAt: now,
    ...sourceSnapshot,
    baseSnapshot: sourceSnapshot,
  };

  character.versions?.push(newVersion);
  character.activeVersionId = newVersion.id;
  applyCharacterSnapshot(character, sourceSnapshot);
  character.updatedAt = now;
  return newVersion;
}

export function activateCharacterVersion(character: Character, versionId: string) {
  ensureCharacterVersions(character);
  const version = character.versions?.find((item) => item.id === versionId);
  if (!version) return;
  character.activeVersionId = versionId;
  applyActiveCharacterVersion(character);
  character.updatedAt = nowIso();
}

export function deleteCharacterVersion(character: Character, versionId: string) {
  ensureCharacterVersions(character);
  if (!character.versions?.length || character.versions.length <= 1) return false;

  const deleteIndex = character.versions.findIndex((item) => item.id === versionId);
  if (deleteIndex < 0) return false;

  character.versions.splice(deleteIndex, 1);

  const nextVersion =
    character.versions[deleteIndex]
    ?? character.versions[deleteIndex - 1]
    ?? character.versions[0];

  if (!nextVersion) return false;

  character.activeVersionId = nextVersion.id;
  applyActiveCharacterVersion(character);
  character.updatedAt = nowIso();
  return true;
}

export function isCharacterVersionChanged(version: CharacterVersion) {
  if (!version.baseSnapshot) return false;
  return JSON.stringify(createCharacterSnapshot(version)) !== JSON.stringify(version.baseSnapshot);
}

export function ensureDefaultCharacterProfileFields(project: NovelProject) {
  project.characterProfileFields ??= [];
  const defaultFieldKeys = new Set(defaultCharacterProfileFields.map((field) => field.fieldKey));
  project.characterProfileFields = project.characterProfileFields.filter((field) => {
    if (field.source !== 'default') return true;
    return !!field.fieldKey && defaultFieldKeys.has(field.fieldKey);
  });

  project.characterProfileFields.forEach((field, index) => {
    field.source ??= 'user';
    field.status ??= 'active';
    field.inputType = normalizeProfileFieldInputType(field.inputType);
    field.selectOptions = (field.selectOptions ?? []).map((option) => option.trim()).filter(Boolean);
    field.order ??= index + 1;
  });

  defaultCharacterProfileFields.forEach((field, index) => {
    const existing = project.characterProfileFields?.find((item) => item.source === 'default' && item.fieldKey === field.fieldKey);
    if (existing) {
      existing.label = field.label;
      existing.section = field.section;
      existing.inputType = field.inputType;
      existing.selectOptions = field.selectOptions ?? [];
      existing.order = index + 1;
      existing.status ??= 'active';
      if (field.defaultHidden) existing.status = 'hidden';
      return;
    }

    const profileField: CharacterProfileField = {
      id: createId(),
      label: field.label,
      section: field.section,
      order: index + 1,
      source: 'default',
      status: field.defaultHidden ? 'hidden' : 'active',
      fieldKey: field.fieldKey,
      inputType: field.inputType,
      selectOptions: field.selectOptions ?? [],
    };
    project.characterProfileFields?.push(profileField);
  });
}

export function updateProjectTitle(projectId: string, title: string) {
  const project = getProject(projectId);
  if (!project) return;

  project.title = title;
  project.updatedAt = nowIso();
  ensureProjectTitleTag(projectId, title);
}

export function ensureProjectTitleTag(projectId: string, title: string) {
  const normalizedTitle = title.trim() || '無題の作品';
  const existing = dataStore.tags.find((tag) => tag.projectId === projectId && tag.source === 'default' && tag.type === '作品タグ');

  if (existing) {
    existing.name = normalizedTitle;
    existing.color = '#2f6f6a';
    existing.status = 'active';
    existing.memo = '';
    return existing;
  }

  const tag: Tag = {
    id: createId(),
    projectId,
    name: normalizedTitle,
    type: '作品タグ',
    color: '#2f6f6a',
    memo: '',
    source: 'default',
    status: 'active',
  };
  dataStore.tags.unshift(tag);
  return tag;
}

export function ensureDefaultGenreTags(projectId: string) {
  defaultGenreTags.forEach(([name, category, color]) => {
    const memo = genreTagDescriptions[name] ?? '';
    const existing = dataStore.tags.find((tag) => tag.projectId === projectId && tag.type === GENRE_TAG_TYPE && tag.name === name);
    if (existing) {
      existing.memo = memo;
      return;
    }

    const tag: Tag = {
      id: createId(),
      projectId,
      name,
      type: GENRE_TAG_TYPE,
      category,
      color,
      memo,
      source: 'default',
      status: 'active',
    };
    dataStore.tags.push(tag);
  });
}

export function updateProjectGenre(projectId: string, tagId: string) {
  const project = getProject(projectId);
  const tag = dataStore.tags.find((item) => item.id === tagId && item.projectId === projectId && item.type === GENRE_TAG_TYPE);
  if (!project || !tag) return;

  project.genreTagId = tag.id;
  project.genreTagIds = [tag.id];
  project.genre = tag.name;
  project.updatedAt = nowIso();
}

export function toggleProjectGenre(projectId: string, tagId: string) {
  const project = getProject(projectId);
  const tag = dataStore.tags.find((item) => item.id === tagId && item.projectId === projectId && item.type === GENRE_TAG_TYPE);
  if (!project || !tag) return;

  const currentIds = project.genreTagIds?.length
    ? project.genreTagIds
    : project.genreTagId
      ? [project.genreTagId]
      : [];
  project.genreTagIds = currentIds.includes(tagId)
    ? currentIds.filter((id) => id !== tagId)
    : [...currentIds, tagId];
  project.genreTagId = project.genreTagIds[0];
  project.genre = dataStore.tags
    .filter((item) => project.genreTagIds?.includes(item.id))
    .map((item) => item.name)
    .join('、');
  project.updatedAt = nowIso();
}

export function createDefaultTags(projectId: string) {
  defaultProjectTags.forEach(([name, type, color]) => {
    const tag: Tag = {
      id: createId(),
      projectId,
      name,
      type,
      color,
      memo: '',
      source: 'default',
      status: 'active',
    };
    dataStore.tags.push(tag);
  });
}

export function ensureDefaultTags(projectId: string) {
  defaultProjectTags.forEach(([name, type, color]) => {
    const existing = dataStore.tags.find((tag) => tag.projectId === projectId && tag.name === name && tag.type === type);
    if (existing) {
      existing.color = color;
      existing.source ??= 'default';
      existing.status ??= 'active';
      return;
    }

    dataStore.tags.push({
      id: createId(),
      projectId,
      name,
      type,
      color,
      memo: '',
      source: 'default',
      status: 'active',
    });
  });

  dedupeProjectTags();
}

export function createDefaultPostStyles(projectId: string) {
  const styles: Omit<PostStylePreset, 'id' | 'projectId'>[] = [
    { name: '小説家になろう向け', platform: '小説家になろう', lineBreakLevel: 4, sentenceLength: 'short', dialogueAmount: 4, descriptionAmount: 2, hookStrength: 5, rubyEnabled: true, memo: '' },
    { name: 'カクヨム向け', platform: 'カクヨム', lineBreakLevel: 3, sentenceLength: 'medium', dialogueAmount: 3, descriptionAmount: 3, hookStrength: 4, rubyEnabled: true, memo: '' },
    { name: '原稿用', platform: '原稿用', lineBreakLevel: 1, sentenceLength: 'medium', dialogueAmount: 2, descriptionAmount: 4, hookStrength: 3, rubyEnabled: true, memo: '' },
  ];
  styles.forEach((style) => dataStore.postStylePresets.push({ id: createId(), projectId, ...style }));
}

export function getProject(projectId: string) {
  return dataStore.projects.find((p) => p.id === projectId);
}

export function getWorkPlot(projectId: string) {
  return dataStore.workPlots.find((workPlot) => workPlot.projectId === projectId);
}

export function ensureWorkPlot(projectId: string) {
  const existing = getWorkPlot(projectId);
  if (existing) {
    existing.middleEvents ??= [];
    return existing;
  }

  const workPlot: WorkPlot = {
    id: createId(),
    projectId,
    theme: '',
    beginning: '',
    climax: '',
    ending: '',
    protagonistStart: '',
    protagonistEnd: '',
    mainMystery: '',
    finalTruth: '',
    foreshadowing: '',
    memo: '',
    middleEvents: [],
  };
  dataStore.workPlots.push(workPlot);
  return workPlot;
}

function createFallbackChapter(projectId: string, title = '未分類の章') {
  const chapters = dataStore.chapters.filter((chapter) => chapter.projectId === projectId);
  const chapter: Chapter = {
    id: createId(),
    projectId,
    number: chapters.length + 1,
    title,
    purpose: '',
    flow: '',
    memo: '',
  };
  dataStore.chapters.push(chapter);
  return chapter;
}

export function ensureEpisodeChapters(projectId: string) {
  const orphanEpisodes = dataStore.episodes.filter((episode) => episode.projectId === projectId && !episode.chapterId);
  if (!orphanEpisodes.length) return;

  const fallbackChapter = dataStore.chapters.find((chapter) => chapter.projectId === projectId && chapter.title === '未分類の章')
    ?? createFallbackChapter(projectId, '未分類の章');

  orphanEpisodes.forEach((episode) => {
    episode.chapterId = fallbackChapter.id;
  });
}

function removeIdFromList(list: string[] | undefined, id: string) {
  return (list ?? []).filter((item) => item !== id);
}

export function deleteProject(projectId: string) {
  const projectIndex = dataStore.projects.findIndex((project) => project.id === projectId);
  const project = dataStore.projects[projectIndex];
  if (!project) return;

  pushDeletedSnapshot({
    ...createDeletedSnapshotBase(),
    projectId,
    kind: 'project',
    label: project.title,
    projectIndex,
    project: cloneValue(project),
    characters: cloneValue(dataStore.characters.filter((character) => character.projectId === projectId)),
    tags: cloneValue(dataStore.tags.filter((tag) => tag.projectId === projectId)),
    terms: cloneValue(dataStore.terms.filter((term) => term.projectId === projectId)),
    relationships: cloneValue(dataStore.relationships.filter((relationship) => relationship.projectId === projectId)),
    workPlots: cloneValue(dataStore.workPlots.filter((workPlot) => workPlot.projectId === projectId)),
    chapters: cloneValue(dataStore.chapters.filter((chapter) => chapter.projectId === projectId)),
    episodes: cloneValue(dataStore.episodes.filter((episode) => episode.projectId === projectId)),
    scenes: cloneValue(dataStore.scenes.filter((scene) => scene.projectId === projectId)),
    characterAppearances: cloneValue(dataStore.characterAppearances.filter((appearance) => appearance.projectId === projectId)),
    postStylePresets: cloneValue(dataStore.postStylePresets.filter((preset) => preset.projectId === projectId)),
    openingIdeas: cloneValue(dataStore.openingIdeas.filter((idea) => idea.projectId === projectId)),
    bodyDrafts: cloneValue(dataStore.bodyDrafts.filter((draft) => draft.projectId === projectId)),
    lineMemos: cloneValue(dataStore.lineMemos.filter((memo) => memo.projectId === projectId)),
  });

  dataStore.projects = dataStore.projects.filter((project) => project.id !== projectId);
  dataStore.characters = dataStore.characters.filter((character) => character.projectId !== projectId);
  dataStore.tags = dataStore.tags.filter((tag) => tag.projectId !== projectId);
  dataStore.terms = dataStore.terms.filter((term) => term.projectId !== projectId);
  dataStore.relationships = dataStore.relationships.filter((relationship) => relationship.projectId !== projectId);
  dataStore.workPlots = dataStore.workPlots.filter((workPlot) => workPlot.projectId !== projectId);
  dataStore.chapters = dataStore.chapters.filter((chapter) => chapter.projectId !== projectId);
  dataStore.episodes = dataStore.episodes.filter((episode) => episode.projectId !== projectId);
  dataStore.scenes = dataStore.scenes.filter((scene) => scene.projectId !== projectId);
  dataStore.characterAppearances = dataStore.characterAppearances.filter((appearance) => appearance.projectId !== projectId);
  dataStore.postStylePresets = dataStore.postStylePresets.filter((preset) => preset.projectId !== projectId);
  dataStore.openingIdeas = dataStore.openingIdeas.filter((idea) => idea.projectId !== projectId);
  dataStore.bodyDrafts = dataStore.bodyDrafts.filter((draft) => draft.projectId !== projectId);
  dataStore.lineMemos = dataStore.lineMemos.filter((memo) => memo.projectId !== projectId);
}

export function deleteCharacter(characterId: string) {
  const characterIndex = dataStore.characters.findIndex((character) => character.id === characterId);
  const character = dataStore.characters[characterIndex];
  if (!character) return;

  pushDeletedSnapshot({
    ...createDeletedSnapshotBase(),
    projectId: character.projectId,
    kind: 'character',
    label: character.name,
    characterIndex,
    character: cloneValue(character),
    relationships: cloneValue(
      dataStore.relationships.filter((relationship) => relationship.characterAId === characterId || relationship.characterBId === characterId)
    ),
    characterAppearances: cloneValue(dataStore.characterAppearances.filter((appearance) => appearance.characterId === characterId)),
    episodes: cloneValue(
      dataStore.episodes
        .filter((episode) => episode.characterIds.includes(characterId))
        .map((episode) => ({ id: episode.id, characterIds: episode.characterIds }))
    ),
    scenes: cloneValue(
      dataStore.scenes
        .filter((scene) => scene.characterIds.includes(characterId))
        .map((scene) => ({ id: scene.id, characterIds: scene.characterIds }))
    ),
    openingIdeas: cloneValue(
      dataStore.openingIdeas
        .filter((idea) => idea.usedCharacterIds.includes(characterId))
        .map((idea) => ({ id: idea.id, usedCharacterIds: idea.usedCharacterIds }))
    ),
  });

  dataStore.characters = dataStore.characters.filter((character) => character.id !== characterId);
  dataStore.relationships = dataStore.relationships.filter((relationship) => relationship.characterAId !== characterId && relationship.characterBId !== characterId);
  dataStore.episodes.forEach((episode) => {
    episode.characterIds = removeIdFromList(episode.characterIds, characterId);
  });
  dataStore.scenes.forEach((scene) => {
    scene.characterIds = removeIdFromList(scene.characterIds, characterId);
  });
  dataStore.characterAppearances = dataStore.characterAppearances.filter((appearance) => appearance.characterId !== characterId);
  dataStore.openingIdeas.forEach((idea) => {
    idea.usedCharacterIds = removeIdFromList(idea.usedCharacterIds, characterId);
  });
}

export function deleteTag(tagId: string) {
  const tagIndex = dataStore.tags.findIndex((tag) => tag.id === tagId);
  const tag = dataStore.tags[tagIndex];
  if (!tag) return;

  pushDeletedSnapshot({
    ...createDeletedSnapshotBase(),
    projectId: tag.projectId,
    kind: 'tag',
    label: tag.name,
    tagIndex,
    tag: cloneValue(tag),
    characters: cloneValue(
      dataStore.characters
        .filter((character) => character.tagIds.includes(tagId))
        .map((character) => ({ id: character.id, tagIds: character.tagIds }))
    ),
    terms: cloneValue(
      dataStore.terms
        .filter((term) => term.relatedTagIds.includes(tagId))
        .map((term) => ({ id: term.id, relatedTagIds: term.relatedTagIds }))
    ),
    relationships: cloneValue(
      dataStore.relationships
        .filter((relationship) => relationship.tagIds.includes(tagId))
        .map((relationship) => ({ id: relationship.id, tagIds: relationship.tagIds }))
    ),
    episodes: cloneValue(
      dataStore.episodes
        .filter((episode) => episode.tagIds?.includes(tagId))
        .map((episode) => ({ id: episode.id, tagIds: episode.tagIds }))
    ),
    scenes: cloneValue(
      dataStore.scenes
        .filter((scene) => scene.tagIds.includes(tagId))
        .map((scene) => ({ id: scene.id, tagIds: scene.tagIds }))
    ),
    openingIdeas: cloneValue(
      dataStore.openingIdeas
        .filter((idea) => idea.usedTagIds.includes(tagId))
        .map((idea) => ({ id: idea.id, usedTagIds: idea.usedTagIds }))
    ),
    projects: cloneValue(
      dataStore.projects
        .filter((project) => project.genreTagId === tagId || project.genreTagIds?.includes(tagId))
        .map((project) => ({ id: project.id, genreTagId: project.genreTagId, genreTagIds: project.genreTagIds, genre: project.genre }))
    ),
  });

  dataStore.tags = dataStore.tags.filter((tag) => tag.id !== tagId);
  dataStore.characters.forEach((character) => {
    character.tagIds = removeIdFromList(character.tagIds, tagId);
  });
  dataStore.terms.forEach((term) => {
    term.relatedTagIds = removeIdFromList(term.relatedTagIds, tagId);
  });
  dataStore.relationships.forEach((relationship) => {
    relationship.tagIds = removeIdFromList(relationship.tagIds, tagId);
  });
  dataStore.episodes.forEach((episode) => {
    episode.tagIds = removeIdFromList(episode.tagIds, tagId);
  });
  dataStore.scenes.forEach((scene) => {
    scene.tagIds = removeIdFromList(scene.tagIds, tagId);
  });
  dataStore.openingIdeas.forEach((idea) => {
    idea.usedTagIds = removeIdFromList(idea.usedTagIds, tagId);
  });
  dataStore.projects.forEach((project) => {
    project.genreTagIds = removeIdFromList(project.genreTagIds, tagId);
    if (project.genreTagId === tagId) project.genreTagId = project.genreTagIds?.[0];
    project.genre = dataStore.tags
      .filter((item) => project.genreTagIds?.includes(item.id))
      .map((item) => item.name)
      .join('、');
  });
}

export function deleteTerm(termId: string) {
  const termIndex = dataStore.terms.findIndex((term) => term.id === termId);
  const term = dataStore.terms[termIndex];
  if (!term) return;

  pushDeletedSnapshot({
    ...createDeletedSnapshotBase(),
    projectId: term.projectId,
    kind: 'term',
    label: term.name,
    termIndex,
    term: cloneValue(term),
    openingIdeas: cloneValue(
      dataStore.openingIdeas
        .filter((idea) => idea.usedTermIds.includes(termId))
        .map((idea) => ({ id: idea.id, usedTermIds: idea.usedTermIds }))
    ),
  });

  dataStore.terms = dataStore.terms.filter((term) => term.id !== termId);
  dataStore.openingIdeas.forEach((idea) => {
    idea.usedTermIds = removeIdFromList(idea.usedTermIds, termId);
  });
}

export function deleteCharacterProfileField(projectId: string, fieldId: string) {
  const project = getProject(projectId);
  if (!project?.characterProfileFields?.length) return;
  const fieldIndex = project.characterProfileFields.findIndex((field) => field.id === fieldId && field.source === 'user');
  const field = fieldIndex >= 0 ? project.characterProfileFields[fieldIndex] : undefined;
  if (!field) return;

  pushDeletedSnapshot({
    ...createDeletedSnapshotBase(),
    projectId,
    kind: 'profileField',
    label: field.label,
    fieldIndex,
    field: cloneValue(field),
  });

  project.characterProfileFields = project.characterProfileFields.filter((item) => item.id !== fieldId);
  project.characterProfileFields.forEach((item, index) => {
    item.order = index + 1;
  });
  project.updatedAt = nowIso();
}

export function deleteRelationship(relationshipId: string) {
  const relationshipIndex = dataStore.relationships.findIndex((relationship) => relationship.id === relationshipId);
  const relationship = relationshipIndex >= 0 ? dataStore.relationships[relationshipIndex] : undefined;
  if (!relationship) return;

  pushDeletedSnapshot({
    ...createDeletedSnapshotBase(),
    projectId: relationship.projectId,
    kind: 'relationship',
    label: relationship.relationType || '相関',
    relationshipIndex,
    relationship: cloneValue(relationship),
  });

  dataStore.relationships = dataStore.relationships.filter((item) => item.id !== relationshipId);
}

export function deleteChapter(chapterId: string) {
  const chapterIndex = dataStore.chapters.findIndex((chapter) => chapter.id === chapterId);
  const chapter = chapterIndex >= 0 ? dataStore.chapters[chapterIndex] : undefined;
  if (!chapter) return;

  const episodes = dataStore.episodes.filter((episode) => episode.chapterId === chapterId);
  const episodeIds = episodes.map((episode) => episode.id);
  const scenes = dataStore.scenes.filter((scene) => episodeIds.includes(scene.episodeId));

  pushDeletedSnapshot({
    ...createDeletedSnapshotBase(),
    kind: 'chapter',
    label: chapter.title || `第${chapter.number}章`,
    projectId: chapter.projectId,
    chapterIndex,
    chapter: cloneValue(chapter),
    episodes: cloneValue(episodes),
    scenes: cloneValue(scenes),
  });

  dataStore.scenes = dataStore.scenes.filter((scene) => !episodeIds.includes(scene.episodeId));
  dataStore.episodes = dataStore.episodes.filter((episode) => episode.chapterId !== chapterId);
  dataStore.chapters = dataStore.chapters.filter((item) => item.id !== chapterId);
}

export function deleteEpisode(episodeId: string) {
  const episodeIndex = dataStore.episodes.findIndex((episode) => episode.id === episodeId);
  const episode = episodeIndex >= 0 ? dataStore.episodes[episodeIndex] : undefined;
  if (!episode) return;

  const scenes = dataStore.scenes.filter((scene) => scene.episodeId === episodeId);

  pushDeletedSnapshot({
    ...createDeletedSnapshotBase(),
    kind: 'episode',
    label: episode.title || `第${episode.number}話`,
    projectId: episode.projectId,
    episodeIndex,
    episode: cloneValue(episode),
    scenes: cloneValue(scenes),
  });

  dataStore.scenes = dataStore.scenes.filter((scene) => scene.episodeId !== episodeId);
  dataStore.episodes = dataStore.episodes.filter((item) => item.id !== episodeId);
}

export function deleteScene(sceneId: string) {
  const sceneIndex = dataStore.scenes.findIndex((scene) => scene.id === sceneId);
  const scene = sceneIndex >= 0 ? dataStore.scenes[sceneIndex] : undefined;
  if (!scene) return;

  pushDeletedSnapshot({
    ...createDeletedSnapshotBase(),
    kind: 'scene',
    label: scene.title || 'シーン',
    projectId: scene.projectId,
    sceneIndex,
    scene: cloneValue(scene),
  });

  dataStore.scenes = dataStore.scenes.filter((item) => item.id !== sceneId);
}

function restoreProject(snapshot: DeletedProjectSnapshot) {
  dataStore.projects.splice(Math.min(snapshot.projectIndex, dataStore.projects.length), 0, cloneValue(snapshot.project));
  dataStore.characters = [...cloneValue(snapshot.characters), ...dataStore.characters];
  dataStore.tags = [...cloneValue(snapshot.tags), ...dataStore.tags];
  dataStore.terms = [...cloneValue(snapshot.terms), ...dataStore.terms];
  dataStore.relationships = [...cloneValue(snapshot.relationships), ...dataStore.relationships];
  dataStore.workPlots = [...cloneValue(snapshot.workPlots), ...dataStore.workPlots];
  dataStore.chapters = [...cloneValue(snapshot.chapters), ...dataStore.chapters];
  dataStore.episodes = [...cloneValue(snapshot.episodes), ...dataStore.episodes];
  dataStore.scenes = [...cloneValue(snapshot.scenes), ...dataStore.scenes];
  dataStore.characterAppearances = [...cloneValue(snapshot.characterAppearances), ...dataStore.characterAppearances];
  dataStore.postStylePresets = [...cloneValue(snapshot.postStylePresets), ...dataStore.postStylePresets];
  dataStore.openingIdeas = [...cloneValue(snapshot.openingIdeas), ...dataStore.openingIdeas];
  dataStore.bodyDrafts = [...cloneValue(snapshot.bodyDrafts), ...dataStore.bodyDrafts];
  dataStore.lineMemos = [...cloneValue(snapshot.lineMemos), ...dataStore.lineMemos];
}

function restoreCharacter(snapshot: DeletedCharacterSnapshot) {
  dataStore.characters.splice(Math.min(snapshot.characterIndex, dataStore.characters.length), 0, cloneValue(snapshot.character));
  dataStore.relationships = [...cloneValue(snapshot.relationships), ...dataStore.relationships];
  dataStore.characterAppearances = [...cloneValue(snapshot.characterAppearances), ...dataStore.characterAppearances];

  snapshot.episodes.forEach((savedEpisode) => {
    const episode = dataStore.episodes.find((item) => item.id === savedEpisode.id);
    if (episode) episode.characterIds = cloneValue(savedEpisode.characterIds);
  });
  snapshot.scenes.forEach((savedScene) => {
    const scene = dataStore.scenes.find((item) => item.id === savedScene.id);
    if (scene) scene.characterIds = cloneValue(savedScene.characterIds);
  });
  snapshot.openingIdeas.forEach((savedIdea) => {
    const idea = dataStore.openingIdeas.find((item) => item.id === savedIdea.id);
    if (idea) idea.usedCharacterIds = cloneValue(savedIdea.usedCharacterIds);
  });
}

function restoreTag(snapshot: DeletedTagSnapshot) {
  dataStore.tags.splice(Math.min(snapshot.tagIndex, dataStore.tags.length), 0, cloneValue(snapshot.tag));

  snapshot.characters.forEach((savedCharacter) => {
    const character = dataStore.characters.find((item) => item.id === savedCharacter.id);
    if (character) character.tagIds = cloneValue(savedCharacter.tagIds);
  });
  snapshot.terms.forEach((savedTerm) => {
    const term = dataStore.terms.find((item) => item.id === savedTerm.id);
    if (term) term.relatedTagIds = cloneValue(savedTerm.relatedTagIds);
  });
  snapshot.relationships.forEach((savedRelationship) => {
    const relationship = dataStore.relationships.find((item) => item.id === savedRelationship.id);
    if (relationship) relationship.tagIds = cloneValue(savedRelationship.tagIds);
  });
  snapshot.episodes.forEach((savedEpisode) => {
    const episode = dataStore.episodes.find((item) => item.id === savedEpisode.id);
    if (episode) episode.tagIds = cloneValue(savedEpisode.tagIds);
  });
  snapshot.scenes.forEach((savedScene) => {
    const scene = dataStore.scenes.find((item) => item.id === savedScene.id);
    if (scene) scene.tagIds = cloneValue(savedScene.tagIds);
  });
  snapshot.openingIdeas.forEach((savedIdea) => {
    const idea = dataStore.openingIdeas.find((item) => item.id === savedIdea.id);
    if (idea) idea.usedTagIds = cloneValue(savedIdea.usedTagIds);
  });
  snapshot.projects.forEach((savedProject) => {
    const project = dataStore.projects.find((item) => item.id === savedProject.id);
    if (!project) return;
    project.genreTagId = savedProject.genreTagId;
    project.genreTagIds = cloneValue(savedProject.genreTagIds);
    project.genre = savedProject.genre;
  });
}

function restoreTerm(snapshot: DeletedTermSnapshot) {
  dataStore.openingIdeas.forEach((idea) => {
    const related = snapshot.openingIdeas.find((item) => item.id === idea.id);
    if (related) idea.usedTermIds = cloneValue(related.usedTermIds);
  });

  dataStore.terms.splice(
    Math.min(snapshot.termIndex, dataStore.terms.length),
    0,
    cloneValue(snapshot.term)
  );
}

function restoreProfileField(snapshot: DeletedProfileFieldSnapshot) {
  const project = getProject(snapshot.projectId);
  if (!project) return;
  project.characterProfileFields ??= [];
  project.characterProfileFields.splice(
    Math.min(snapshot.fieldIndex, project.characterProfileFields.length),
    0,
    cloneValue(snapshot.field)
  );
  project.characterProfileFields.forEach((field, index) => {
    field.order = index + 1;
  });
  project.updatedAt = nowIso();
}

function restoreRelationship(snapshot: DeletedRelationshipSnapshot) {
  dataStore.relationships.splice(
    Math.min(snapshot.relationshipIndex, dataStore.relationships.length),
    0,
    cloneValue(snapshot.relationship)
  );
}

function restoreChapter(snapshot: DeletedChapterSnapshot) {
  dataStore.chapters.splice(
    Math.min(snapshot.chapterIndex, dataStore.chapters.length),
    0,
    cloneValue(snapshot.chapter)
  );
  dataStore.episodes = [...cloneValue(snapshot.episodes), ...dataStore.episodes];
  dataStore.scenes = [...cloneValue(snapshot.scenes), ...dataStore.scenes];
}

function restoreEpisode(snapshot: DeletedEpisodeSnapshot) {
  dataStore.episodes.splice(
    Math.min(snapshot.episodeIndex, dataStore.episodes.length),
    0,
    cloneValue(snapshot.episode)
  );
  dataStore.scenes = [...cloneValue(snapshot.scenes), ...dataStore.scenes];
}

function restoreScene(snapshot: DeletedSceneSnapshot) {
  dataStore.scenes.splice(
    Math.min(snapshot.sceneIndex, dataStore.scenes.length),
    0,
    cloneValue(snapshot.scene)
  );
}

export function restoreDeletedItem(trashId: string) {
  const index = transientStore.deletedItems.findIndex((item) => item.trashId === trashId);
  if (index < 0) return;
  const snapshot = transientStore.deletedItems[index];
  if (!snapshot) return;

  if (snapshot.kind === 'project') restoreProject(snapshot);
  if (snapshot.kind === 'character') restoreCharacter(snapshot);
  if (snapshot.kind === 'tag') restoreTag(snapshot);
  if (snapshot.kind === 'term') restoreTerm(snapshot);
  if (snapshot.kind === 'profileField') restoreProfileField(snapshot);
  if (snapshot.kind === 'relationship') restoreRelationship(snapshot);
  if (snapshot.kind === 'chapter') restoreChapter(snapshot);
  if (snapshot.kind === 'episode') restoreEpisode(snapshot);
  if (snapshot.kind === 'scene') restoreScene(snapshot);

  transientStore.deletedItems.splice(index, 1);
}

export function removeDeletedItem(trashId: string) {
  transientStore.deletedItems = transientStore.deletedItems.filter((item) => item.trashId !== trashId);
}

export function getDeletedItemsForProject(projectId: string) {
  return transientStore.deletedItems.filter((item) => item.projectId === projectId && item.kind !== 'project');
}

export function restoreLastDeleted() {
  const snapshot = transientStore.deletedItems[0];
  if (!snapshot) return;
  restoreDeletedItem(snapshot.trashId);
}

export function clearLastDeleted() {
  transientStore.deletedItems.shift();
}

export function exportBackup() {
  const payload = {
    format: 'novel-writing-tool-app',
    version: 1,
    exportedAt: nowIso(),
    projectCount: dataStore.projects.length,
    data: cloneValue(dataStore),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, `novel-writing-tool-${dataStore.projects.length}works.json`);
}

function sectionLine(label: string, value?: string | number | null) {
  if (value === undefined || value === null || value === '') return '';
  return `- ${label}: ${value}`;
}

function listLine(label: string, values: string[]) {
  if (!values.length) return '';
  return `- ${label}: ${values.join('、')}`;
}

function mapLabelIds(values: string[] | undefined, labelMap: Map<string, string>) {
  return (values ?? []).map((id) => labelMap.get(id) ?? id).filter(Boolean);
}

function pushSection(lines: string[], title: string, sectionLines: string[]) {
  const filtered = sectionLines.filter(Boolean);
  if (!filtered.length) return;
  lines.push(title);
  lines.push(...filtered);
  lines.push('');
}

function renderCharacterVersionMarkdown(lines: string[], title: string, character: Pick<Character, keyof CharacterVersionData> | CharacterVersionData, profileFields: CharacterProfileField[]) {
  lines.push(title);
  pushSection(lines, '#### 基本情報', [
    sectionLine('名前', character.name),
    sectionLine('フリガナ', character.ruby),
    sectionLine('二つ名 / 異名', character.alias),
    sectionLine('年齢', character.age),
    sectionLine('性別', character.gender),
    sectionLine('誕生日', character.birthday),
    sectionLine('種族', character.race),
    sectionLine('所属', character.affiliation),
    sectionLine('出身地', character.origin),
    sectionLine('身長', character.height),
    sectionLine('体重', character.weight),
  ]);
  pushSection(lines, '#### 人物像', [
    sectionLine('物語上の役割', character.role),
    sectionLine('性格', character.personality),
    sectionLine('目的', character.goal),
    sectionLine('行動原理', character.behaviorPrinciple),
    sectionLine('好きなもの', character.likes),
    sectionLine('苦手なもの', character.dislikes),
    sectionLine('秘密', character.secret),
    sectionLine('メモ', character.memo),
  ]);
  pushSection(lines, '#### 能力', [
    sectionLine('特技', character.battleStyle),
    sectionLine('武器', character.weapon),
    sectionLine('魔法 / 能力', character.magic),
    sectionLine('技能', character.skill),
    sectionLine('弱点', character.weakness),
  ]);
  pushSection(lines, '#### 話し方', [
    sectionLine('一人称', character.firstPerson),
    sectionLine('二人称', character.secondPerson),
    sectionLine('口調', character.speechStyle),
  ]);
  pushSection(lines, '#### 外見', [
    sectionLine('外見概要', character.appearance),
    sectionLine('髪型', character.hairStyle),
    sectionLine('髪色', character.hairColor),
    sectionLine('目の色', character.eyeColor),
    sectionLine('体格', character.build),
    sectionLine('服装', character.clothing),
    sectionLine('装備', character.equipment),
  ]);
  const customFields = (character.customFields ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((field) => sectionLine(field.label, field.value));
  const configuredCustomFields = profileFields
    .filter((field) => field.source === 'user')
    .map((field) => {
      const value = (character.customFields ?? []).find((item) => item.templateId === field.id || item.label === field.label)?.value ?? '';
      return sectionLine(field.label, value);
    });
  pushSection(lines, '#### 追加項目', [...configuredCustomFields, ...customFields]);
}

function renderTermVersionMarkdown(lines: string[], title: string, term: Pick<Term, keyof TermVersionData> | TermVersionData, tagMap: Map<string, string>, characterMap: Map<string, string>, episodeMap: Map<string, Episode>, sceneMap: Map<string, Scene>) {
  lines.push(title);
  lines.push(...[
    sectionLine('名称', term.name),
    sectionLine('フリガナ', term.ruby),
    sectionLine('分類', term.category),
    sectionLine('短い説明', term.shortDescription),
    sectionLine('説明', term.description),
    sectionLine('公開情報', term.publicInfo),
    sectionLine('ネタバレ情報', term.spoilerInfo),
    sectionLine('初登場話', term.firstEpisodeId ? episodeMap.get(term.firstEpisodeId)?.title || term.firstEpisodeId : ''),
    sectionLine('初登場シーン', term.firstSceneId ? sceneMap.get(term.firstSceneId)?.title || term.firstSceneId : ''),
    listLine('関連人物', mapLabelIds(term.relatedCharacterIds, characterMap)),
    listLine('関連タグ', mapLabelIds(term.relatedTagIds, tagMap)),
    sectionLine('メモ', term.memo),
  ].filter(Boolean));
  lines.push('');
}

function renderProjectMarkdown(projectId: string) {
  const project = getProject(projectId);
  if (!project) return '';

  const workPlot = dataStore.workPlots.find((item) => item.projectId === projectId);
  const characters = dataStore.characters.filter((item) => item.projectId === projectId);
  const tags = dataStore.tags.filter((item) => item.projectId === projectId);
  const terms = dataStore.terms.filter((item) => item.projectId === projectId);
  const relationships = dataStore.relationships.filter((item) => item.projectId === projectId);
  const chapters = dataStore.chapters
    .filter((item) => item.projectId === projectId)
    .sort((a, b) => a.number - b.number);
  const episodes = dataStore.episodes
    .filter((item) => item.projectId === projectId)
    .sort((a, b) => a.number - b.number);
  const scenes = dataStore.scenes
    .filter((item) => item.projectId === projectId)
    .sort((a, b) => a.title.localeCompare(b.title, 'ja'));
  const characterMap = new Map(characters.map((item) => [item.id, item.name]));
  const tagMap = new Map(tags.map((item) => [item.id, item.name]));
  const termMap = new Map(terms.map((item) => [item.id, item.name]));
  const episodeMap = new Map(episodes.map((item) => [item.id, item]));
  const chapterMap = new Map(chapters.map((item) => [item.id, item]));
  const sceneMap = new Map(scenes.map((item) => [item.id, item]));
  const projectProfileFields = (project.characterProfileFields ?? [])
    .slice()
    .sort((a, b) => a.order - b.order);

  const lines: string[] = [];
  lines.push(`# ${project.title}`);
  lines.push('');
  lines.push(...[
    sectionLine('ジャンル', project.genre),
    sectionLine('概要', project.summary),
    sectionLine('メモ', project.memo),
  ].filter(Boolean));

  if (workPlot) {
    lines.push('', '## 作品全体プロット', '');
    lines.push(...[
      sectionLine('テーマ', workPlot.theme),
      sectionLine('物語の始まり', workPlot.beginning),
      sectionLine('クライマックス', workPlot.climax),
      sectionLine('結末', workPlot.ending),
      sectionLine('主人公の最初の状態', workPlot.protagonistStart),
      sectionLine('主人公の最終状態', workPlot.protagonistEnd),
      sectionLine('メインの謎', workPlot.mainMystery),
      sectionLine('最終的に明かす真実', workPlot.finalTruth),
      sectionLine('主要な伏線', workPlot.foreshadowing),
      sectionLine('メモ', workPlot.memo),
    ].filter(Boolean));

    if (workPlot.middleEvents.length) {
      lines.push('', '### 中盤イベント', '');
      workPlot.middleEvents
        .sort((a, b) => a.order - b.order)
        .forEach((event, index) => {
          lines.push(`#### ${index + 1}. ${event.title || '無題'}`);
          lines.push(...[
            sectionLine('内容', event.content),
            sectionLine('目的', event.purpose),
            sectionLine('起きる変化', event.change),
            listLine('関連キャラ', mapLabelIds(event.relatedCharacterIds, characterMap)),
            listLine('関連用語', mapLabelIds(event.relatedTermIds, termMap)),
            listLine('関連タグ', mapLabelIds(event.relatedTagIds, tagMap)),
            sectionLine('メモ', event.memo),
          ].filter(Boolean));
          lines.push('');
        });
    }
  }

  lines.push('', '## 章・話・シーン', '');
  chapters.forEach((chapter) => {
    lines.push(`### 第${chapter.number}章 ${chapter.title || '無題'}`);
    lines.push(...[
      sectionLine('目的', chapter.purpose),
      sectionLine('流れ', chapter.flow),
      sectionLine('メモ', chapter.memo),
    ].filter(Boolean));
    lines.push('');

    episodes
      .filter((episode) => episode.chapterId === chapter.id)
      .forEach((episode) => {
        lines.push(`#### 第${episode.number}話 ${episode.title || '無題'}`);
        lines.push(...[
          listLine('登場人物', mapLabelIds(episode.characterIds, characterMap)),
          listLine('関連タグ', mapLabelIds(episode.tagIds, tagMap)),
          sectionLine('目的', episode.purpose),
          sectionLine('開始状況', episode.startSituation),
          sectionLine('起きる事件', episode.mainEvent),
          sectionLine('明かす情報', episode.revealInfo),
          sectionLine('隠す情報', episode.hiddenInfo),
          sectionLine('伏線', episode.foreshadowing),
          sectionLine('ラストの引き', episode.endingHook),
          sectionLine('本文メモ', episode.memo),
        ].filter(Boolean));
        lines.push('');

        scenes
          .filter((scene) => scene.episodeId === episode.id)
          .forEach((scene, index) => {
            lines.push(`##### シーン${index + 1} ${scene.title || '無題'}`);
            lines.push(...[
              sectionLine('場所', scene.location),
              sectionLine('時間', scene.time),
              listLine('登場人物', mapLabelIds(scene.characterIds, characterMap)),
              sectionLine('起きること', scene.event),
              sectionLine('会話の目的', scene.conversationPurpose),
              sectionLine('衝突', scene.conflict),
              sectionLine('結果', scene.result),
              sectionLine('次への繋ぎ', scene.nextHook),
              listLine('関連タグ', mapLabelIds(scene.tagIds, tagMap)),
              sectionLine('書き出し', scene.openingText),
              sectionLine('メモ', scene.memo),
            ].filter(Boolean));
            lines.push('');
          });
      });
  });

  if (characters.length) {
    lines.push('', '## 人物', '');
    characters.forEach((character) => {
      lines.push(`### ${character.name || '名前未設定'}`);
      lines.push(...[
        listLine('関連タグ', mapLabelIds(character.tagIds, tagMap)),
        sectionLine('作成日時', character.createdAt),
        sectionLine('更新日時', character.updatedAt),
      ].filter(Boolean));
      lines.push('');
      renderCharacterVersionMarkdown(lines, '#### 現在の版', character, projectProfileFields);
      if (character.versions?.length) {
        character.versions.forEach((version, index) => {
          renderCharacterVersionMarkdown(lines, `#### バージョン ${index + 1}`, version, projectProfileFields);
          lines.push(...[
            sectionLine('作成日時', version.createdAt),
            sectionLine('更新日時', version.updatedAt),
          ].filter(Boolean));
          lines.push('');
        });
      }
    });
  }

  if (tags.length) {
    lines.push('', '## タグ', '');
    tags.forEach((tag) => {
      lines.push(`### ${tag.name}`);
      lines.push(...[
        sectionLine('分類', tag.type),
        sectionLine('カテゴリ', tag.category),
        sectionLine('色', tag.color),
        sectionLine('状態', tag.status),
        sectionLine('作成元', tag.source),
        sectionLine('メモ', tag.memo),
      ].filter(Boolean));
      lines.push('');
    });
  }

  if (terms.length) {
    lines.push('', '## 用語', '');
    terms.forEach((term) => {
      lines.push(`### ${term.name || '名前未設定'}`);
      lines.push(...[
        sectionLine('作成日時', term.createdAt),
        sectionLine('更新日時', term.updatedAt),
      ].filter(Boolean));
      lines.push('');
      renderTermVersionMarkdown(lines, '#### 現在の版', term, tagMap, characterMap, episodeMap, sceneMap);
      if (term.versions?.length) {
        term.versions.forEach((version, index) => {
          renderTermVersionMarkdown(lines, `#### バージョン ${index + 1}`, version, tagMap, characterMap, episodeMap, sceneMap);
          lines.push(...[
            sectionLine('作成日時', version.createdAt),
            sectionLine('更新日時', version.updatedAt),
          ].filter(Boolean));
          lines.push('');
        });
      }
    });
  }

  if (relationships.length) {
    lines.push('', '## 相関', '');
    relationships.forEach((relationship) => {
      lines.push(`- ${characterMap.get(relationship.characterAId) ?? relationship.characterAId} → ${characterMap.get(relationship.characterBId) ?? relationship.characterBId}`);
      lines.push(...[
        sectionLine('関係性', relationship.relationType),
        sectionLine('A→B印象', relationship.emotionAtoB),
        sectionLine('B→A印象', relationship.emotionBtoA),
        sectionLine('表向きの関係', relationship.publicRelation),
        sectionLine('裏の関係', relationship.hiddenRelation),
        sectionLine('変化予定', relationship.changePlan),
        sectionLine('メモ', relationship.memo),
        listLine('関連タグ', mapLabelIds(relationship.tagIds, tagMap)),
      ].filter(Boolean));
      lines.push('');
    });
  }

  if (dataStore.bodyDrafts.some((item) => item.projectId === projectId)) {
    lines.push('', '## 本文', '');
    dataStore.bodyDrafts
      .filter((item) => item.projectId === projectId)
      .forEach((draft) => {
        const episode = draft.episodeId ? episodeMap.get(draft.episodeId) : undefined;
        const scene = draft.sceneId ? sceneMap.get(draft.sceneId) : undefined;
        const chapter = episode?.chapterId ? chapterMap.get(episode.chapterId) : undefined;
        lines.push(`### ${draft.title || '無題'}`);
        lines.push(...[
          sectionLine('章', chapter ? `第${chapter.number}章 ${chapter.title}` : ''),
          sectionLine('話', episode ? `第${episode.number}話 ${episode.title}` : ''),
          sectionLine('シーン', scene ? scene.title : ''),
          sectionLine('状態', draft.status),
          sectionLine('投稿設定', draft.postStylePresetId ? (dataStore.postStylePresets.find((item) => item.id === draft.postStylePresetId)?.name ?? draft.postStylePresetId) : ''),
          sectionLine('作成日時', draft.createdAt),
          sectionLine('更新日時', draft.updatedAt),
        ].filter(Boolean));
        if (draft.content) {
          lines.push('', '```text', draft.content, '```');
        }
        const lineMemos = dataStore.lineMemos
          .filter((memo) => memo.projectId === projectId && memo.bodyId === draft.id)
          .sort((a, b) => a.lineNumber - b.lineNumber);
        if (lineMemos.length) {
          lines.push('', '#### 行間メモ', '');
          lineMemos.forEach((memo) => {
            lines.push(`- ${memo.lineNumber}行目 [${memo.memoType}] ${memo.content}`);
            lines.push(...[
              sectionLine('対象文', memo.targetText),
              sectionLine('前文', memo.beforeText),
              sectionLine('後文', memo.afterText),
              sectionLine('更新日時', memo.updatedAt),
            ].filter(Boolean));
          });
        }
        lines.push('');
      });
  }

  const presets = dataStore.postStylePresets.filter((item) => item.projectId === projectId);
  if (presets.length) {
    lines.push('', '## 投稿設定', '');
    presets.forEach((preset) => {
      lines.push(`### ${preset.name}`);
      lines.push(...[
        sectionLine('投稿先', preset.platform),
        sectionLine('改行レベル', preset.lineBreakLevel),
        sectionLine('文の長さ', preset.sentenceLength),
        sectionLine('会話量', preset.dialogueAmount),
        sectionLine('地の文量', preset.descriptionAmount),
        sectionLine('引きの強さ', preset.hookStrength),
        sectionLine('ルビ有効', preset.rubyEnabled ? 'あり' : 'なし'),
        sectionLine('メモ', preset.memo),
      ].filter(Boolean));
      lines.push('');
    });
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

export function exportBackupMarkdown() {
  const lines: string[] = [];
  lines.push(`# 小説書き出しツール バックアップ`);
  lines.push('');
  lines.push(`- 出力日時: ${nowIso()}`);
  lines.push(`- 作品数: ${dataStore.projects.length}`);
  dataStore.projects.forEach((project) => {
    lines.push('', renderProjectMarkdown(project.id));
  });
  const blob = new Blob([lines.join('\n').trim() + '\n'], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, `novel-writing-tool-${dataStore.projects.length}works.md`);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function mapId<T extends string | undefined>(value: T, idMap: Map<string, string>): T {
  if (!value) return value;
  return (idMap.get(value) ?? value) as T;
}

function mapIds(values: string[] | undefined, idMap: Map<string, string>) {
  return (values ?? []).map((value) => idMap.get(value) ?? value);
}

export function exportProjectData(projectId: string) {
  const project = getProject(projectId);
  if (!project) return;

  const payload = {
    format: 'novel-writing-tool-project',
    version: 1,
    exportedAt: nowIso(),
    project: cloneValue(project),
    workPlot: cloneValue(dataStore.workPlots.find((item) => item.projectId === projectId) ?? null),
    characters: cloneValue(dataStore.characters.filter((item) => item.projectId === projectId)),
    tags: cloneValue(dataStore.tags.filter((item) => item.projectId === projectId)),
    terms: cloneValue(dataStore.terms.filter((item) => item.projectId === projectId)),
    relationships: cloneValue(dataStore.relationships.filter((item) => item.projectId === projectId)),
    chapters: cloneValue(dataStore.chapters.filter((item) => item.projectId === projectId)),
    episodes: cloneValue(dataStore.episodes.filter((item) => item.projectId === projectId)),
    scenes: cloneValue(dataStore.scenes.filter((item) => item.projectId === projectId)),
    characterAppearances: cloneValue(dataStore.characterAppearances.filter((item) => item.projectId === projectId)),
    postStylePresets: cloneValue(dataStore.postStylePresets.filter((item) => item.projectId === projectId)),
    openingIdeas: cloneValue(dataStore.openingIdeas.filter((item) => item.projectId === projectId)),
    bodyDrafts: cloneValue(dataStore.bodyDrafts.filter((item) => item.projectId === projectId)),
    lineMemos: cloneValue(dataStore.lineMemos.filter((item) => item.projectId === projectId)),
  };

  const safeTitle = (project.title || 'project').replace(/[\\/:*?"<>|]/g, '_');
  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }),
    `${safeTitle}.json`
  );
}

export function exportProjectMarkdown(projectId: string) {
  const project = getProject(projectId);
  if (!project) return;
  const safeTitle = (project.title || 'project').replace(/[\\/:*?"<>|]/g, '_');
  const markdown = renderProjectMarkdown(projectId);
  downloadBlob(
    new Blob([markdown], { type: 'text/markdown;charset=utf-8' }),
    `${safeTitle}.md`
  );
}

export function importProjectData(rawText: string, options?: { targetProjectId?: string }) {
  const parsed = JSON.parse(rawText) as any;
  if (!parsed || parsed.format !== 'novel-writing-tool-project' || !parsed.project) {
    throw new Error('対応していないJSON形式です。');
  }

  const idMap = new Map<string, string>();
  const targetProjectId = options?.targetProjectId;
  const remap = (oldId: string) => {
    if (targetProjectId && oldId === (parsed.project as NovelProject).id) {
      idMap.set(oldId, targetProjectId);
      return targetProjectId;
    }
    if (!idMap.has(oldId)) idMap.set(oldId, createId());
    return idMap.get(oldId)!;
  };

  const sourceProject = parsed.project as NovelProject;
  const newProjectId = remap(sourceProject.id);
  const now = nowIso();

  const importedProject: NovelProject = {
    ...cloneValue(sourceProject),
    id: newProjectId,
    title: targetProjectId ? sourceProject.title : `${sourceProject.title}（読込）`,
    genreTagId: mapId(sourceProject.genreTagId, idMap),
    genreTagIds: mapIds(sourceProject.genreTagIds, idMap),
    createdAt: now,
    updatedAt: now,
  };

  importedProject.characterProfileFields = (sourceProject.characterProfileFields ?? []).map((field) => ({
    ...cloneValue(field),
    id: remap(field.id),
  }));

  const importedTags: Tag[] = (parsed.tags ?? []).map((tag: Tag) => ({
    ...cloneValue(tag),
    id: remap(tag.id),
    projectId: newProjectId,
  }));

  const importedCharacters: Character[] = (parsed.characters ?? []).map((character: Character) => {
    const characterId = remap(character.id);
    const fieldTemplateMap = new Map((sourceProject.characterProfileFields ?? []).map((field) => [field.id, remap(field.id)]));
    return {
      ...cloneValue(character),
      id: characterId,
      projectId: newProjectId,
      tagIds: mapIds(character.tagIds, idMap),
      customFields: (character.customFields ?? []).map((field) => ({
        ...cloneValue(field),
        id: remap(field.id),
        templateId: field.templateId ? (fieldTemplateMap.get(field.templateId) ?? field.templateId) : field.templateId,
      })),
      versions: (character.versions ?? []).map((version) => ({
        ...cloneValue(version),
        id: remap(version.id),
        tagIds: mapIds(version.tagIds, idMap),
        customFields: (version.customFields ?? []).map((field) => ({
          ...cloneValue(field),
          id: remap(field.id),
          templateId: field.templateId ? (fieldTemplateMap.get(field.templateId) ?? field.templateId) : field.templateId,
        })),
        baseSnapshot: version.baseSnapshot
          ? {
            ...cloneValue(version.baseSnapshot),
            tagIds: mapIds(version.baseSnapshot.tagIds, idMap),
            customFields: (version.baseSnapshot.customFields ?? []).map((field) => ({
              ...cloneValue(field),
              id: remap(field.id),
              templateId: field.templateId ? (fieldTemplateMap.get(field.templateId) ?? field.templateId) : field.templateId,
            })),
          }
          : version.baseSnapshot,
      })),
      activeVersionId: mapId(character.activeVersionId, idMap),
    };
  });

  const importedWorkPlot: WorkPlot | null = parsed.workPlot
    ? {
      ...cloneValue(parsed.workPlot),
      id: remap(parsed.workPlot.id),
      projectId: newProjectId,
      middleEvents: (parsed.workPlot.middleEvents ?? []).map((event: any) => ({
        ...cloneValue(event),
        id: remap(event.id),
        relatedCharacterIds: mapIds(event.relatedCharacterIds, idMap),
        relatedTermIds: mapIds(event.relatedTermIds, idMap),
        relatedTagIds: mapIds(event.relatedTagIds, idMap),
      })),
    }
    : null;

  const importedChapters: Chapter[] = (parsed.chapters ?? []).map((chapter: Chapter) => ({
    ...cloneValue(chapter),
    id: remap(chapter.id),
    projectId: newProjectId,
  }));

  const importedEpisodes: Episode[] = (parsed.episodes ?? []).map((episode: Episode) => ({
    ...cloneValue(episode),
    id: remap(episode.id),
    projectId: newProjectId,
    chapterId: mapId(episode.chapterId, idMap),
    characterIds: mapIds(episode.characterIds, idMap),
    tagIds: mapIds(episode.tagIds, idMap),
  }));

  const importedScenes: Scene[] = (parsed.scenes ?? []).map((scene: Scene) => ({
    ...cloneValue(scene),
    id: remap(scene.id),
    projectId: newProjectId,
    episodeId: remap(scene.episodeId),
    characterIds: mapIds(scene.characterIds, idMap),
    tagIds: mapIds(scene.tagIds, idMap),
    openingText: scene.openingText ?? '',
  }));

  const importedTerms: Term[] = (parsed.terms ?? []).map((term: Term) => ({
    ...cloneValue(term),
    id: remap(term.id),
    projectId: newProjectId,
    firstEpisodeId: mapId(term.firstEpisodeId, idMap),
    firstSceneId: mapId(term.firstSceneId, idMap),
    relatedCharacterIds: mapIds(term.relatedCharacterIds, idMap),
    relatedPlotIds: mapIds(term.relatedPlotIds, idMap),
    relatedTagIds: mapIds(term.relatedTagIds, idMap),
    versions: (term.versions ?? []).map((version) => ({
      ...cloneValue(version),
      id: remap(version.id),
      firstEpisodeId: mapId(version.firstEpisodeId, idMap),
      firstSceneId: mapId(version.firstSceneId, idMap),
      relatedCharacterIds: mapIds(version.relatedCharacterIds, idMap),
      relatedPlotIds: mapIds(version.relatedPlotIds, idMap),
      relatedTagIds: mapIds(version.relatedTagIds, idMap),
      baseSnapshot: version.baseSnapshot
        ? {
          ...cloneValue(version.baseSnapshot),
          firstEpisodeId: mapId(version.baseSnapshot.firstEpisodeId, idMap),
          firstSceneId: mapId(version.baseSnapshot.firstSceneId, idMap),
          relatedCharacterIds: mapIds(version.baseSnapshot.relatedCharacterIds, idMap),
          relatedPlotIds: mapIds(version.baseSnapshot.relatedPlotIds, idMap),
          relatedTagIds: mapIds(version.baseSnapshot.relatedTagIds, idMap),
        }
        : version.baseSnapshot,
    })),
    activeVersionId: mapId(term.activeVersionId, idMap),
  }));

  const importedRelationships: Relationship[] = (parsed.relationships ?? []).map((relationship: Relationship) => ({
    ...cloneValue(relationship),
    id: remap(relationship.id),
    projectId: newProjectId,
    characterAId: remap(relationship.characterAId),
    characterBId: remap(relationship.characterBId),
    tagIds: mapIds(relationship.tagIds, idMap),
  }));

  const importedCharacterAppearances: CharacterAppearance[] = (parsed.characterAppearances ?? []).map((appearance: CharacterAppearance) => ({
    ...cloneValue(appearance),
    id: remap(appearance.id),
    projectId: newProjectId,
    characterId: remap(appearance.characterId),
    episodeId: mapId(appearance.episodeId, idMap),
    sceneId: mapId(appearance.sceneId, idMap),
  }));

  const importedPostStyles: PostStylePreset[] = (parsed.postStylePresets ?? []).map((preset: PostStylePreset) => ({
    ...cloneValue(preset),
    id: remap(preset.id),
    projectId: newProjectId,
  }));

  const importedOpeningIdeas: OpeningIdea[] = (parsed.openingIdeas ?? []).map((idea: OpeningIdea) => ({
    ...cloneValue(idea),
    id: remap(idea.id),
    projectId: newProjectId,
    sourceId: mapId(idea.sourceId, idMap) ?? idea.sourceId,
    usedCharacterIds: mapIds(idea.usedCharacterIds, idMap),
    usedTagIds: mapIds(idea.usedTagIds, idMap),
    usedTermIds: mapIds(idea.usedTermIds, idMap),
    postStylePresetId: mapId(idea.postStylePresetId, idMap),
  }));

  const importedBodyDrafts: BodyDraft[] = (parsed.bodyDrafts ?? []).map((draft: BodyDraft) => ({
    ...cloneValue(draft),
    id: remap(draft.id),
    projectId: newProjectId,
    episodeId: mapId(draft.episodeId, idMap),
    sceneId: mapId(draft.sceneId, idMap),
    postStylePresetId: mapId(draft.postStylePresetId, idMap),
    sourceOpeningIdeaId: mapId(draft.sourceOpeningIdeaId, idMap),
  }));

  const importedLineMemos: LineMemo[] = (parsed.lineMemos ?? []).map((memo: LineMemo) => ({
    ...cloneValue(memo),
    id: remap(memo.id),
    projectId: newProjectId,
    episodeId: mapId(memo.episodeId, idMap),
    sceneId: mapId(memo.sceneId, idMap),
    bodyId: remap(memo.bodyId),
  }));

  if (targetProjectId) {
    const projectIndex = dataStore.projects.findIndex((project) => project.id === targetProjectId);
    if (projectIndex < 0) throw new Error('上書き対象の作品が見つかりません。');

    dataStore.characters = dataStore.characters.filter((item) => item.projectId !== targetProjectId);
    dataStore.tags = dataStore.tags.filter((item) => item.projectId !== targetProjectId);
    dataStore.terms = dataStore.terms.filter((item) => item.projectId !== targetProjectId);
    dataStore.relationships = dataStore.relationships.filter((item) => item.projectId !== targetProjectId);
    dataStore.workPlots = dataStore.workPlots.filter((item) => item.projectId !== targetProjectId);
    dataStore.chapters = dataStore.chapters.filter((item) => item.projectId !== targetProjectId);
    dataStore.episodes = dataStore.episodes.filter((item) => item.projectId !== targetProjectId);
    dataStore.scenes = dataStore.scenes.filter((item) => item.projectId !== targetProjectId);
    dataStore.characterAppearances = dataStore.characterAppearances.filter((item) => item.projectId !== targetProjectId);
    dataStore.postStylePresets = dataStore.postStylePresets.filter((item) => item.projectId !== targetProjectId);
    dataStore.openingIdeas = dataStore.openingIdeas.filter((item) => item.projectId !== targetProjectId);
    dataStore.bodyDrafts = dataStore.bodyDrafts.filter((item) => item.projectId !== targetProjectId);
    dataStore.lineMemos = dataStore.lineMemos.filter((item) => item.projectId !== targetProjectId);
    transientStore.deletedItems = transientStore.deletedItems.filter((item) => item.projectId !== targetProjectId);
    dataStore.projects.splice(projectIndex, 1, importedProject);
  } else {
    dataStore.projects.unshift(importedProject);
  }
  if (importedWorkPlot) dataStore.workPlots.unshift(importedWorkPlot);
  dataStore.tags = [...importedTags, ...dataStore.tags];
  dataStore.characters = [...importedCharacters, ...dataStore.characters];
  dataStore.terms = [...importedTerms, ...dataStore.terms];
  dataStore.relationships = [...importedRelationships, ...dataStore.relationships];
  dataStore.chapters = [...importedChapters, ...dataStore.chapters];
  dataStore.episodes = [...importedEpisodes, ...dataStore.episodes];
  dataStore.scenes = [...importedScenes, ...dataStore.scenes];
  dataStore.characterAppearances = [...importedCharacterAppearances, ...dataStore.characterAppearances];
  dataStore.postStylePresets = [...importedPostStyles, ...dataStore.postStylePresets];
  dataStore.openingIdeas = [...importedOpeningIdeas, ...dataStore.openingIdeas];
  dataStore.bodyDrafts = [...importedBodyDrafts, ...dataStore.bodyDrafts];
  dataStore.lineMemos = [...importedLineMemos, ...dataStore.lineMemos];

  dedupeProjectTags();
  ensureWorkPlot(newProjectId);
  ensureProjectTitleTag(newProjectId, importedProject.title);
  ensureDefaultTags(newProjectId);
  ensureDefaultGenreTags(newProjectId);
  ensureDefaultCharacterProfileFields(importedProject);
  ensureEpisodeChapters(newProjectId);
  return importedProject.id;
}

export function importBackup(rawText: string) {
  const parsed = JSON.parse(rawText) as any;

  if (parsed?.format === 'novel-writing-tool-project') {
    return {
      type: 'project' as const,
      projectId: importProjectData(rawText),
    };
  }

  const importedData: AppData = parsed?.format === 'novel-writing-tool-app' && parsed?.data
    ? { ...defaultData(), ...parsed.data }
    : { ...defaultData(), ...parsed };

  dataStore.projects = importedData.projects ?? [];
  dataStore.characters = importedData.characters ?? [];
  dataStore.tags = importedData.tags ?? [];
  dataStore.terms = importedData.terms ?? [];
  dataStore.relationships = importedData.relationships ?? [];
  dataStore.workPlots = (importedData as any).workPlots ?? [];
  dataStore.chapters = (importedData as any).chapters ?? [];
  dataStore.episodes = importedData.episodes ?? [];
  dataStore.scenes = importedData.scenes ?? [];
  dataStore.characterAppearances = importedData.characterAppearances ?? [];
  dataStore.postStylePresets = importedData.postStylePresets ?? [];
  dataStore.openingIdeas = importedData.openingIdeas ?? [];
  dataStore.bodyDrafts = importedData.bodyDrafts ?? [];
  dataStore.lineMemos = importedData.lineMemos ?? [];

  transientStore.deletedItems = [];

  dataStore.projects.forEach((project) => {
    ensureWorkPlot(project.id);
    ensureProjectTitleTag(project.id, project.title);
    ensureDefaultTags(project.id);
    ensureDefaultGenreTags(project.id);
    ensureDefaultCharacterProfileFields(project);
    ensureEpisodeChapters(project.id);
  });
  dedupeWorkPlots();
  dataStore.characters.forEach((character) => {
    ensureCharacterVersions(character);
    applyActiveCharacterVersion(character);
  });
  dataStore.terms.forEach((term) => {
    ensureTermVersions(term);
    applyActiveTermVersion(term);
  });
  dataStore.scenes.forEach((scene) => {
    scene.openingText ??= '';
  });
  dataStore.tags.forEach((tag) => {
    if ((tag.status as string) === 'deleted') tag.status = 'hidden';
    if (legacyTagTypeMap[tag.type]) tag.type = legacyTagTypeMap[tag.type];
  });
  dedupeProjectTags();

  return {
    type: 'app' as const,
  };
}
