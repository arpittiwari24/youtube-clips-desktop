/**
 * Generate ASS subtitle file from captions with styling
 */
export interface Caption {
  start: number;
  end: number;
  text: string;
}

export interface SubtitleStyle {
  fontName: string;
  fontSize: number;
  primaryColor: string; // &H00BBGGRR format
  outlineColor: string;
  outlineWidth: number;
  bold: boolean;
  uppercase: boolean;
  shadowColor?: string; // &H00BBGGRR format
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

export function generateASS(captions: Caption[], style: SubtitleStyle): string {
  const ass: string[] = [];

  // ASS Header
  ass.push('[Script Info]');
  ass.push('ScriptType: v4.00+');
  ass.push('PlayResX: 1920');
  ass.push('PlayResY: 1080');
  ass.push('');

  // Styles
  ass.push('[V4+ Styles]');
  ass.push(
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding'
  );

  const bold = style.bold ? '-1' : '0';
  const fontSize = Math.round(style.fontSize);
  const outline = Math.round(style.outlineWidth);

  // Shadow/Glow effect: Use shadowBlur directly for strong glow
  // ASS shadow doesn't blur like canvas, so we need larger values
  const shadow = style.shadowBlur ? Math.round(style.shadowBlur * 0.8) : 0;

  // Use shadowColor for BackColour (shadow color in ASS)
  // If no shadowColor, use transparent black
  const backColor = style.shadowColor || '&H00000000';

  ass.push(
    `Style: Default,${style.fontName},${fontSize},${style.primaryColor},&H000000FF,${style.outlineColor},${backColor},${bold},0,0,0,100,100,0,0,1,${outline},${shadow},2,10,10,80,1`
  );
  ass.push('');

  // Events
  ass.push('[Events]');
  ass.push('Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text');

  captions.forEach((caption) => {
    const startTime = formatASSTime(caption.start);
    const endTime = formatASSTime(caption.end);
    let text = caption.text;

    if (style.uppercase) {
      text = text.toUpperCase();
    }

    ass.push(`Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${text}`);
  });

  return ass.join('\n');
}

function formatASSTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const centisecs = Math.floor((seconds % 1) * 100);

  return `${hours}:${pad(minutes, 2)}:${pad(secs, 2)}.${pad(centisecs, 2)}`;
}

function pad(num: number, size: number): string {
  let s = num.toString();
  while (s.length < size) s = '0' + s;
  return s;
}

// Convert HTML/CSS color to ASS color (&H00BBGGRR)
export function colorToASS(hexColor: string): string {
  // Remove # if present
  hexColor = hexColor.replace('#', '');

  // Parse RGB
  const r = parseInt(hexColor.substr(0, 2), 16);
  const g = parseInt(hexColor.substr(2, 2), 16);
  const b = parseInt(hexColor.substr(4, 2), 16);

  // ASS format is &H00BBGGRR
  return `&H00${toHex(b)}${toHex(g)}${toHex(r)}`;
}

function toHex(n: number): string {
  const hex = n.toString(16).toUpperCase();
  return hex.length === 1 ? '0' + hex : hex;
}
