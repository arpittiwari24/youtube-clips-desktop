export type Caption = {
  start: number;
  end: number;
  text: string;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
};

export type TextStyle = {
  // Font properties
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';

  // Colors
  color: string;
  backgroundColor: string;
  highlightColor: string;

  // Background style
  backgroundStyle: 'none' | 'solid' | 'gradient' | 'outline' | 'word-box';

  // Text effects
  effect: 'none' | 'highlight' | 'karaoke' | 'typewriter' | 'bounce' | 'fade';

  // Layout
  maxLines: number;
  maxWordsPerLine: number;

  // Stroke/Outline
  strokeColor: string;
  strokeWidth: number;

  // Shadow
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
};

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Komika',
  fontSize: 72,
  color: '#FFFFFF',
  backgroundColor: 'transparent',
  backgroundStyle: 'none',
  effect: 'none',
  highlightColor: '#FFFFFF',
  fontWeight: 'bold',
  fontStyle: 'normal',
  textTransform: 'uppercase',
  maxLines: 1,
  maxWordsPerLine: 2,
  strokeColor: '#000000',
  strokeWidth: 14,
  shadowColor: '#FFFFFF',
  shadowBlur: 18,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
};

export interface SubtitleStyleTemplate extends TextStyle {
  id: string;
  name: string;
  category: 'modern' | 'classic' | 'bold' | 'minimal';
}

export const CAPTION_STYLES: SubtitleStyleTemplate[] = [
  // BEAST STYLE - Bold uppercase text with strong black stroke (MrBeast style)
  {
    id: 'beast',
    name: 'Beast',
    category: 'bold',
    fontFamily: 'Komika',
    fontSize: 72,
    color: '#FFFFFF',
    backgroundColor: 'transparent',
    backgroundStyle: 'none',
    effect: 'none',
    highlightColor: '#FFFFFF',
    fontWeight: 'bold',
    fontStyle: 'normal',
    textTransform: 'uppercase',
    maxLines: 1,
    maxWordsPerLine: 2,
    strokeColor: '#000000',
    strokeWidth: 14,
    shadowColor: '#FFFFFF',
    shadowBlur: 18,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  },
];
