import type { Caption, TextStyle } from './caption';

let lastTimeRef = 0;

/**
 * Find the current caption based on video time
 */
export function findCurrentCaption(
  captions: Caption[],
  currentTime: number
): Caption | undefined {
  const currentCaption = captions.find((caption) => {
    const duration = caption.end - caption.start;
    const effectiveEnd = duration < 0.05 ? caption.start + 0.2 : caption.end;
    const isWithinTime = currentTime >= caption.start && currentTime <= effectiveEnd;
    const wasCrossed = lastTimeRef < caption.start && currentTime >= caption.start;
    return isWithinTime || wasCrossed;
  });

  lastTimeRef = currentTime;
  return currentCaption;
}

/**
 * Get visible words for the current time (chunk-based)
 */
export function getVisibleWords(
  caption: Caption,
  currentTime: number,
  maxLines: number = 2,
  maxWordsPerLine: number = 0
): string[] {
  if (!caption.words || caption.words.length === 0) {
    return caption.text.split(' ');
  }

  const wordsPerChunk = maxWordsPerLine > 0 ? maxLines * maxWordsPerLine : 999;
  const playedWords = caption.words.filter((w) => w.start <= currentTime);
  const playedCount = playedWords.length;

  if (playedCount === 0) {
    return [];
  }

  const currentChunkIndex = Math.floor((playedCount - 1) / wordsPerChunk);
  const chunkStartIndex = currentChunkIndex * wordsPerChunk;
  const chunkEndIndex = Math.min(chunkStartIndex + wordsPerChunk, caption.words.length);

  const chunkWords = caption.words.slice(chunkStartIndex, chunkEndIndex);
  return chunkWords.map((w) => w.word);
}

/**
 * Format words into lines
 */
export function formatWordsIntoLines(
  words: string[],
  maxLines: number,
  maxWordsPerLine: number
): string[] {
  if (words.length === 0) return [];

  const lines: string[] = [];

  if (!maxWordsPerLine || maxWordsPerLine <= 0) {
    lines.push(words.join(' '));
    return lines.slice(0, maxLines);
  }

  for (let i = 0; i < words.length; i += maxWordsPerLine) {
    const lineWords = words.slice(i, i + maxWordsPerLine);
    lines.push(lineWords.join(' '));
    if (lines.length >= maxLines) {
      break;
    }
  }

  return lines;
}

/**
 * Apply text transformation
 */
export function applyTextTransform(
  text: string,
  transform: TextStyle['textTransform']
): string {
  switch (transform) {
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'capitalize':
      return text.replace(/\b\w/g, (char) => char.toUpperCase());
    default:
      return text;
  }
}

/**
 * Render subtitles on canvas with effects
 */
