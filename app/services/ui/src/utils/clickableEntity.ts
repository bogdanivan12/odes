export const clickableEntitySx = {
  display: 'inline-flex',
  alignItems: 'center',
  px: 0.75,
  py: 0.35,
  borderRadius: 1,
  cursor: 'pointer',
  color: 'text.primary',
  textDecoration: 'none',
  transition: 'background-color 0.15s ease',
  '&:hover': {
    backgroundColor: 'action.hover',
    textDecoration: 'none',
    color: 'text.primary',
  },
};

export const clickableSecondaryEntitySx = {
  ...clickableEntitySx,
  color: 'text.secondary',
  '&:hover': {
    backgroundColor: 'action.hover',
    textDecoration: 'none',
    color: 'text.secondary',
  },
};

