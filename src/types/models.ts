export type ID = string;

export type TagSource = 'default' | 'user';
export type Status = 'active' | 'hidden';
export type OpeningStatus = 'candidate' | 'adopted' | 'hold' | 'rejected';
export type BodyStatus = 'draft' | 'writing' | 'review' | 'completed' | 'posted' | 'hold';
export type MemoType = 'revision' | 'foreshadowing' | 'characterEmotion' | 'description' | 'caution' | 'prePostCheck';
export type AppearanceType = 'main' | 'sub' | 'nameOnly' | 'flashback' | 'conversationOnly' | 'related';
export type ProfileFieldSource = 'default' | 'user';
export type ProfileFieldStatus = 'active' | 'hidden';
export type ProfileFieldInputType = 'text' | 'textarea' | 'number' | 'select';

export interface NovelProject {
  id: ID;
  title: string;
  genre: string;
  genreTagId?: ID;
  genreTagIds?: ID[];
  customTagTypes?: string[];
  characterProfileFields?: CharacterProfileField[];
  summary: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterProfileField {
  id: ID;
  label: string;
  order: number;
  section?: string;
  source?: ProfileFieldSource;
  status?: ProfileFieldStatus;
  fieldKey?: string;
  inputType?: ProfileFieldInputType;
  selectOptions?: string[];
}

export interface CharacterCustomField {
  id: ID;
  templateId?: ID;
  label: string;
  value: string;
  order: number;
}

export interface CharacterVersionData {
  name: string;
  ruby: string;
  color: string;
  alias: string;
  age: string;
  gender: string;
  birthday: string;
  race: string;
  affiliation: string;
  origin: string;
  height: string;
  weight: string;
  role: string;
  personality: string;
  goal: string;
  behaviorPrinciple: string;
  likes: string;
  dislikes: string;
  weakness: string;
  secret: string;
  battleStyle: string;
  weapon: string;
  magic: string;
  firstPerson: string;
  secondPerson: string;
  speechStyle: string;
  skill: string;
  appearance: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  build: string;
  clothing: string;
  equipment: string;
  tagIds: ID[];
  memo: string;
  customFields: CharacterCustomField[];
}

export interface CharacterVersion extends CharacterVersionData {
  id: ID;
  createdAt: string;
  updatedAt: string;
  baseSnapshot?: CharacterVersionData;
}

export interface Character {
  id: ID;
  projectId: ID;
  name: string;
  ruby: string;
  color: string;
  alias: string;
  age: string;
  gender: string;
  birthday: string;
  race: string;
  affiliation: string;
  origin: string;
  height: string;
  weight: string;
  role: string;
  personality: string;
  goal: string;
  behaviorPrinciple: string;
  likes: string;
  dislikes: string;
  weakness: string;
  secret: string;
  battleStyle: string;
  weapon: string;
  magic: string;
  firstPerson: string;
  secondPerson: string;
  speechStyle: string;
  skill: string;
  appearance: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  build: string;
  clothing: string;
  equipment: string;
  tagIds: ID[];
  memo: string;
  customFields: CharacterCustomField[];
  versions?: CharacterVersion[];
  activeVersionId?: ID;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: ID;
  projectId: ID;
  name: string;
  ruby?: string;
  type: string;
  category?: string;
  color: string;
  relatedTagIds: ID[];
  summaryItems?: TagSummaryItem[];
  description?: string;
  shortDescription?: string;
  memo: string;
  source: TagSource;
  status: Status;
  versions?: TagVersion[];
  activeVersionId?: ID;
  createdAt: string;
  updatedAt: string;
}

export interface TagSummaryItem {
  id: ID;
  title: string;
  content: string;
}

export interface TagVersionData {
  name: string;
  ruby?: string;
  type: string;
  category?: string;
  color: string;
  relatedTagIds: ID[];
  summaryItems: TagSummaryItem[];
  description?: string;
  shortDescription?: string;
  memo: string;
  status: Status;
}

export interface TagVersion extends TagVersionData {
  id: ID;
  createdAt: string;
  updatedAt: string;
  baseSnapshot?: TagVersionData;
}

export interface Term {
  id: ID;
  projectId: ID;
  name: string;
  ruby: string;
  category: string;
  description: string;
  shortDescription: string;
  firstEpisodeId?: ID;
  firstSceneId?: ID;
  relatedCharacterIds: ID[];
  relatedPlotIds: ID[];
  relatedTagIds: ID[];
  spoilerInfo: string;
  publicInfo: string;
  memo: string;
  versions?: TermVersion[];
  activeVersionId?: ID;
  createdAt: string;
  updatedAt: string;
}

export interface TermVersionData {
  name: string;
  ruby: string;
  category: string;
  description: string;
  shortDescription: string;
  firstEpisodeId?: ID;
  firstSceneId?: ID;
  relatedCharacterIds: ID[];
  relatedPlotIds: ID[];
  relatedTagIds: ID[];
  spoilerInfo: string;
  publicInfo: string;
  memo: string;
}

export interface TermVersion extends TermVersionData {
  id: ID;
  createdAt: string;
  updatedAt: string;
  baseSnapshot?: TermVersionData;
}

export interface Relationship {
  id: ID;
  projectId: ID;
  characterAId: ID;
  characterBId: ID;
  relationType: string;
  emotionAtoB: string;
  emotionBtoA: string;
  publicRelation: string;
  hiddenRelation: string;
  changePlan: string;
  tagIds: ID[];
  memo: string;
}

export interface MiddleEvent {
  id: ID;
  order: number;
  title: string;
  content: string;
  purpose: string;
  change: string;
  relatedCharacterIds: ID[];
  relatedTermIds: ID[];
  relatedTagIds: ID[];
  memo: string;
}

export interface WorkPlot {
  id: ID;
  projectId: ID;
  theme: string;
  beginning: string;
  climax: string;
  ending: string;
  protagonistStart: string;
  protagonistEnd: string;
  mainMystery: string;
  finalTruth: string;
  foreshadowing: string;
  memo: string;
  middleEvents: MiddleEvent[];
}

export interface Chapter {
  id: ID;
  projectId: ID;
  number: number;
  title: string;
  purpose: string;
  flow: string;
  memo: string;
}

export interface Episode {
  id: ID;
  projectId: ID;
  chapterId?: ID;
  number: number;
  title: string;
  purpose: string;
  startSituation: string;
  mainEvent: string;
  revealInfo: string;
  hiddenInfo: string;
  foreshadowing: string;
  endingHook: string;
  characterIds: ID[];
  tagIds: ID[];
  memo: string;
}

export interface Scene {
  id: ID;
  projectId: ID;
  episodeId: ID;
  title: string;
  location: string;
  time: string;
  event: string;
  conversationPurpose: string;
  conflict: string;
  result: string;
  nextHook: string;
  openingText: string;
  characterIds: ID[];
  tagIds: ID[];
  memo: string;
}

export interface CharacterAppearance {
  id: ID;
  projectId: ID;
  characterId: ID;
  episodeId?: ID;
  sceneId?: ID;
  appearanceType: AppearanceType;
  memo: string;
}

export interface PostStylePreset {
  id: ID;
  projectId: ID;
  name: string;
  platform: string;
  lineBreakLevel: number;
  sentenceLength: 'short' | 'medium' | 'long';
  dialogueAmount: number;
  descriptionAmount: number;
  hookStrength: number;
  rubyEnabled: boolean;
  memo: string;
}

export interface OpeningIdea {
  id: ID;
  projectId: ID;
  sourceType: 'workPlot' | 'episode' | 'scene' | 'character' | 'tag' | 'term';
  sourceId: ID;
  type: string;
  text: string;
  score: number;
  usedCharacterIds: ID[];
  usedTagIds: ID[];
  usedTermIds: ID[];
  postStylePresetId?: ID;
  memo: string;
  status: OpeningStatus;
  createdAt: string;
}

export interface LineMemo {
  id: ID;
  projectId: ID;
  episodeId?: ID;
  sceneId?: ID;
  bodyId: ID;
  blockId: string;
  lineNumber: number;
  targetText: string;
  beforeText: string;
  afterText: string;
  memoType: MemoType;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface BodyDraft {
  id: ID;
  projectId: ID;
  episodeId?: ID;
  sceneId?: ID;
  title: string;
  content: string;
  postStylePresetId?: ID;
  sourceOpeningIdeaId?: ID;
  status: BodyStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  projects: NovelProject[];
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
}
