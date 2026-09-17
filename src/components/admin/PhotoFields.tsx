"use client";

import { useId, useState, type ChangeEvent, type FocusEvent } from "react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { TagInput } from "@/components/ui/TagInput";
import { Toggle } from "@/components/ui/Toggle";
import type { PatchPhotoInput, Photo, PhotoFormat } from "@/lib/admin-api";

type Props = {
  photo: Photo;
  onChange: (partial: PatchPhotoInput) => void;
  suggestions?: string[];
};

export const FORMAT_OPTIONS: { value: PhotoFormat; label: string }[] = [
  { value: "DIGITAL", label: "Digital" },
  { value: "FILM_35MM", label: "35mm film" },
  { value: "FILM_120MM", label: "120 film" },
];

/**
 * Buffers a text field locally so typing doesn't fire `onChange` on every
 * keystroke; commits (and reports whether the value actually changed) on
 * blur, and re-syncs from the prop when it changes elsewhere (e.g. an AI
 * tagging suggestion landing after upload).
 */
function useCommitOnBlur(initial: string, onCommit: (value: string) => void) {
  const [prevInitial, setPrevInitial] = useState(initial);
  const [value, setValue] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setValue(initial);
  }
  const onBlur = () => {
    if (value !== initial) onCommit(value);
  };
  return { value, onValueChange: setValue, onBlur };
}

export function PhotoFields({ photo, onChange, suggestions }: Props) {
  const uid = useId();

  const title = useCommitOnBlur(photo.title, (value) => onChange({ title: value }));
  const location = useCommitOnBlur(photo.location ?? "", (value) => onChange({ location: value }));
  const caption = useCommitOnBlur(photo.caption ?? "", (value) => onChange({ caption: value }));
  const camera = useCommitOnBlur(photo.camera ?? "", (value) => onChange({ camera: value }));
  const lens = useCommitOnBlur(photo.lens ?? "", (value) => onChange({ lens: value }));
  const focalLength = useCommitOnBlur(photo.focalLength ?? "", (value) => onChange({ focalLength: value }));
  const aperture = useCommitOnBlur(photo.aperture ?? "", (value) => onChange({ aperture: value }));
  const shutterSpeed = useCommitOnBlur(photo.shutterSpeed ?? "", (value) => onChange({ shutterSpeed: value }));
  const iso = useCommitOnBlur(photo.iso ?? "", (value) => onChange({ iso: value }));
  const filmStock = useCommitOnBlur(photo.filmStock ?? "", (value) => onChange({ filmStock: value }));
  const filmFormat = useCommitOnBlur(photo.filmFormat ?? "", (value) => onChange({ filmFormat: value }));

  const isFilm = photo.format !== "DIGITAL";

  function textField<E extends HTMLInputElement | HTMLTextAreaElement>(
    field: { value: string; onValueChange: (v: string) => void; onBlur: (e: FocusEvent<E>) => void },
    id: string,
  ) {
    return {
      id,
      value: field.value,
      onChange: (e: ChangeEvent<E>) => field.onValueChange(e.target.value),
      onBlur: field.onBlur,
    };
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Field label="Title" htmlFor={`${uid}-title`}>
          <Input {...textField<HTMLInputElement>(title, `${uid}-title`)} />
        </Field>
        <p className="font-mono text-[11px] text-faint">/{photo.slug}</p>
      </div>

      <Field label="Tags" htmlFor={`${uid}-tags`}>
        <TagInput
          id={`${uid}-tags`}
          value={photo.tags}
          onChange={(next) => onChange({ tags: next })}
          suggestions={suggestions}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Format" htmlFor={`${uid}-format`}>
          <Select
            id={`${uid}-format`}
            value={photo.format}
            onChange={(e) => onChange({ format: e.target.value as PhotoFormat })}
          >
            {FORMAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Location" htmlFor={`${uid}-location`}>
          <Input {...textField<HTMLInputElement>(location, `${uid}-location`)} />
        </Field>
      </div>

      {isFilm && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Film stock" htmlFor={`${uid}-filmStock`}>
            <Input {...textField<HTMLInputElement>(filmStock, `${uid}-filmStock`)} />
          </Field>
          <Field label="Film format" htmlFor={`${uid}-filmFormat`}>
            <Input {...textField<HTMLInputElement>(filmFormat, `${uid}-filmFormat`)} />
          </Field>
        </div>
      )}

      <Field label="Caption" htmlFor={`${uid}-caption`}>
        <Textarea {...textField<HTMLTextAreaElement>(caption, `${uid}-caption`)} />
      </Field>

      <Toggle checked={photo.featured} onChange={(next) => onChange({ featured: next })} label="Featured on home page" />

      <div className="grid grid-cols-3 gap-3">
        <Field label="Camera" htmlFor={`${uid}-camera`}>
          <Input {...textField<HTMLInputElement>(camera, `${uid}-camera`)} />
        </Field>
        <Field label="Lens" htmlFor={`${uid}-lens`}>
          <Input {...textField<HTMLInputElement>(lens, `${uid}-lens`)} />
        </Field>
        <Field label="Focal length" htmlFor={`${uid}-focalLength`}>
          <Input {...textField<HTMLInputElement>(focalLength, `${uid}-focalLength`)} />
        </Field>
        <Field label="Aperture" htmlFor={`${uid}-aperture`}>
          <Input {...textField<HTMLInputElement>(aperture, `${uid}-aperture`)} />
        </Field>
        <Field label="Shutter speed" htmlFor={`${uid}-shutterSpeed`}>
          <Input {...textField<HTMLInputElement>(shutterSpeed, `${uid}-shutterSpeed`)} />
        </Field>
        <Field label="ISO" htmlFor={`${uid}-iso`}>
          <Input {...textField<HTMLInputElement>(iso, `${uid}-iso`)} />
        </Field>
      </div>
    </div>
  );
}
