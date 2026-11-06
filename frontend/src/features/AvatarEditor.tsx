import { useState } from 'react';
import { useApp } from '../app/context';
import { spriteFor } from '../app/sprite';
import { Icon } from '../components/Icon';
import { ErrorText } from '../components/ui/shared';
import { PlantSprite, SPRITE_SWATCHES } from '../components/sprites';
import type { DrawnStroke } from '../components/sprites/types';
import { FaceDrawingPad } from './FaceDrawingPad';

// Customise your plant: body colour, and a default or hand-drawn face.
export function AvatarEditor({ onBack }: { onBack: () => void }) {
  const { store, perform, toast } = useApp();
  const current = spriteFor(store, store.activeUserId);
  const [colour, setColour] = useState(current.bodyColor.toUpperCase());
  const [face, setFace] = useState<'default' | 'drawn'>(current.face.kind === 'drawn' ? 'drawn' : 'default');
  const [strokes, setStrokes] = useState<DrawnStroke[]>(current.face.kind === 'drawn' ? current.face.strokes : []);
  const [error, setError] = useState('');

  const previewFace = face === 'drawn' ? (strokes.length ? { kind: 'drawn' as const, strokes } : { kind: 'none' as const }) : { kind: 'default' as const };
  const isSwatch = (SPRITE_SWATCHES as readonly string[]).includes(colour);

  function save() {
    const result = perform({ type: 'update-sprite', colour, face, ...(face === 'drawn' ? { strokes } : {}) });
    if (!result.ok) { setError(result.error); return; }
    toast('Avatar saved.'); onBack();
  }

  return <main className="app-scroll avatar-editor" aria-label="Edit avatar">
    <div className="avatar-editor__top">
      <button type="button" className="plain-icon" aria-label="Back to profile" onClick={onBack}><Icon name="back" width={24} /></button>
      <h2>Edit avatar</h2>
    </div>

    <div className="avatar-editor__stage">
      <PlantSprite bodyColor={colour} topper={current.topper} face={previewFace} size={120} animation="squish" label="Avatar preview" />
    </div>

    <section className="avatar-editor__section" aria-labelledby="avatar-colour">
      <h3 id="avatar-colour">Colour</h3>
      <div className="swatches" role="radiogroup" aria-label="Body colour">
        {SPRITE_SWATCHES.map(c => <button key={c} type="button" role="radio" aria-checked={colour === c} aria-label={c}
          className="swatch" style={{ background: c }} onClick={() => setColour(c)} />)}
        <label className={`swatch swatch--custom${isSwatch ? '' : ' is-selected'}`} title="Custom colour"
          style={isSwatch ? undefined : { background: colour }}>
          <span className="sr-only">Custom colour</span>
          <input type="color" value={colour.toLowerCase()} onChange={e => setColour(e.target.value.toUpperCase())} />
          {isSwatch && <span aria-hidden="true">+</span>}
        </label>
      </div>
    </section>

    <section className="avatar-editor__section" aria-labelledby="avatar-face">
      <h3 id="avatar-face">Face</h3>
      <div className="face-choice" role="radiogroup" aria-label="Face">
        <button type="button" role="radio" aria-checked={face === 'default'} className="face-choice__option" onClick={() => setFace('default')}>
          <PlantSprite crop="head" bodyColor={colour} topper="none" face={{ kind: 'default' }} size={56} label="" />
          <span>Default</span>
        </button>
        <button type="button" role="radio" aria-checked={face === 'drawn'} className="face-choice__option" onClick={() => setFace('drawn')}>
          <PlantSprite crop="head" bodyColor={colour} topper="none" face={strokes.length ? { kind: 'drawn', strokes } : { kind: 'none' }} size={56} label="" />
          <span>Draw your own</span>
        </button>
      </div>
      {face === 'drawn' && <FaceDrawingPad bodyColor={colour} topper={current.topper} strokes={strokes} onChange={setStrokes} />}
    </section>

    <ErrorText text={error} />
    <div className="form-actions avatar-editor__actions">
      <button className="button" type="button" onClick={onBack}>Cancel</button>
      <button className="button primary" type="button" disabled={face === 'drawn' && !strokes.length} onClick={save}>Save avatar</button>
    </div>
  </main>;
}