export function renderSubtitles(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  currentTime: number,
  captions: Caption[],
  textStyle: TextStyle,
  canvasWidth: number,
  canvasHeight: number,
  scale: number = 1,
  customYPosition: number = 150
) {
  const currentCaption = findCurrentCaption(captions, currentTime);
  if (!currentCaption) return;

  const fontWeight = textStyle.fontWeight === 'bold' ? 'bold' : 'normal';
  const fontStyle = textStyle.fontStyle === 'italic' ? 'italic' : 'normal';
  const scaledFontSize = Math.floor(textStyle.fontSize * scale);
  ctx.font = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${textStyle.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxLines = textStyle.maxLines || 2;
  const maxWordsPerLine = textStyle.maxWordsPerLine || 0;
  const visibleWords = getVisibleWords(currentCaption, currentTime, maxLines, maxWordsPerLine);
  const lines = formatWordsIntoLines(visibleWords, maxLines, maxWordsPerLine);

  const lineHeight = scaledFontSize * 1.2;
  const totalTextHeight = lines.length * lineHeight;

  let maxLineWidth = 0;
  lines.forEach((line) => {
    const metrics = ctx.measureText(line);
    maxLineWidth = Math.max(maxLineWidth, metrics.width);
  });

  const x = canvasWidth / 2;
  const y = canvasHeight - customYPosition * scale;
  const startY = y - totalTextHeight / 2 + lineHeight / 2;

  const padding = 20 * scale;
  if (textStyle.backgroundStyle === 'solid') {
    ctx.fillStyle = textStyle.backgroundColor;
    ctx.fillRect(
      x - maxLineWidth / 2 - padding,
      y - totalTextHeight / 2 - padding / 2,
      maxLineWidth + padding * 2,
      totalTextHeight + padding
    );
  }

  const timeSinceStart = currentTime - currentCaption.start;
  const progress = Math.min(1, timeSinceStart / (currentCaption.end - currentCaption.start));

  lines.forEach((line, lineIndex) => {
    const lineY = startY + lineIndex * lineHeight;
    const transformedLine = applyTextTransform(line, textStyle.textTransform);

    // Word-box effect renders text itself, skip normal rendering for this line
    if (textStyle.backgroundStyle === 'word-box') {
      renderWordBoxEffect(
        ctx,
        transformedLine,
        currentCaption,
        currentTime,
        x,
        lineY,
        scaledFontSize,
        textStyle,
        scale
      );
    } else {
      // Normal rendering for non-word-box styles
      if (
        textStyle.shadowBlur > 0 ||
        textStyle.shadowOffsetX !== 0 ||
        textStyle.shadowOffsetY !== 0
      ) {
        ctx.shadowColor = textStyle.shadowColor;
        ctx.shadowBlur = textStyle.shadowBlur * scale;
        ctx.shadowOffsetX = textStyle.shadowOffsetX * scale;
        ctx.shadowOffsetY = textStyle.shadowOffsetY * scale;
      }

      if (textStyle.strokeWidth > 0) {
        ctx.strokeStyle = textStyle.strokeColor;
        ctx.lineWidth = textStyle.strokeWidth * scale;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(transformedLine, x, lineY);
      }

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      if (textStyle.effect === 'none') {
        ctx.fillStyle = textStyle.color;
        ctx.fillText(transformedLine, x, lineY);
      } else if (textStyle.effect === 'highlight') {
        renderHighlightEffect(ctx, transformedLine, x, lineY, progress, textStyle);
      } else if (textStyle.effect === 'karaoke') {
        renderKaraokeEffect(ctx, transformedLine, x, lineY, progress, textStyle);
      } else if (textStyle.effect === 'typewriter') {
        renderTypewriterEffect(ctx, transformedLine, x, lineY, progress, textStyle);
      } else if (textStyle.effect === 'bounce') {
        renderBounceEffect(ctx, transformedLine, x, lineY, timeSinceStart, textStyle, scale);
      } else if (textStyle.effect === 'fade') {
        renderFadeEffect(ctx, transformedLine, x, lineY, progress, textStyle);
      }
    }
  });
}

function renderWordBoxEffect(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  line: string,
  caption: Caption,
  currentTime: number,
  x: number,
  y: number,
  fontSize: number,
  textStyle: TextStyle,
  scale: number
) {
  if (!caption.words || caption.words.length === 0) {
    // No word timing data, render all words without highlighting
    ctx.fillStyle = textStyle.color;
    ctx.fillText(line, x, y);
    return;
  }

  const words = line.split(' ');
  const playedWords = caption.words.filter((w) => w.start <= currentTime);
  const currentWordIndex = playedWords.length > 0 ? playedWords.length - 1 : -1;

  let currentX = x - ctx.measureText(line).width / 2;
  const globalStartIndex = caption.words.findIndex((w) => w.word.toLowerCase() === words[0].toLowerCase());

  words.forEach((word, wordIndex) => {
    const globalWordIndex = globalStartIndex + wordIndex;
    const isCurrentWord = globalWordIndex === currentWordIndex && globalWordIndex >= 0;

    // Only render if word has been spoken
    const hasBeenSpoken = globalWordIndex < playedWords.length;

    if (hasBeenSpoken || isCurrentWord) {
      // Draw background box for current word
      if (isCurrentWord) {
        const wordMetrics = ctx.measureText(word);
        const paddingX = fontSize * 0.3;
        const paddingY = fontSize * 0.2;
        const boxWidth = wordMetrics.width + paddingX * 2;
        const boxHeight = fontSize + paddingY * 2;
        const boxX = currentX - paddingX;
        const boxY = y - fontSize * 0.5 - paddingY;
        const borderRadius = 12 * scale;

        ctx.fillStyle = textStyle.backgroundColor;
        ctx.beginPath();
        if ('roundRect' in ctx) {
          (ctx as unknown as { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(boxX, boxY, boxWidth, boxHeight, borderRadius);
        } else {
          (ctx as CanvasRenderingContext2D).rect(boxX, boxY, boxWidth, boxHeight);
        }
        ctx.fill();
      }

      // Draw the word text
      ctx.fillStyle = textStyle.color;
      ctx.fillText(word, currentX, y);
    }

    currentX += ctx.measureText(word + ' ').width;
  });
}

function renderHighlightEffect(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  progress: number,
  textStyle: TextStyle
) {
  const words = line.split(' ');
  const currentWordIndex = Math.floor(words.length * progress);
  let currentX = x - ctx.measureText(line).width / 2;

  words.forEach((word, wordIndex) => {
    ctx.fillStyle = wordIndex === currentWordIndex ? textStyle.highlightColor : textStyle.color;
    ctx.fillText(word, currentX, y);
    currentX += ctx.measureText(word + ' ').width;
  });
}

function renderKaraokeEffect(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  progress: number,
  textStyle: TextStyle
) {
  const words = line.split(' ');
  const currentWordIndex = Math.floor(words.length * progress);
  let currentX = x - ctx.measureText(line).width / 2;

  words.forEach((word, wordIndex) => {
    ctx.fillStyle = wordIndex <= currentWordIndex ? textStyle.color : '#888888';
    ctx.fillText(word, currentX, y);
    currentX += ctx.measureText(word + ' ').width;
  });
}

function renderTypewriterEffect(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  progress: number,
  textStyle: TextStyle
) {
  const charsToShow = Math.floor(line.length * progress);
  const displayLine = line.substring(0, charsToShow);

  if (displayLine) {
    ctx.fillStyle = textStyle.color;
    ctx.fillText(displayLine, x, y);
  }
}

function renderBounceEffect(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  timeSinceStart: number,
  textStyle: TextStyle,
  scale: number
) {
  const words = line.split(' ');
  let currentX = x - ctx.measureText(line).width / 2;

  words.forEach((word, wordIndex) => {
    const bounceOffset = Math.sin(timeSinceStart * 10 + wordIndex * 0.5) * 8 * scale;
    ctx.fillStyle = textStyle.color;
    ctx.fillText(word, currentX, y + bounceOffset);
    currentX += ctx.measureText(word + ' ').width;
  });
}

function renderFadeEffect(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  progress: number,
  textStyle: TextStyle
) {
  const alpha = Math.min(1, progress * 3);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = textStyle.color;
  ctx.fillText(line, x, y);
  ctx.globalAlpha = 1;
}

/**
 * Reset the last time reference
 */
export function resetSubtitleRenderer() {
  lastTimeRef = 0;
}
