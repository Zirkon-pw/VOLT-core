import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@shared/ui/icon';
import {
  type HSVA,
  type RGBA,
  hsvaToRgba,
  rgbaToHsva,
  rgbaToHex,
  hexToRgba,
  parseColor,
  clampHsva,
  clampRgba,
} from './utils';
import styles from './ColorPicker.module.scss';

export interface ColorPreset {
  label: string;
  value: string | null;
}

interface ColorPickerProps {
  value: string | null;
  onChange: (color: string | null) => void;
  onPresetClick?: (color: string | null) => void;
  presets?: ColorPreset[];
  showAlpha?: boolean;
}

export function ColorPicker({ value, onChange, onPresetClick, presets, showAlpha = false }: ColorPickerProps) {
  const [hsva, setHsva] = useState<HSVA>(() => {
    if (!value) return { h: 0, s: 1, v: 1, a: 1 };
    const parsed = parseColor(value);
    return parsed ? rgbaToHsva(parsed) : { h: 0, s: 1, v: 1, a: 1 };
  });

  const [hexInput, setHexInput] = useState(() => {
    const rgba = hsvaToRgba(hsva);
    return rgbaToHex(rgba).replace('#', '');
  });

  useEffect(() => {
    if (!value) return;
    const parsed = parseColor(value);
    if (parsed) {
      const newHsva = rgbaToHsva(parsed);
      setHsva(newHsva);
      setHexInput(rgbaToHex(parsed).replace('#', ''));
    }
  }, [value]);

  const emitChange = useCallback(
    (h: HSVA) => {
      const clamped = clampHsva(h);
      setHsva(clamped);
      const rgba = hsvaToRgba(clamped);
      const hex = rgbaToHex(rgba);
      setHexInput(hex.replace('#', ''));
      if (clamped.a < 1) {
        onChange(`rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${Math.round(clamped.a * 100) / 100})`);
      } else {
        onChange(hex);
      }
    },
    [onChange],
  );

  const satAreaRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const alphaRef = useRef<HTMLDivElement>(null);

  const handleSatPointer = useCallback(
    (e: PointerEvent) => {
      const rect = satAreaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
      emitChange({ ...hsva, s, v });
    },
    [hsva, emitChange],
  );

  const handleHuePointer = useCallback(
    (e: PointerEvent) => {
      const rect = hueRef.current?.getBoundingClientRect();
      if (!rect) return;
      const h = Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360));
      emitChange({ ...hsva, h });
    },
    [hsva, emitChange],
  );

  const handleAlphaPointer = useCallback(
    (e: PointerEvent) => {
      const rect = alphaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const a = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      emitChange({ ...hsva, a });
    },
    [hsva, emitChange],
  );

  // Use window-level listeners instead of setPointerCapture to avoid
  // conflicts with Tippy.js (BubbleMenu). Pointer capture redirects events
  // which makes Tippy think the pointer left the tooltip.
  const startDrag = (
    handler: (e: PointerEvent) => void,
    initialEvent: React.PointerEvent,
  ) => {
    initialEvent.preventDefault();
    initialEvent.stopPropagation();
    handler(initialEvent.nativeEvent);

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      handler(e);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleHexCommit = () => {
    const parsed = hexToRgba(hexInput);
    if (parsed) {
      const clamped = clampRgba(parsed);
      const newHsva = rgbaToHsva(clamped);
      emitChange({ ...newHsva, a: showAlpha ? newHsva.a : hsva.a });
    } else {
      setHexInput(rgbaToHex(hsvaToRgba(hsva)).replace('#', ''));
    }
  };

  const handleRgbaField = (field: keyof RGBA, raw: string) => {
    const num = parseInt(raw, 10);
    if (isNaN(num)) return;
    const rgba = hsvaToRgba(hsva);
    const updated: RGBA = { ...rgba, [field]: field === 'a' ? num / 100 : num };
    emitChange(rgbaToHsva(clampRgba(updated)));
  };

  const handlePresetClick = (color: string | null) => {
    onChange(color);
    onPresetClick?.(color);
  };

  const rgba = hsvaToRgba(hsva);
  const hueColor = `hsl(${Math.round(hsva.h)}, 100%, 50%)`;
  const currentHex = rgbaToHex(rgba);

  const stopPointerPropagation = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const stopMousePropagation = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const stopInputMousePropagation = (e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation();
  };

  return (
    <div
      className={styles.picker}
      data-testid="color-picker"
      onMouseDown={stopMousePropagation}
      onPointerDown={stopPointerPropagation}
      onClick={(e) => e.stopPropagation()}
    >
      {presets && presets.length > 0 && (
        <div className={styles.presets}>
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              data-testid="color-picker-preset"
              className={`${styles.presetSwatch} ${value === p.value ? styles.presetActive : ''}`}
              style={{ background: p.value ?? 'transparent' }}
              onClick={() => handlePresetClick(p.value)}
              title={p.label}
            >
              {p.value == null && <Icon name="close" size={10} />}
            </button>
          ))}
        </div>
      )}

      <div
        ref={satAreaRef}
        className={styles.saturationArea}
        data-testid="color-picker-saturation"
        style={{ backgroundColor: hueColor }}
        onPointerDown={(e) => startDrag(handleSatPointer, e)}
      >
        <div className={styles.satWhite} />
        <div className={styles.satBlack} />
        <div
          className={styles.satThumb}
          style={{
            left: `${hsva.s * 100}%`,
            top: `${(1 - hsva.v) * 100}%`,
            backgroundColor: currentHex,
          }}
        />
      </div>

      <div
        ref={hueRef}
        className={styles.hueSlider}
        data-testid="color-picker-hue"
        onPointerDown={(e) => startDrag(handleHuePointer, e)}
      >
        <div
          className={styles.sliderThumb}
          style={{ left: `${(hsva.h / 360) * 100}%` }}
        />
      </div>

      {showAlpha && (
        <div
          ref={alphaRef}
          className={styles.alphaSlider}
          data-testid="color-picker-alpha"
          onPointerDown={(e) => startDrag(handleAlphaPointer, e)}
        >
          <div
            className={styles.alphaGradient}
            style={{
              background: `linear-gradient(to right, transparent, ${rgbaToHex({ ...rgba, a: 1 })})`,
            }}
          />
          <div
            className={styles.sliderThumb}
            style={{ left: `${hsva.a * 100}%` }}
          />
        </div>
      )}

      <div className={styles.inputRow}>
        <div
          className={styles.preview}
          style={{ backgroundColor: hsva.a < 1 ? `rgba(${rgba.r},${rgba.g},${rgba.b},${hsva.a})` : currentHex }}
        />
        <div className={styles.fieldGroup}>
          <label className={styles.field}>
            <span>#</span>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onBlur={handleHexCommit}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') handleHexCommit();
              }}
              onMouseDown={stopInputMousePropagation}
              maxLength={8}
            />
          </label>
          <label className={styles.field}>
            <span>R</span>
            <input
              type="number"
              min={0}
              max={255}
              value={rgba.r}
              onChange={(e) => handleRgbaField('r', e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onMouseDown={stopInputMousePropagation}
            />
          </label>
          <label className={styles.field}>
            <span>G</span>
            <input
              type="number"
              min={0}
              max={255}
              value={rgba.g}
              onChange={(e) => handleRgbaField('g', e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onMouseDown={stopInputMousePropagation}
            />
          </label>
          <label className={styles.field}>
            <span>B</span>
            <input
              type="number"
              min={0}
              max={255}
              value={rgba.b}
              onChange={(e) => handleRgbaField('b', e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onMouseDown={stopInputMousePropagation}
            />
          </label>
          {showAlpha && (
            <label className={styles.field}>
              <span>A</span>
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(hsva.a * 100)}
                onChange={(e) => handleRgbaField('a', e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                onMouseDown={stopInputMousePropagation}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
