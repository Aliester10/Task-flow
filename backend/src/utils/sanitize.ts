import sanitizeHtml from 'sanitize-html';

export const sanitizeText = (dirty: string): string => {
  if (!dirty) return dirty;
  return sanitizeHtml(dirty, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img' ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'width', 'height']
    }
  });
};
