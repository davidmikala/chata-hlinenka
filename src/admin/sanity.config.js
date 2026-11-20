import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { csCZLocale } from '@sanity/locale-cs-cz';
import project from '../content/sanity-project.js';
import { schemaTypes } from './schema.js';

const SINGLETON = 'sitePhotos';

export default defineConfig({
  name: 'chata-hlinenka',
  title: 'Chata Hliněnka – správa fotek',
  basePath: '/admin',
  projectId: project.projectId,
  dataset: project.dataset,

  plugins: [
    // v administraci je jen jedna položka: „Fotky na webu“
    structureTool({
      title: 'Obsah',
      structure: (S) =>
        S.list()
          .title('Obsah webu')
          .items([S.listItem().title('Fotky na webu').id(SINGLETON).child(S.document().schemaType(SINGLETON).documentId(SINGLETON).title('Fotky na webu'))]),
    }),
    csCZLocale(),
  ],

  schema: {
    types: schemaTypes,
    // jediný dokument nejde vytvořit znovu ani smazat
    templates: (templates) => templates.filter(({ schemaType }) => schemaType !== SINGLETON),
  },

  document: {
    actions: (actions, { schemaType }) =>
      schemaType === SINGLETON ? actions.filter(({ action }) => ['publish', 'discardChanges', 'restore'].includes(action)) : actions,
    newDocumentOptions: (prev) => prev.filter((item) => item.templateId !== SINGLETON),
  },
});
