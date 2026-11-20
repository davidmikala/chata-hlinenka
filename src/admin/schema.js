import { defineField, defineType, defineArrayMember } from 'sanity';
import { GROUPS, SLOTS } from '../content/photo-slots.js';

/** Popisek fotky (pro vyhledávače a nevidomé) */
const altField = defineField({
  name: 'alt',
  title: 'Popis fotky',
  type: 'string',
  description: 'Krátce, co je na fotce (např. „Ložnice s výhledem do lesa“). Pomáhá vyhledávačům.',
});

const photoField = (s) =>
  defineField({
    name: s.key,
    title: s.title,
    type: 'image',
    group: s.group,
    description: 'Klikněte na fotku a pak na ikonu ořezu (✂) – tečkou určíte, co má zůstat vidět i při ořezu na mobilu.',
    options: { hotspot: true },
    fields: [altField],
  });

/** Jediný dokument „Fotky na webu“ – všechny fotky rozdělené do záložek podle sekcí */
export const sitePhotos = defineType({
  name: 'sitePhotos',
  title: 'Fotky na webu',
  type: 'document',
  groups: GROUPS,
  fields: [
    ...SLOTS.map(photoField),
    defineField({
      name: 'gallery',
      title: 'Galerie',
      type: 'array',
      group: 'galerie',
      description:
        'Pořadí můžete měnit přetažením. První 4 fotky = 1. řada, další 4 = 2. řada, zbytek je v posuvníku. Fotky přidáte tlačítkem „Přidat položku“ nebo přetažením z počítače.',
      options: { layout: 'grid' },
      of: [defineArrayMember({ type: 'image', options: { hotspot: true }, fields: [altField] })],
    }),
  ],
  preview: { prepare: () => ({ title: 'Fotky na webu' }) },
});

export const schemaTypes = [sitePhotos];
