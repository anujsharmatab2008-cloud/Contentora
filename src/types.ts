export type VideoFormat = 'youtube-16-9' | 'shorts-9-16' | 'documentary' | 'explainer';

export type SectionTab =
  | 'overview'
  | 'packaging'
  | 'scenes'
  | 'audio'
  | 'seo'
  | 'publish';

export type ModelMode =
  | 'all-free-tier'
  | 'gemini-4-hydrogen'
  | 'gemini-4-hydrogen-balanced'
  | 'gemini-4-hydrogen-deep'
  | 'gemini-4-hydrogen-max'
  | 'gemini-3.1-flash-lite'
  | 'gemini-3.1-flash-lite-think'
  | 'groq:llama-3.3-70b-versatile'
  | 'groq:llama-3.1-8b-instant'
  | 'groq:qwen/qwen3-32b'
  | 'groq:openai/gpt-oss-120b'
  | 'openrouter:openrouter/free';

export type TtsModelId = 'gemini-3.8-flash-lite-tts' | 'gemini-3.8-flash-tts';

export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export type ThumbnailLayout = 'split-editorial' | 'bold-center' | 'cinematic-frame' | 'spotlight-minimal';

export type ThumbnailMotif = 'orbit' | 'waveform' | 'prism' | 'horizon-grid' | 'aperture' | 'peaks';

export interface TitleOption {
  title: string;
  angle: string;
}

export interface ThumbnailDesign {
  headline: string;
  subheadline: string;
  badgeText: string;
  accentColor: string;
  bgStart: string;
  bgEnd: string;
  layout: ThumbnailLayout;
  motif: ThumbnailMotif;
  imagePrompt: string;
  negativePrompt: string;
  customBgDataUrl?: string;
}

export interface SceneItem {
  sceneNumber: number;
  title: string;
  timestamp: string;
  durationSeconds: number;
  narration: string;
  voiceStyle: string;
  audioPrompt: string;
  videoPrompt: string;
  cameraMovement: string;
}

export interface HookVariation {
  style: string;
  spokenHook: string;
  visualCue: string;
}

export interface SocialPromoPack {
  xThread: string[];
  linkedInPost: string;
  instagramCaption: string;
  newsletterBlurb: string;
}

export interface VideoAnalysisResult {
  sourceUrl?: string;
  videoTitle: string;
  channelName?: string;
  hookBreakdown: string;
  whyItWorks: string[];
  contentGaps: string[];
  remixAngles: {
    title: string;
    hook: string;
    angle: string;
  }[];
}

export interface VideoKit {
  topic: string;
  format: VideoFormat;
  tone: string;
  primaryTitle: string;
  titleOptions: TitleOption[];
  hookVariations?: HookVariation[];
  description: string;
  pinnedComment?: string;
  communityPost?: string;
  socialPack?: SocialPromoPack;
  tags: string[];
  hashtags: string[];
  thumbnail: ThumbnailDesign;
  scenes: SceneItem[];
  modelsUsed: {
    scriptAndPrompts: string;
    hooksAndTags: string;
    audioSynthesisOptions: TtsModelId[];
  };
}

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  kit?: VideoKit;
}

export type ProjectStatus = 'draft' | 'scripted' | 'filmed' | 'published';

export interface VideoProject {
  id: string;
  title: string;
  topic: string;
  format: VideoFormat;
  status?: ProjectStatus;
  scheduledDate?: string;
  createdAt: number;
  updatedAt: number;
  turns: ChatTurn[];
}

export interface ChannelProfile {
  channelUrl?: string;
  channelHandle?: string;
  channelLogo?: string;
  channelName: string;
  niche: string;
  defaultCta: string;
  descriptionFooter: string;
}

export interface SceneAudioState {
  loading: boolean;
  audioUrl?: string;
  modelUsed?: TtsModelId;
  voiceName?: VoiceName;
  error?: string;
}
