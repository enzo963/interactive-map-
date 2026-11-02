import { Fragment } from 'react';

/** Renders **bold** segments of a translated message. Nothing else is interpreted. */
export default function Rich({ text }) {
  return text.split('**').map((part, index) =>
    index % 2 === 1 ? <strong key={index}>{part}</strong> : <Fragment key={index}>{part}</Fragment>,
  );
}
