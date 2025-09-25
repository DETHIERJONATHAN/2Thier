import { Block, Section, Field, FieldOption } from '@prisma/client';

// Helper pour adapter la structure de données du block pour le frontend
export const adaptBlockStructure = (block: (Block & { Section: (Section & { Field: (Field & { FieldOption: FieldOption[] })[] })[] })) => {
  return {
    ...block,
    sections: block.Section.map((section) => ({
  ...section,
      fields: section.Field.map(field => ({
        ...field,
        options: field.FieldOption, // Renommer FieldOption en options
      }))
    }))
  };
};
