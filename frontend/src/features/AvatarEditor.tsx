import { useState } from 'react';
import { useApp } from '../app/context';
import { spriteFor } from '../app/sprite';
import { ErrorText } from '../components/ui/shared';
import { PlantSprite, SPRITE_SWATCHES } from '../components/sprites';
import type { DrawnStroke } from '../components/sprites/types';
import { FaceDrawingPad } from './FaceDrawingPad';

export function AvatarEditor({ onBack }: { onBack: () => void }) {
  const { store, perform, toast, busy: saving } = useApp();
  const current = spriteFor(store, store.activeUserId);
  const [colour, setColour] = useState<string>(current.bodyColor);
  const [face, setFace] = useState<'default' | 'drawn'>(current.face.kind === 'drawn' ? 'drawn' : 'default');
  const [strokes, setStrokes] = useState<DrawnStroke[]>(current.face.kind === 'drawn' ? current.face.strokes : []);
  const [error, setError] = useState('');

  const previewFace = face === 'drawn' ? (strokes.length ? { kind: 'drawn' as const, strokes } : { kind: 'none' as const }) : { kind: 'default' as const };

  async function save() {
    const result = await perform({ type: 'update-sprite', colour, face, ...(face === 'drawn' ? { strokes } : {}) });
    if (!result.ok) { setError(result.error); return; }
    toast('Avatar saved.'); onBack();
  }

  return <main className="app-scroll avatar-editor" aria-label="Edit avatar">

    <div className="avatar-editor__stage">
      <PlantSprite bodyColor={colour} topper={current.topper} face={previewFace} size={120} animation="squish" label="Avatar preview" />
    </div>

    <section className="avatar-editor__section" aria-labelledby="avatar-colour">
      <h3 id="avatar-colour">Colour</h3>
      <div className="swatches" role="radiogroup" aria-label="Body colour">
        {SPRITE_SWATCHES.map(c => <button key={c} type="button" role="radio" aria-checked={colour === c} aria-label={c}
          className="swatch" style={{ background: c }} onClick={() => setColour(c)} />)}
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
      <button className="button primary" type="button" disabled={saving || (face === 'drawn' && !strokes.length)} onClick={save}>Save avatar</button>
    </div>
  </main>;
}
